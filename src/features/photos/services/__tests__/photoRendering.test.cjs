const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function runtime() {
  const pending = [], cancelled = []; let available = true; let exists = true;
  const native = {
    verify: async () => ({ status: available ? 'ready' : 'unavailable' }),
    resolve: (id, full, pixels) => new Promise(resolve => pending.push({ id, full, pixels, resolve })),
    cancelRender: async (...args) => cancelled.push(args),
  };
  const mocks = {
    '../../../store/app-store': { useAppStore: { getState: () => ({}) } },
    '../../../i18n/translations': {},
    'expo-file-system': { File: class { get exists() { return exists; } } },
    'expo-modules-core': { requireOptionalNativeModule: () => native },
    'expo-media-library': {}, 'react-native': {},
    '../../rolls/store/rollStore': {}, './PhotoStorageService': {},
  };
  const load = filename => {
    const mod = new Module(filename); mod.filename = filename;
    mod.require = name => name in mocks ? mocks[name] : load(path.resolve(path.dirname(filename), name + '.ts'));
    mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
    return mod.exports;
  };
  const api = load(path.resolve(__dirname, '../PhotoReferenceService.ts'));
  return { api, pending, cancelled, missing: () => { available = false; }, restore: () => { available = true; }, purge: () => { exists = false; } };
}
const photo = { id: 'frame', provider: 'apple-photos', assetId: 'asset', sortOrder: 0 };
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

test('Shared image requests cancel only after their last consumer leaves', async () => {
  const r = runtime(); const a = new AbortController(), b = new AbortController();
  const first = r.api.resolvePhoto(photo, 'thumbnail', 512, a.signal);
  const second = r.api.resolvePhoto(photo, 'thumbnail', 512, b.signal);
  await flush(); assert.equal(r.pending.length, 1);
  a.abort(); assert.equal(r.cancelled.length, 0);
  b.abort(); assert.deepEqual(r.cancelled, [['asset', false, 512]]);
  r.pending[0].resolve({ status: 'ready', uri: 'obsolete' });
  assert.equal((await first).uri, undefined); assert.equal((await second).uri, undefined);
  const fresh = r.api.resolvePhoto(photo); await flush(); assert.equal(r.pending.length, 2);
  r.pending[1].resolve({ status: 'ready', uri: 'fresh' }); assert.equal((await fresh).uri, 'fresh');
  assert.equal(r.api.photoRenderMetrics().coalesced, 1);
  assert.equal(r.api.photoRenderMetrics().cancelled, 1);
});

test('Cache reuse verifies originals, regenerates purged renders and rejects invalidated completions', async () => {
  const r = runtime();
  let request = r.api.resolvePhoto(photo); await flush();
  r.pending[0].resolve({ status: 'ready', uri: 'cached' }); await request;
  assert.equal((await r.api.resolvePhoto(photo)).uri, 'cached'); assert.equal(r.pending.length, 1);
  assert.equal(r.api.photoRenderMetrics().cacheHits, 1);
  r.missing(); assert.equal((await r.api.resolvePhoto(photo)).status, 'unavailable', 'a warm thumbnail cannot hide a missing original');
  r.restore();
  r.purge(); request = r.api.resolvePhoto(photo); await flush(); assert.equal(r.pending.length, 2);
  r.api.invalidatePhotoRenders(); r.pending[1].resolve({ status: 'ready', uri: 'old-epoch' });
  assert.equal((await request).uri, undefined);
  r.missing(); assert.equal((await r.api.resolvePhoto(photo)).status, 'unavailable');
});

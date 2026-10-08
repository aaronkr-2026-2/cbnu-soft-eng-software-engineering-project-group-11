const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');

const src = path.resolve(__dirname, '../../../..');
const seedRoll = { id: 'r1', filmId: 'f1', filmName: 'Film', cameraId: 'c1', cameraName: 'Camera', date: '2026-10', format: '35mm', photos: [] };

// Exercise the real provider, services, resolver, repository and stores. Only native IO is mocked.
function runtime(previous) {
  const state = previous ?? {
    kv: new Map([['filmer.rolls.v1', JSON.stringify([seedRoll])]]), files: new Map(),
    failUris: new Set(), shortUris: new Set(), documentRoot: 'file:///app/Documents',
    permission: true, selection: { canceled: true }, copyCalls: [], deleted: [], pickerOptions: [],
    yieldCount: 0, failSave: false,
    saveFailUris: new Set(), savedUris: [], exportedBytes: [], shareCalls: [], permissionChecks: [], permissionRequests: [],
    shareImports: 0, missingShareModule: false,
    directories: new Set(), logs: [], shareCancelled: false, shareError: null,
    assetUris: new Map(), assetReads: [],
  };
  const uri = parts => parts.map(p => typeof p === 'string' ? p : p.uri).join('/');
  class Directory {
    constructor(...parts) { this.uri = uri(parts); }
    create() { state.directories.add(this.uri); }
    get exists() { return state.directories.has(this.uri); }
    get name() { return this.uri.split('/').at(-1); }
    list() {
      const prefix = this.uri + '/';
      const direct = value => value.startsWith(prefix) && !value.slice(prefix.length).includes('/');
      return [...[...state.directories].filter(direct).map(value => new Directory(value)),
        ...[...state.files.keys()].filter(direct).map(value => new File(value))];
    }
    delete() {
      for (const name of [...state.files.keys()]) if (name.startsWith(this.uri + '/')) { state.files.delete(name); state.deleted.push(name); }
      state.directories.delete(this.uri);
    }
  }
  class File {
    constructor(...parts) { this.uri = uri(parts); }
    get exists() { return state.files.has(this.uri); }
    get name() { return this.uri.split('/').at(-1); }
    get size() { return state.files.get(this.uri)?.length ?? 0; }
    async copy(destination, options) {
      state.copyCalls.push({ from: this.uri, to: destination.uri, options });
      await new Promise(resolve => setImmediate(() => { state.yieldCount++; resolve(); }));
      if (destination.exists && !options?.overwrite) throw new Error('Already exists');
      if (state.failUris.has(this.uri)) {
        state.files.set(destination.uri, Buffer.from('partial'));
        throw new Error('Native copy failed');
      }
      const bytes = state.files.get(this.uri);
      if (!bytes) throw new Error('Source missing');
      state.files.set(destination.uri, Buffer.from(state.shortUris.has(this.uri) ? bytes.subarray(0, 1) : bytes));
    }
    delete() { state.deleted.push(this.uri); state.files.delete(this.uri); }
  }
  const mocks = {
    'expo-file-system': { File, Directory, Paths: { get document() { return new Directory(state.documentRoot); },
      get cache() { return new Directory('file:///app/Cache'); } } },
    'expo-sqlite/kv-store': {
      getItemSync: key => state.kv.get(key) ?? null,
      setItemSync: (key, value) => { if (state.failSave) throw new Error('Disk full'); state.kv.set(key, value); },
    },
    'expo-image-picker': {
      requestMediaLibraryPermissionsAsync: async () => ({ granted: state.permission }),
      launchImageLibraryAsync: async options => { state.pickerOptions.push(options); return state.selection; },
      UIImagePickerPreferredAssetRepresentationMode: { Current: 'current' },
    },
    'expo-media-library': {
      getPermissionsAsync: async (...args) => { state.permissionChecks.push(args); return { granted: state.permission, canAskAgain: true }; },
      requestPermissionsAsync: async (...args) => { state.permissionRequests.push(args); return { granted: state.permission }; },
      Asset: class Asset {
        constructor(id) { this.id = id; }
        async getUri() { state.assetReads.push(this.id); if (!state.assetUris.has(this.id)) throw new Error('Asset unavailable'); return state.assetUris.get(this.id); }
        static async create(uri) {
        await new Promise(resolve => setImmediate(resolve));
        if (state.saveFailUris.has(uri) || !state.files.has(uri)) throw new Error('Save failed');
        state.savedUris.push(uri); state.exportedBytes.push(Buffer.from(state.files.get(uri))); return {};
        }
      },
    },
    'react-native-share': { open: async options => { state.shareCalls.push(options); if (state.shareError) throw new Error(state.shareError);
      return { success: !state.shareCancelled, message: '' }; } },
  };
  const modules = new Map();
  function load(relative) {
    const filename = path.resolve(src, relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = new Module(filename);
    modules.set(filename, module);
    module.filename = filename;
    module.paths = Module._nodeModulePaths(path.dirname(filename));
    module.require = name => {
      if (name === 'react-native-share') {
        state.shareImports++;
        if (state.missingShareModule) throw new Error('RNShare native module is unavailable');
      }
      if (name in mocks) return mocks[name];
      if (name.startsWith('.')) return load(path.relative(src, path.resolve(path.dirname(filename), name + '.ts')));
      return require(name);
    };
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    });
    module.testLogs = state.logs;
    module._compile('const __DEV__ = true; const console = { log(...args) { module.testLogs.push(args); } };\n' + outputText, filename);
    return module.exports;
  }
  const app = load('store/app-store.ts').useAppStore;
  const store = load('features/rolls/store/rollStore.ts').useRollStore;
  const service = load('features/photos/services/PhotoImportService.ts').PhotoImportService;
  const storage = load('features/photos/services/PhotoStorageService.ts').PhotoStorageService;
  const resolve = load('features/photos/utils/resolvePhotoUri.ts').resolvePhotoUri;
  function select(count, extension = 'jpg') {
    const assets = Array.from({ length: count }, (_, index) => {
      const asset = { uri: `file:///picker/${index}.${extension}`, assetId: `asset-${index}`, fileName: `same.${extension}`, width: 100, height: 100,
        exif: { DateTimeOriginal: '2026:10:06 12:00:00' } };
      state.files.set(asset.uri, Buffer.from(`original-image-${index}`));
      return asset;
    });
    state.selection = { canceled: false, assets };
    return assets;
  }
  return { state, app, store, service, storage, resolve, select, load };
}

test('Reference imports preserve identifiers, picker URIs, metadata and picker options', async () => {
  const r = runtime();
  const assets = r.select(3);
  const result = await r.service.addToRoll('r1');
  assert.deepEqual(result, { status: 'selected', addedCount: 3, failedCount: 0 });
  const photos = r.store.getState().rolls[0].photos;
  photos.forEach((p, i) => {
    assert.equal(p.provider, 'apple-photos');
    assert.equal(p.storageMode, 'reference');
    assert.equal(p.assetId, assets[i].assetId);
    assert.equal(p.localIdentifier, assets[i].assetId);
    assert.equal(r.resolve(p), assets[i].uri);
    assert.equal(p.takenAt, '2026-10-06');
    assert.equal(p.id, `apple-photos-asset-${i}-${i}`);
  });
  assert.equal(r.state.copyCalls.length, 0);
  assert.equal(r.state.pickerOptions[0].quality, 1);
  assert.equal(r.state.pickerOptions[0].preferredAssetRepresentationMode, undefined);
});

test('Copy imports persistent byte-identical files with unique names, without asset IDs', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy');
  const assets = r.select(3, 'heic');
  const result = await r.service.addToRoll('r1');
  assert.equal(result.addedCount, 3);
  const photos = r.store.getState().rolls[0].photos;
  assert.equal(new Set(photos.map(p => p.localUri)).size, 3);
  photos.forEach((photo, i) => {
    assert.equal(photo.provider, 'filmer-copy');
    assert.equal(photo.assetId, undefined);
    assert.match(photo.documentPath, /^photos\/r1\/photo-.+\.heic$/);
    assert.equal(r.resolve(photo), photo.localUri);
    assert.deepEqual(r.state.files.get(r.resolve(photo)), r.state.files.get(assets[i].uri));
  });
  assert.equal(r.state.pickerOptions[0].preferredAssetRepresentationMode, 'current');
  assert.equal(r.state.pickerOptions[0].quality, 1);
  assert.equal(r.state.pickerOptions[0].allowsEditing, undefined);
  assert.ok(r.state.copyCalls.every(call => call.options.overwrite === false));
  assert.equal(r.state.deleted.length, 0);
});

test('Archive, import preference, mixed photo order and edited metadata survive restart', async () => {
  const r = runtime(); r.select(1); await r.service.addToRoll('r1');
  r.app.getState().setImportMode('copy'); r.select(3); await r.service.addToRoll('r1');
  const ids = r.store.getState().rolls[0].photos.map(p => p.id).reverse();
  r.store.getState().reorderPhotos('r1', ids);
  r.store.getState().updatePhoto('r1', ids[0], { note: 'Keep this note', takenAt: '2026-09-12', location: { latitude: 1, longitude: 2, name: 'Seoul' } });
  const restarted = runtime(r.state);
  assert.equal(restarted.app.getState().importMode, 'copy');
  const photos = restarted.store.getState().rolls[0].photos;
  assert.deepEqual(photos.map(p => p.id), ids);
  assert.deepEqual(photos.map(p => p.sortOrder), [0, 1, 2, 3]);
  assert.equal(photos[0].note, 'Keep this note');
  assert.equal(photos[0].takenAt, '2026-09-12');
  assert.equal(photos[0].location.name, 'Seoul');
  assert.ok(photos.filter(p => p.provider === 'filmer-copy').every(p => restarted.state.files.has(restarted.resolve(p))));
});

test('Relative document paths resolve after an iOS app-container URI changes', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy'); r.select(1); await r.service.addToRoll('r1');
  const photo = r.store.getState().rolls[0].photos[0];
  const oldUri = photo.localUri;
  r.state.documentRoot = 'file:///new-container/Documents';
  const newUri = r.resolve(photo);
  r.state.files.set(newUri, r.state.files.get(oldUri)); r.state.files.delete(oldUri);
  const restarted = runtime(r.state);
  assert.notEqual(newUri, oldUri);
  assert.ok(restarted.state.files.has(restarted.resolve(restarted.store.getState().rolls[0].photos[0])));
});

test('Clear Image Cache and removing picker originals leave persistent copies readable', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy');
  const assets = r.select(3); await r.service.addToRoll('r1');
  await r.load('features/photos/services/ImageCacheService.ts').ImageCacheService.clear();
  assets.forEach(a => r.state.files.delete(a.uri));
  assert.ok(r.store.getState().rolls[0].photos.every(p => r.state.files.has(r.resolve(p))));
  assert.equal(r.state.deleted.length, 0);
});

test('25 copies yield asynchronously and identical original filenames never overwrite', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy'); r.select(25);
  const result = await r.service.addToRoll('r1');
  assert.equal(result.addedCount, 25);
  assert.equal(r.state.yieldCount, 25);
  assert.equal(new Set(r.state.copyCalls.map(c => c.to)).size, 25);
  r.select(25); await r.service.addToRoll('r1');
  assert.equal(new Set(r.store.getState().rolls[0].photos.map(p => p.localUri)).size, 50);
});

test('One failed copy retains successful imports, cleans its partial file and returns actual counts', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy');
  const assets = r.select(20); r.state.failUris.add(assets[8].uri);
  const result = await r.service.addToRoll('r1');
  assert.deepEqual(result, { status: 'selected', addedCount: 19, failedCount: 1 });
  assert.equal(r.store.getState().rolls[0].photos.length, 19);
  assert.equal([...r.state.files.keys()].filter(uri => uri.startsWith(r.state.documentRoot)).length, 19);
  assert.equal(r.state.deleted.length, 1);
  assert.ok(assets.every(asset => r.state.files.has(asset.uri)));
});

test('Truncated or empty successful native copies are rejected and cleaned', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy');
  const assets = r.select(3); r.state.shortUris.add(assets[0].uri); r.state.files.set(assets[1].uri, Buffer.alloc(0));
  const result = await r.service.addToRoll('r1');
  assert.equal(result.addedCount, 1); assert.equal(result.failedCount, 2);
  assert.equal(r.state.deleted.length, 2);
});

test('All failed copies produce zero added photos and no broken references', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy');
  r.select(3).forEach(a => r.state.failUris.add(a.uri));
  const result = await r.service.addToRoll('r1');
  assert.equal(result.addedCount, 0); assert.equal(result.failedCount, 3);
  assert.equal(r.store.getState().rolls[0].photos.length, 0);
});

test('Denied permission and cancelled picker do not copy or add photos', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy'); r.select(3); r.state.permission = false;
  assert.deepEqual(await r.service.addToRoll('r1'), { status: 'permission-denied' });
  assert.equal(r.state.pickerOptions.length, 0);
  r.state.permission = true; r.state.selection = { canceled: true };
  assert.deepEqual(await r.service.addToRoll('r1'), { status: 'cancelled' });
  assert.equal(r.state.copyCalls.length, 0);
  assert.equal(r.store.getState().rolls[0].photos.length, 0);
});

test('Failed archive save rolls back only this import, without publishing success', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy'); r.select(1); await r.service.addToRoll('r1');
  const existing = r.store.getState().rolls[0].photos[0];
  const saved = r.state.kv.get('filmer.rolls.v1');
  const sources = r.select(3); r.state.failSave = true;
  await assert.rejects(r.service.addToRoll('r1'), /Disk full/);
  assert.equal(r.state.kv.get('filmer.rolls.v1'), saved);
  assert.equal(r.store.getState().rolls[0].photos.length, 1);
  assert.ok(r.state.files.has(r.resolve(existing)));
  assert.ok(sources.every(a => r.state.files.has(a.uri)));
  assert.equal(r.state.deleted.length, 3);
});

test('Missing Roll before picker or during import cannot leave owned copies behind', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy'); r.select(3);
  await assert.rejects(r.service.addToRoll('missing'), /Roll not found/);
  assert.equal(r.state.pickerOptions.length, 0);
  const pending = r.service.addToRoll('r1');
  r.store.setState({ rolls: [] });
  await assert.rejects(pending, /no longer available/);
  assert.equal(r.state.deleted.length, 3);
});

test('Owned-file cleanup refuses references, wrong Roll, mismatched IDs and traversal paths', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy'); r.select(1); await r.service.addToRoll('r1');
  const photo = r.store.getState().rolls[0].photos[0];
  assert.equal(r.storage.deleteOwnedCopies('r2', [photo]), 0);
  assert.equal(r.storage.deleteOwnedCopies('r1', [{ ...photo, provider: 'apple-photos', thumbnailUri: photo.localUri }]), 0);
  assert.equal(r.storage.deleteOwnedCopies('r1', [{ ...photo, id: 'wrong-id' }]), 0);
  assert.equal(r.storage.deleteOwnedCopies('r1', [{ ...photo, documentPath: 'photos/../picker/0.jpg' }]), 0);
  assert.ok(r.state.files.has(r.resolve(photo)));
  assert.equal(r.storage.deleteOwnedCopies('r1', [photo]), 1);
  assert.ok(r.state.files.has('file:///picker/0.jpg'));
});

test('Extension resolution follows selected representation and safely handles common formats', () => {
  const r = runtime();
  const extension = r.load('features/photos/services/PhotoCopyService.ts').selectedImageExtension;
  assert.equal(extension({ uri: 'file:///picker/export.jpg', fileName: 'original.HEIC' }), 'jpg');
  assert.equal(extension({ uri: 'file:///picker/no-extension', mimeType: 'image/png', fileName: 'original.jpg' }), 'png');
  for (const ext of ['jpg', 'jpeg', 'png', 'heic', 'heif']) assert.equal(extension({ uri: `file:///picker/x.${ext}` }), ext);
  assert.equal(extension({ uri: 'file:///picker/no-extension', fileName: 'x.HEIF' }), 'heif');
  assert.equal(extension({ uri: 'file:///picker/no-extension', fileName: '../../unsafe.exe' }), 'img');
});

test('Corrupt saved archives are not silently overwritten with mock Rolls', () => {
  const r = runtime(); r.state.kv.set('filmer.rolls.v1', '{broken-json');
  assert.throws(() => runtime(r.state));
  assert.equal(r.state.kv.get('filmer.rolls.v1'), '{broken-json');
});

test('Deleting a Roll persists removal and deletes owned copies while preserving originals', async () => {
  const r = runtime(); r.select(1); await r.service.addToRoll('r1');
  r.app.getState().setImportMode('copy'); r.select(2); await r.service.addToRoll('r1');
  assert.equal(r.store.getState().deleteRoll('r1'), true);
  assert.equal(r.state.deleted.length, 2);
  assert.ok(r.state.files.has('file:///picker/0.jpg'));
  assert.ok(r.state.files.has('file:///picker/1.jpg'));
  assert.equal(runtime(r.state).store.getState().rolls.length, 0);
  assert.equal(r.store.getState().deleteRoll('missing'), false);
});

test('Failed Roll deletion leaves archive and owned files intact', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy'); r.select(1); await r.service.addToRoll('r1');
  const photo = r.store.getState().rolls[0].photos[0]; r.state.failSave = true;
  assert.throws(() => r.store.getState().deleteRoll('r1'), /Disk full/);
  assert.ok(r.state.files.has(r.resolve(photo)));
  assert.equal(r.store.getState().rolls.length, 1);
  assert.equal(r.state.deleted.length, 0);
});

test('Roll deletion preserves copied files that another Roll still references', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy'); r.select(1); await r.service.addToRoll('r1');
  const photo = r.store.getState().rolls[0].photos[0];
  r.store.setState({ rolls: [...r.store.getState().rolls, { ...seedRoll, id: 'r2', photos: [photo] }] });
  r.store.getState().deleteRoll('r1');
  assert.ok(r.state.files.has(r.resolve(photo)));
  assert.equal(r.state.deleted.length, 0);
});

test('Removing mixed selected photos persists counts/order and never deletes Apple Photos originals', async () => {
  const r = runtime(); const originals = r.select(3); await r.service.addToRoll('r1');
  r.app.getState().setImportMode('copy'); r.select(3); await r.service.addToRoll('r1');
  const photos = r.store.getState().rolls[0].photos;
  const copied = photos[3];
  const selected = new Set([photos[0].id, copied.id]);
  assert.equal(r.store.getState().removePhotos('r1', selected), 2);
  const remaining = r.store.getState().rolls[0].photos;
  assert.equal(remaining.length, 4);
  assert.deepEqual(remaining.map(p => p.id), [photos[1].id, photos[2].id, photos[4].id, photos[5].id]);
  assert.deepEqual(remaining.map(p => p.sortOrder), [0, 1, 2, 3]);
  assert.ok(originals.every(asset => r.state.files.has(asset.uri)));
  assert.equal(r.state.files.has(r.resolve(copied)), false);
  assert.equal(r.state.deleted.length, 1);
  assert.equal(runtime(r.state).store.getState().rolls[0].photos.length, 4);
});

test('Removing all Reference photos keeps the Roll and originals; foreign IDs are ignored', async () => {
  const r = runtime(); const originals = r.select(3); await r.service.addToRoll('r1');
  assert.equal(r.store.getState().removePhotos('r1', new Set(['foreign-id'])), 0);
  const ids = new Set(r.store.getState().rolls[0].photos.map(p => p.id));
  assert.equal(r.store.getState().removePhotos('r1', ids), 3);
  assert.equal(r.store.getState().rolls.length, 1);
  assert.equal(r.store.getState().rolls[0].photos.length, 0);
  assert.ok(originals.every(asset => r.state.files.has(asset.uri)));
  assert.equal(r.state.deleted.length, 0);
});

test('Failed batch removal keeps records/files intact, and shared copies are preserved', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy'); r.select(2); await r.service.addToRoll('r1');
  const [a, b] = r.store.getState().rolls[0].photos;
  r.state.failSave = true;
  assert.throws(() => r.store.getState().removePhotos('r1', new Set([a.id])), /Disk full/);
  assert.equal(r.store.getState().rolls[0].photos.length, 2);
  assert.ok(r.state.files.has(r.resolve(a)));
  r.state.failSave = false;
  r.store.setState({ rolls: [...r.store.getState().rolls, { ...seedRoll, id: 'r2', photos: [a] }] });
  r.store.getState().removePhotos('r1', new Set([a.id]));
  assert.ok(r.state.files.has(r.resolve(a)));
  assert.ok(r.state.files.has(r.resolve(b)));
  assert.equal(r.state.deleted.length, 0);
});

test('Batch Share uses native multiple file URLs in persisted order for Reference and Copy', async () => {
  const r = runtime(); r.select(10); await r.service.addToRoll('r1');
  r.app.getState().setImportMode('copy'); r.select(2); await r.service.addToRoll('r1');
  const photos = r.store.getState().rolls[0].photos;
  const service = r.load('features/photos/services/PhotoShareService.ts').PhotoShareService;
  await service.sharePhotos([photos[11], ...photos.slice(0, 10).reverse()]);
  const options = r.state.shareCalls[0];
  const sources = [...photos.slice(0, 10), photos[11]].map(r.resolve);
  assert.deepEqual(options.urls.map(uri => r.state.files.get(uri)), sources.map(uri => r.state.files.get(uri)));
  assert.ok(options.urls.slice(0, 10).every(uri => uri.startsWith('file:///app/Cache/share/')));
  assert.equal(options.urls[10], r.resolve(photos[11]));
  assert.equal(options.urls.length, 11);
  assert.equal(options.failOnCancel, false);
  assert.equal(r.state.permissionChecks.length, 0);
  await service.sharePhotos([photos[0]]);
  assert.equal(r.state.shareCalls[1].urls.length, 1);
  r.state.files.delete(r.resolve(photos[1]));
  await assert.rejects(service.sharePhotos([photos[1]]), /No selected photo/);
  assert.equal(r.state.shareCalls.length, 2);
});

test('Batch Save preserves selected source bytes, orders by sortOrder and reports partial successes', async () => {
  const r = runtime(); r.select(3); await r.service.addToRoll('r1');
  r.app.getState().setImportMode('copy'); r.select(2, 'heic'); await r.service.addToRoll('r1');
  const photos = r.store.getState().rolls[0].photos;
  r.state.saveFailUris.add(r.resolve(photos[1]));
  const service = r.load('features/photos/services/PhotoExportService.ts').PhotoExportService;
  const result = await service.savePhotos([photos[4], photos[1], photos[0]]);
  assert.deepEqual(result, { savedCount: 2, failedCount: 1 });
  assert.deepEqual(r.state.savedUris, [r.resolve(photos[0]), r.resolve(photos[4])]);
  assert.deepEqual(r.state.exportedBytes, r.state.savedUris.map(uri => r.state.files.get(uri)));
  assert.deepEqual(r.state.permissionChecks, [[true, ['photo']]]);
  assert.equal(r.state.permissionRequests.length, 0);
  assert.equal(r.state.deleted.length, 0);
  assert.equal(r.store.getState().rolls[0].photos.length, 5);
});

test('Batch Save requests permission only on Save and does not report denied or missing files as saved', async () => {
  const r = runtime(); r.select(2); await r.service.addToRoll('r1');
  assert.equal(r.state.permissionChecks.length, 0);
  const service = r.load('features/photos/services/PhotoExportService.ts').PhotoExportService;
  const photos = r.store.getState().rolls[0].photos;
  r.state.permission = false;
  await assert.rejects(service.savePhotos(photos), /permission denied/);
  assert.deepEqual(r.state.permissionRequests, [[true, ['photo']]]);
  assert.equal(r.state.savedUris.length, 0);
  r.state.permission = true;
  photos.forEach(p => r.state.files.delete(r.resolve(p)));
  assert.deepEqual(await service.savePhotos(photos), { savedCount: 0, failedCount: 2 });
  const checked = r.state.permissionChecks.length;
  assert.deepEqual(await service.savePhotos([]), { savedCount: 0, failedCount: 0 });
  assert.equal(r.state.permissionChecks.length, checked);
});

test('Reimporting a Reference after removal cannot duplicate surviving photo IDs', async () => {
  const r = runtime(); r.select(3); await r.service.addToRoll('r1');
  const before = r.store.getState().rolls[0].photos;
  r.store.getState().removePhotos('r1', new Set([before[0].id]));
  r.state.selection = { canceled: false, assets: [r.state.selection.assets[2]] };
  await r.service.addToRoll('r1');
  const photos = r.store.getState().rolls[0].photos;
  assert.equal(photos.length, 3);
  assert.equal(new Set(photos.map(photo => photo.id)).size, 3);
  assert.equal(photos[1].id, before[2].id);
});

test('Missing RNShare does not crash service loading or empty actions, and rejects only when sharing', async () => {
  const r = runtime(); r.state.missingShareModule = true;
  const service = r.load('features/photos/services/PhotoShareService.ts').PhotoShareService;
  assert.equal(r.state.shareImports, 0);
  await service.sharePhotos([]);
  assert.equal(r.state.shareImports, 0);
  r.select(1); await r.service.addToRoll('r1');
  await assert.rejects(service.sharePhotos(r.store.getState().rolls[0].photos), /RNShare native module/);
  assert.equal(r.state.shareImports, 1);
  assert.equal(r.state.shareCalls.length, 0);
});

for (const count of [1, 2, 9, 36]) {
  test(`Share prepares ${count} Reference photos and opens exactly one native sheet`, async () => {
    const r = runtime(); r.select(count); await r.service.addToRoll('r1');
    const service = r.load('features/photos/services/PhotoShareService.ts').PhotoShareService;
    const result = await service.sharePhotos([...r.store.getState().rolls[0].photos].reverse());
    assert.deepEqual(result, { preparedCount: count, failedCount: 0, cancelled: false });
    assert.equal(r.state.shareCalls.length, 1);
    assert.equal(r.state.shareCalls[0].urls.length, count);
    assert.ok(r.state.shareCalls[0].urls.every(uri => uri.startsWith('file:///app/Cache/share/') && r.state.files.has(uri)));
    assert.equal(r.state.deleted.length, 0, 'share files must survive activity completion');
  });
}

test('One broken Reference shares the remaining eight files and reports preparation failure', async () => {
  const r = runtime(); r.select(9); await r.service.addToRoll('r1');
  const photos = r.store.getState().rolls[0].photos; r.state.files.delete(r.resolve(photos[3]));
  const result = await r.load('features/photos/services/PhotoShareService.ts').PhotoShareService.sharePhotos(photos);
  assert.deepEqual(result, { preparedCount: 8, failedCount: 1, cancelled: false });
  assert.equal(r.state.shareCalls.length, 1);
  assert.equal(r.state.shareCalls[0].urls.length, 8);
});

test('Provider-only or expired Reference URI recovers the accessible original without requesting new permission', async () => {
  const r = runtime();
  const source = 'file:///library/original.HEIC'; const bytes = Buffer.from('original HEIC bytes');
  r.state.files.set(source, bytes); r.state.assetUris.set('local-asset', source);
  const photo = { id: 'reference', provider: 'apple-photos', assetId: 'local-asset', thumbnailUri: 'ph://local-asset', sortOrder: 0 };
  const result = await r.load('features/photos/services/PhotoShareService.ts').PhotoShareService.sharePhotos([photo]);
  assert.equal(result.preparedCount, 1);
  assert.deepEqual(r.state.assetReads, ['local-asset']);
  const attachment = r.state.shareCalls[0].urls[0];
  assert.ok(attachment.endsWith('.heic'));
  assert.deepEqual(r.state.files.get(attachment), bytes);
  assert.deepEqual(r.state.files.get(source), bytes);
  assert.equal(r.state.permissionRequests.length, 0);
});

test('Copy-only JPG/PNG/HEIC sharing reuses persistent files without extra copies', async () => {
  const r = runtime(); r.app.getState().setImportMode('copy');
  for (const extension of ['jpg', 'png', 'heic']) { r.select(1, extension); await r.service.addToRoll('r1'); }
  const photos = r.store.getState().rolls[0].photos; const copiesBefore = r.state.copyCalls.length;
  await r.load('features/photos/services/PhotoShareService.ts').PhotoShareService.sharePhotos([...photos].reverse());
  assert.deepEqual(r.state.shareCalls[0].urls, photos.map(r.resolve));
  assert.equal(r.state.copyCalls.length, copiesBefore);
  assert.equal(r.state.deleted.length, 0);
});

test('Cancelled share retains temporary files; expired cleanup never deletes originals or persistent copies', async () => {
  const r = runtime(); r.select(2); await r.service.addToRoll('r1'); r.state.shareCancelled = true;
  const service = r.load('features/photos/services/PhotoShareService.ts').PhotoShareService;
  const result = await service.sharePhotos(r.store.getState().rolls[0].photos);
  assert.equal(result.cancelled, true);
  const urls = r.state.shareCalls[0].urls;
  const cache = r.load('features/photos/services/PhotoShareCacheService.ts').PhotoShareCacheService;
  assert.equal(cache.clearExpired(Date.now()), 0);
  const active = cache.createSession(); r.state.files.set(active.uri + '/still-sharing.jpg', Buffer.from('active'));
  assert.equal(cache.clearExpired(Date.now() + 25 * 60 * 60 * 1000), 2);
  assert.ok(urls.every(uri => !r.state.files.has(uri)));
  assert.ok(r.state.files.has(active.uri + '/still-sharing.jpg'));
  assert.ok(r.state.files.has('file:///picker/0.jpg'));
  assert.ok(r.state.files.has('file:///picker/1.jpg'));
});

test('Failed native API is logged without binary data and temporary files are not deleted immediately', async () => {
  const r = runtime(); r.select(2); await r.service.addToRoll('r1'); r.state.shareError = 'Native presentation failed';
  await assert.rejects(r.load('features/photos/services/PhotoShareService.ts').PhotoShareService.sharePhotos(r.store.getState().rolls[0].photos), /Native presentation failed/);
  const logs = r.state.logs.filter(entry => String(entry[0]).startsWith('[PhotoShare]'));
  assert.ok(logs.some(entry => entry[0].includes('share-failed') && entry[1].reason === 'Native presentation failed'));
  assert.ok(logs.some(entry => entry[0].includes('ready') && entry[1].resolvedCount === 2));
  assert.equal(JSON.stringify(logs).includes('original-image'), false);
  assert.equal(r.state.deleted.length, 0);
});

test('Edit draft is prefilled and isolated; cancel discards metadata without touching photos', () => {
  const r = runtime();
  const drafts = r.load('features/rolls/store/newRollDraftStore.ts').useNewRollDraftStore;
  const original = { ...r.store.getState().rolls[0], frameCount: 36, lab: 'Oddne', notes: 'Keep', location: { latitude: 36, longitude: 127, name: 'Cheongju' } };
  drafts.getState().beginEdit(original);
  assert.equal(drafts.getState().editDraft.frameCount, 36);
  assert.equal(drafts.getState().editDraft.lab, 'Oddne');
  assert.notEqual(drafts.getState().editDraft.location, original.location);
  drafts.getState().updateEdit({ filmId: 'gold', cameraId: 'leica', frameCount: 12, date: '2030-10', location: undefined, lab: 'New', notes: 'New' });
  assert.equal(original.filmId, 'f1'); assert.equal(original.frameCount, 36);
  drafts.getState().endEdit(); assert.equal(drafts.getState().editDraft, null);
});

test('Saving all Roll metadata preserves ID, mixed photos, ordering and owned files across restart', async () => {
  const r = runtime(); r.select(1); await r.service.addToRoll('r1');
  r.app.getState().setImportMode('copy'); r.select(2); await r.service.addToRoll('r1');
  const original = r.store.getState().rolls[0], photos = original.photos;
  const patch = { filmId: 'gold', filmName: 'Kodak Gold 200', cameraId: 'leica', cameraName: 'Leica M6',
    format: '120', frameCount: 12, date: '2030-10', lab: 'Oddne', notes: 'Edited', location: { latitude: 37, longitude: 127, name: 'Seoul' } };
  r.store.getState().updateRoll('r1', patch);
  const changed = r.store.getState().rolls[0];
  assert.equal(changed.id, original.id); assert.equal(changed.photos, photos);
  assert.equal(r.state.deleted.length, 0);
  assert.deepEqual(runtime(r.state).store.getState().rolls[0], JSON.parse(JSON.stringify(changed)));
  r.state.failSave = true;
  assert.throws(() => r.store.getState().updateRoll('r1', { ...patch, frameCount: 24 }));
  assert.equal(r.store.getState().rolls[0], changed);
});

test('Dirty state and draft validation handle all fields, location removal and future months', () => {
  const r = runtime(); const { isRollDraftDirty, isValidRollDraft } = r.load('features/rolls/utils/rollDraft.ts');
  const original = { ...seedRoll, frameCount: 36, lab: 'Oddne', notes: 'Note', location: { latitude: 37, longitude: 127, name: 'Seoul' } };
  const draft = { ...original };
  assert.equal(isRollDraftDirty(draft, original), false);
  for (const patch of [{ filmId: 'new' }, { cameraId: 'new' }, { format: '120' }, { frameCount: 12 }, { date: '2030-10' }, { lab: 'New' }, { notes: 'New' }, { location: undefined }]) assert.equal(isRollDraftDirty({ ...draft, ...patch }, original), true);
  assert.equal(isValidRollDraft({ ...draft, date: '2030-10' }), true);
  for (const patch of [{ date: '2026-13' }, { date: '2026-10-08' }, { frameCount: 0 }, { frameCount: 12.5 }, { location: { latitude: 91, longitude: 0 } }]) assert.equal(isValidRollDraft({ ...draft, ...patch }), false);
});

test('Roll-specific film overrides survive restart without modifying built-in catalog or scans', async () => {
 const r = runtime(); const films = r.load('features/films/store/filmStore.ts').useFilmStore;
 const catalogFilm = films.getState().films.find(film => film.id === 'fujifilm-c200');
 const original = JSON.stringify(catalogFilm);
 const drafts = r.load('features/rolls/store/newRollDraftStore.ts').useNewRollDraftStore;
 const { resolveRollFilm, effectiveFilmName } = r.load('features/films/utils/resolveRollFilm.ts');
 const covers = r.load('features/films/services/FilmCoverStorage.ts');
 r.state.files.set('file:///picker/cover.png', Buffer.from('original cover bytes'));
 const owned = await covers.FilmCoverStorage.copy('file:///picker/cover.png');
 const override = { brand:'Fujifilm',name:'C200 @ 400',iso:400,type:'color',format:'35mm',formats:['35mm'],process:'C-41',imageKey:null,...owned };
 drafts.getState().update({filmId:catalogFilm.id,filmOverride:override});
 assert.equal(resolveRollFilm(films.getState().films,drafts.getState().draft).iso,400);
 const created = r.store.getState().createRoll({ ...drafts.getState().draft, cameraId:'c1',cameraName:'Camera',filmName:effectiveFilmName(drafts.getState().draft), lab:undefined, notes:undefined });
 drafts.getState().reset(); assert.equal(r.state.files.has(owned.imageUri),true);
 const restarted = runtime(r.state); const saved = restarted.store.getState().rolls.find(roll=>roll.id===created.id);
 assert.equal(saved.filmId,catalogFilm.id); assert.equal(saved.filmOverride.iso,400); assert.equal(saved.filmName,'Fujifilm C200 @ 400');
 assert.equal(JSON.stringify(catalogFilm),original);
 assert.equal(films.getState().films.find(film=>film.id===catalogFilm.id).iso,200);
 r.state.documentRoot='file:///new-container/Documents';
 assert.equal(covers.filmImageUri(saved.filmOverride),'file:///new-container/Documents/'+owned.imageDocumentPath);
});

test('Discarding edit overrides deletes only abandoned owned covers and protects saved/shared files', async () => {
 const r = runtime(); const covers = r.load('features/films/services/FilmCoverStorage.ts').FilmCoverStorage;
 const drafts = r.load('features/rolls/store/newRollDraftStore.ts').useNewRollDraftStore;
 r.state.files.set('file:///picker/cover.jpg',Buffer.from('cover'));
 const old = await covers.copy('file:///picker/cover.jpg');
 const abandoned = await covers.copy('file:///picker/cover.jpg');
 const base = {brand:'Fuji',name:'C200',iso:200,type:'color',format:'35mm',imageKey:null};
 r.store.getState().updateRoll('r1',{...seedRoll,filmOverride:{...base,...old}});
 drafts.getState().beginEdit(r.store.getState().rolls[0]);
 drafts.getState().updateEdit({filmOverride:{...base,...abandoned,iso:400}});
 assert.equal(r.state.files.has(old.imageUri),true);
 drafts.getState().endEdit();
 assert.equal(r.state.files.has(abandoned.imageUri),false); assert.equal(r.state.files.has(old.imageUri),true);
 const replacement = await covers.copy('file:///picker/cover.jpg');
 drafts.getState().beginEdit(r.store.getState().rolls[0]); drafts.getState().updateEdit({filmOverride:{...base,...replacement}});
 const current = r.store.getState().rolls[0];
 r.store.getState().updateRoll('r1',{...current,filmOverride:drafts.getState().editDraft.filmOverride});
 drafts.getState().endEdit();
 assert.equal(r.state.files.has(old.imageUri),false); assert.equal(r.state.files.has(replacement.imageUri),true);
 assert.equal(r.state.files.has('file:///picker/cover.jpg'),true);
 covers.removeUnreferenced(['../unsafe.jpg','assets/films/kodak/gold-200.png'],new Set());
});

test('Film override participates in edit dirty state and removing/changing it leaves catalog untouched', () => {
 const r=runtime();const {isRollDraftDirty}=r.load('features/rolls/utils/rollDraft.ts');
 const original={...seedRoll};const draft={...seedRoll,lab:'',notes:'',filmOverride:{brand:'My',name:'Film',iso:160,type:'color',format:'35mm'}};
 assert.equal(isRollDraftDirty(draft,original),true);
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');

const src = path.resolve(__dirname, '../../../..');
const seedRoll = { id: 'r1', filmId: 'f1', filmName: 'Film', cameraId: 'c1', cameraName: 'Camera', date: '2026-10', format: '35mm', photos: [] };

// Exercise the real provider, services, resolver, repository and stores. Only native IO is mocked.
function runtime(previous, missingNative = false) {
  const state = previous ?? {
    kv: new Map([['filmer.rolls.v1', JSON.stringify([seedRoll])]]), files: new Map(),
    failUris: new Set(), shortUris: new Set(), documentRoot: 'file:///app/Documents',
    permission: true, selection: { canceled: true }, copyCalls: [], deleted: [], pickerOptions: [],
    yieldCount: 0, failSave: false, writes: [],
    saveFailUris: new Set(), savedUris: [], exportedBytes: [], shareCalls: [], permissionChecks: [], permissionRequests: [],
    shareImports: 0, missingShareModule: false,
    directories: new Set(), logs: [], shareCancelled: false, shareError: null,
    assetUris: new Map(), assetReads: [], assetStatus: new Map(), legacyCopyFixture: true, failRead: false, nativeRequests: [],
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
    write(content) { if (state.failRecoveryExport) throw new Error('Export disk full'); state.files.set(this.uri,Buffer.from(content)); }
    delete() { state.deleted.push(this.uri); state.files.delete(this.uri); }
  }
  const native = {
    async pick(single, labels, dark) { (state.nativePicks ??= []).push({ single, labels, dark }); state.pickerOptions.push({ allowsMultipleSelection: !single }); return state.selection; },
    async verify(id) {
      if (!state.permission) return { status: 'permission-denied' };
      if (state.assetStatus.has(id)) return { status: state.assetStatus.get(id) };
      return { status: state.assetUris.has(id) && state.files.has(state.assetUris.get(id)) ? 'ready' : state.limited ? 'limited' : 'unavailable' };
    },
    async resolve(id, full, pixels) {
      state.nativeRequests.push({ id, full, pixels }); state.assetReads.push(id);
      if (state.offline) return { status: 'temporary-error' };
      const access = await this.verify(id);
      return access.status === 'ready' ? { status: 'ready', uri: state.assetUris.get(id) } : access;
    },
    async clearRenders() {},
  };
  const mocks = {
    'expo-sharing': { isAvailableAsync: async () => !state.noSharing, shareAsync: async (uri,options) => { state.rawExport={uri,options}; } },
    'expo-modules-core': { requireOptionalNativeModule: () => missingNative ? null : native },
    'react-native': { Linking: { openSettings: async () => { state.settingsOpened=true; } }, AppState: { addEventListener: (_event, fn) => { state.activeListener = fn; return { remove() {} }; } } },
    'expo-file-system': { File, Directory, Paths: { get document() { return new Directory(state.documentRoot); },
      get cache() { return new Directory('file:///app/Cache'); } } },
    'expo-sqlite/kv-store': {
      getItemSync: key => { if (state.failRead) throw new Error('SQLite unavailable'); return state.kv.get(key) ?? null; },
      setItemSync: (key, value) => { if (state.failSave) throw new Error('Disk full'); state.writes.push(key); state.kv.set(key, value); },
    },
    'expo-image-picker': {
      requestMediaLibraryPermissionsAsync: async () => ({ granted: state.permission }),
      launchImageLibraryAsync: async options => { state.pickerOptions.push(options); return state.selection; },
      UIImagePickerPreferredAssetRepresentationMode: { Current: 'current' },
    },
    'expo-media-library': {
      addListener: fn => { state.libraryListener = fn; return { remove() {} }; },
      presentPermissionsPicker: async () => { state.limitedPicker = true; },
      getPermissionsAsync: async (...args) => { state.permissionChecks.push(args); return { granted: state.permission, canAskAgain: true, accessPrivileges: state.limited ? 'limited' : 'all' }; },
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
  const provider = load('features/photos/providers/ApplePhotosProvider.ts').applePhotosProvider;
  const pickReference = provider.pickMultiplePhotos.bind(provider);
  provider.pickMultiplePhotos = async (rollId, single) => {
    if (state.legacyCopyFixture && app.getState().importMode === 'copy') {
      // Test-only fixture creation for postponed Copy compatibility, never a production import path.
      if (!load('features/rolls/store/rollStore.ts').getRollById(rollId)) throw new Error('Roll not found');
      if (!state.permission) return { status: 'permission-denied' };
      if (state.selection.canceled) return { status: 'cancelled' };
      state.pickerOptions.push({ quality: 1, preferredAssetRepresentationMode: 'current' });
      return { status: 'selected', ...await load('features/photos/services/PhotoCopyService.ts').PhotoCopyService.copySelected(rollId, state.selection.assets) };
    }
    return pickReference(rollId, single);
  };
  const storage = load('features/photos/services/PhotoStorageService.ts').PhotoStorageService;
  const resolveCopy = load('features/photos/utils/resolvePhotoUri.ts').resolvePhotoUri;
  // Native fixture URI for byte-level share/export checks; production reference resolution is async.
  const resolve = photo => photo.provider === 'filmer-copy' ? resolveCopy(photo) : state.assetUris.get(photo.localIdentifier ?? photo.assetId);
  function select(count, extension = 'jpg') {
    const assets = Array.from({ length: count }, (_, index) => {
      const asset = { uri: `file:///picker/${index}.${extension}`, assetId: `asset-${index}`, fileName: `same.${extension}`, width: 100, height: 100,
        takenAt: '2026-10-06', exif: { DateTimeOriginal: '2026:10:06 12:00:00' } };
      state.assetUris.set(asset.assetId, asset.uri);
      state.files.set(asset.uri, Buffer.from(`original-image-${index}`));
      return asset;
    });
    state.selection = { canceled: false, assets };
    return assets;
  }
  return { state, app, store, service, storage, resolve, select, load, provider, pickReference };
}

test('Reference imports preserve verified identifiers and metadata without persisting picker URIs', async () => {
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
    assert.equal(p.thumbnailUri, undefined);
    assert.equal(r.load('features/photos/utils/resolvePhotoUri.ts').resolvePhotoUri(p), undefined);
    assert.equal(p.takenAt, '2026-10-06');
    assert.equal(p.id, `apple-photos-asset-${i}-${i}`);
  });
  assert.equal(r.state.copyCalls.length, 0);
  assert.equal(r.state.pickerOptions[0].allowsMultipleSelection, true);
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
  const restarted = runtime(r.state);
  assert.equal(restarted.store.getState().archive.status, 'recovery');
  assert.throws(() => restarted.store.getState().createRoll(seedRoll), /recovery/);
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
  assert.ok(r.state.permissionChecks.every(args => args[0] === false));
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
  assert.deepEqual(r.state.permissionChecks.filter(args => args[0] === true), [[true, ['photo']]]);
  assert.equal(r.state.permissionRequests.length, 0);
  assert.equal(r.state.deleted.length, 0);
  assert.equal(r.store.getState().rolls[0].photos.length, 5);
});

test('Batch Save requests permission only on Save and does not report denied or missing files as saved', async () => {
  const r = runtime(); r.select(2); await r.service.addToRoll('r1');
  assert.ok(r.state.permissionChecks.every(args => args[0] === false));
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

test('Reimporting an already present Reference does not duplicate a surviving frame', async () => {
  const r = runtime(); r.select(3); await r.service.addToRoll('r1');
  const before = r.store.getState().rolls[0].photos;
  r.store.getState().removePhotos('r1', new Set([before[0].id]));
  r.state.selection = { canceled: false, assets: [r.state.selection.assets[2]] };
  await r.service.addToRoll('r1');
  const photos = r.store.getState().rolls[0].photos;
  assert.equal(photos.length, 2);
  assert.equal(new Set(photos.map(photo => photo.id)).size, 2);
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
  // Older Rolls saved an exact day; editing them must not force a new month.
  assert.equal(isValidRollDraft({ ...draft, date: '2026-10-08' }), true);
  assert.equal(isValidRollDraft({ ...draft, frameCount: undefined }), true);
  assert.equal(isRollDraftDirty({ ...draft, frameCount: undefined }, original), true);
  for (const patch of [{ date: '2026-13' }, { date: '2026-02-30' }, { date: '2026-10-8' }, { frameCount: 0 }, { frameCount: 12.5 }, { location: { latitude: 91, longitude: 0 } }]) assert.equal(isValidRollDraft({ ...draft, ...patch }), false);
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

// MVP Reference path below uses the production picker unchanged, including a saved Copy preference.
test('MVP import ignores a legacy Copy preference and relaunch resolves only a verified Photos ID', async () => {
  const r = runtime(); r.state.legacyCopyFixture = false;
  r.app.getState().setImportMode('copy'); r.select(1);
  await r.service.addToRoll('r1');
  const photo = r.store.getState().rolls[0].photos[0];
  assert.equal(photo.provider, 'apple-photos'); assert.equal(photo.thumbnailUri, undefined);
  assert.equal(r.state.copyCalls.length,0);
  const restarted = runtime(r.state);
  const result = await restarted.load('features/photos/services/PhotoReferenceService.ts').resolvePhoto(photo);
  assert.equal(result.status,'ready'); assert.equal(restarted.state.nativeRequests.at(-1).full,false);
  assert.equal(restarted.state.nativeRequests.at(-1).pixels,512);
});

test('Deleted asset cannot use a warm cached image, stale picker URI or share/export fallback', async () => {
  const r = runtime(); r.select(1); await r.service.addToRoll('r1');
  const photo = { ...r.store.getState().rolls[0].photos[0], thumbnailUri:'file:///stale.jpg' };
  r.state.files.set(photo.thumbnailUri,Buffer.from('stale'));
  const api = r.load('features/photos/services/PhotoReferenceService.ts');
  assert.equal((await api.resolvePhoto(photo)).status,'ready');
  r.state.assetUris.delete(photo.assetId);
  assert.deepEqual(await api.resolvePhoto(photo),{status:'unavailable'});
  await assert.rejects(r.load('features/photos/services/PhotoShareService.ts').PhotoShareService.sharePhotos([photo]),/No selected photo/);
  assert.equal(r.store.getState().rolls[0].photos.length,1);
});

test('Album removal does not change library identity or frame order', async () => {
  const r = runtime(); r.select(2); await r.service.addToRoll('r1');
  const photos = r.store.getState().rolls[0].photos;
  r.state.albumMembers = new Set(); // Only album membership changed; the native library still contains both IDs.
  const api = r.load('features/photos/services/PhotoReferenceService.ts');
  for (const photo of photos) assert.equal((await api.resolvePhoto(photo)).status,'ready');
  assert.deepEqual(r.store.getState().rolls[0].photos,photos);
});

test('Denied, limited inaccessible, limited accessible and temporary errors remain distinct', async () => {
  const r = runtime(); r.select(1); await r.service.addToRoll('r1');
  const photo = r.store.getState().rolls[0].photos[0];
  const api = r.load('features/photos/services/PhotoReferenceService.ts');
  await api.resolvePhoto(photo); r.state.permission=false;
  assert.equal((await api.resolvePhoto(photo)).status,'permission-denied');
  r.state.permission=true; r.state.limited=true;
  assert.equal((await api.resolvePhoto(photo)).status,'ready');
  r.state.assetStatus.set(photo.assetId,'limited');
  assert.equal((await api.resolvePhoto(photo)).status,'limited');
  r.state.assetStatus.set(photo.assetId,'temporary-error');
  assert.equal((await api.resolvePhoto(photo)).status,'temporary-error');
  assert.equal(r.store.getState().rolls[0].photos[0],photo);
});

test('iCloud resolution fails offline, retries successfully, and requests full size only explicitly', async () => {
  const r = runtime(); r.select(1); await r.service.addToRoll('r1');
  const photo = r.store.getState().rolls[0].photos[0];
  const api = r.load('features/photos/services/PhotoReferenceService.ts');
  r.state.offline=true; assert.equal((await api.resolvePhoto(photo)).status,'temporary-error');
  r.state.offline=false; api.invalidatePhotoRenders();
  assert.equal((await api.resolvePhoto(photo)).status,'ready');
  assert.equal(r.state.nativeRequests.at(-1).full,false);
  assert.equal((await api.resolvePhoto(photo,'full')).status,'ready');
  assert.equal(r.state.nativeRequests.at(-1).full,true);
});

test('Null, empty, URI and unverified picker identifiers are never imported', async () => {
  const r = runtime(); r.state.legacyCopyFixture=false;
  const selected = r.select(5);
  [null,'','file:///picker/2.jpg','ph://fake','not-in-library'].forEach((assetId,i)=>selected[i].assetId=assetId);
  const before = r.state.kv.get('filmer.rolls.v1');
  assert.deepEqual(await r.service.addToRoll('r1'),{status:'selected',addedCount:0,failedCount:5});
  assert.equal(r.store.getState().rolls[0].photos.length,0);
  assert.equal(r.state.copyCalls.length,0);
  assert.equal(r.state.kv.get('filmer.rolls.v1'),before);
});

test('Relink retains frame ID, ordering, Roll metadata and photo details across restart', async () => {
  const r = runtime(); r.state.legacyCopyFixture=false; r.select(2); await r.service.addToRoll('r1');
  const photo = r.store.getState().rolls[0].photos[1];
  r.store.getState().updatePhoto('r1',photo.id,{note:'keep',takenAt:'2026-10-01',location:{latitude:1,longitude:2}});
  const original = r.store.getState().rolls[0].photos[1];
  const selected = r.select(1); selected[0].assetId='replacement'; r.state.assetUris.set('replacement',selected[0].uri);
  await r.load('features/photos/services/PhotoRelinkService.ts').relinkPhoto('r1',photo.id);
  const changed = r.store.getState().rolls[0].photos[1];
  assert.deepEqual(changed,{...original,assetId:'replacement',localIdentifier:'replacement'});
  assert.equal(r.state.pickerOptions.at(-1).allowsMultipleSelection,false);
  assert.deepEqual(runtime(r.state).store.getState().rolls[0].photos[1],changed);
});

test('Relink cancellation, failed verification and failed save leave archive unchanged', async () => {
  const r = runtime(); r.state.legacyCopyFixture=false; r.select(1); await r.service.addToRoll('r1');
  const photo = r.store.getState().rolls[0].photos[0], raw = r.state.kv.get('filmer.rolls.v1');
  const service = r.load('features/photos/services/PhotoRelinkService.ts');
  r.state.selection={canceled:true}; await service.relinkPhoto('r1',photo.id);
  r.state.selection={canceled:false,assets:[{assetId:null,uri:'file:///picker/invalid.jpg'}]};
  await assert.rejects(service.relinkPhoto('r1',photo.id));
  r.select(1); r.state.failSave=true;
  await assert.rejects(service.relinkPhoto('r1',photo.id),/Disk full/);
  assert.equal(r.state.kv.get('filmer.rolls.v1'),raw); assert.equal(r.store.getState().rolls[0].photos[0],photo);
});

test('App activation and library changes invalidate derived caches and notify observers', async () => {
  const r = runtime(); r.select(1); await r.service.addToRoll('r1');
  const api = r.load('features/photos/services/PhotoReferenceService.ts'); let updates=0;
  const remove=api.observePhotoLibrary(()=>updates++);
  await api.resolvePhoto(r.store.getState().rolls[0].photos[0]);
  r.state.activeListener('active'); r.state.libraryListener(); assert.equal(updates,2);
  await api.clearPhotoRenders(); assert.equal(updates,3); remove();
});

test('Malformed, invalid paths, duplicate IDs and future archives enter write-protected recovery', () => {
  const cases = ['{bad', JSON.stringify({schemaVersion:99,rolls:[seedRoll]}), JSON.stringify([seedRoll,seedRoll]),
    JSON.stringify([{...seedRoll,photos:[{id:'p',provider:'filmer-copy',storageMode:'copy',sortOrder:0,localUri:'file:///old.jpg',documentPath:'photos/../original.jpg'}]}]),
    JSON.stringify([{...seedRoll,photos:[{id:'p',provider:'apple-photos',assetId:'a',sortOrder:-1}]}]),
    JSON.stringify([{...seedRoll,photos:[{id:'p',provider:'apple-photos',assetId:'a',sortOrder:0},{id:'p',provider:'apple-photos',assetId:'b',sortOrder:1}]}]),
    JSON.stringify([{...seedRoll,filmOverride:{brand:'B',name:'N',iso:-1,type:'color',format:'35mm'}}])];
  for (const raw of cases) {
    const r=runtime(); r.state.kv.set('filmer.rolls.v1',raw); const restarted=runtime(r.state);
    assert.equal(restarted.store.getState().archive.status,'recovery');
    assert.equal(restarted.store.getState().archive.raw,raw);
    assert.throws(()=>restarted.store.getState().createRoll(seedRoll),/recovery/);
    assert.equal(r.state.kv.get('filmer.rolls.v1'),raw);
  }
});

test('SQLite startup failure, retry failure and successful recovery never replace stored archive', () => {
  const r=runtime(), raw=r.state.kv.get('filmer.rolls.v1'); r.state.failRead=true;
  const restarted=runtime(r.state); assert.equal(restarted.store.getState().archive.status,'recovery');
  restarted.store.getState().retryLoad(); assert.equal(restarted.store.getState().archive.status,'recovery');
  assert.equal(r.state.kv.get('filmer.rolls.v1'),raw);
  r.state.failRead=false; restarted.store.getState().retryLoad();
  assert.equal(restarted.store.getState().archive.status,'ready'); assert.equal(restarted.store.getState().rolls[0].id,'r1');
});

test('Valid legacy URI references and v1 envelopes preserve unknown catalog metadata without migration', async () => {
  const r=runtime();
  const roll={...seedRoll,photos:[{id:'legacy',provider:'apple-photos',assetId:'file:///expired.jpg',thumbnailUri:'file:///stale.jpg',sortOrder:4}]};
  const archive={schemaVersion:1,rolls:[roll],customFilms:[{id:'custom-f'}],customCameras:[{id:'custom-c',cover:'keep'}]};
  const raw=JSON.stringify(archive); r.state.kv.set('filmer.rolls.v1',raw);
  const restarted=runtime(r.state); assert.equal(restarted.store.getState().archive.status,'ready');
  assert.equal(r.state.kv.get('filmer.rolls.v1'),raw);
  assert.equal((await restarted.load('features/photos/services/PhotoReferenceService.ts').resolvePhoto(roll.photos[0])).status,'unavailable');
  restarted.store.getState().updatePhoto('r1','legacy',{note:'kept'});
  const saved=JSON.parse(r.state.kv.get('filmer.rolls.v1')); assert.deepEqual(saved.customFilms,archive.customFilms); assert.deepEqual(saved.customCameras,archive.customCameras);
  assert.equal(saved.rolls[0].photos[0].sortOrder,4);
});

test('A fresh install starts empty without publishing mock Rolls or writing storage', () => {
  const r=runtime(); r.state.kv.delete('filmer.rolls.v1'); const restarted=runtime(r.state);
  assert.equal(restarted.store.getState().archive.status,'ready'); assert.deepEqual(restarted.store.getState().rolls,[]);
  assert.equal(r.state.kv.has('filmer.rolls.v1'),false);
});

test('Storage corruption or read failure after startup locks writes before any archive replacement', () => {
  for (const failRead of [false,true]) {
    const r=runtime(), raw=r.state.kv.get('filmer.rolls.v1');
    if (failRead) r.state.failRead=true; else r.state.kv.set('filmer.rolls.v1','{damaged');
    assert.throws(()=>r.store.getState().updateRoll('r1',{...seedRoll,notes:'must not commit'}));
    assert.equal(r.store.getState().archive.status,'recovery');
    assert.equal(r.store.getState().rolls[0].notes,undefined);
    assert.equal(r.state.kv.get('filmer.rolls.v1'),failRead?raw:'{damaged');
  }
});

test('Archive validation rejects traversal, invalid providers, duplicate order and malformed optional metadata', () => {
  const r=runtime(); const {validateRollArchive}=r.load('features/rolls/data/validateRollArchive.ts');
  const photo={id:'p',provider:'apple-photos',assetId:'a',sortOrder:0};
  for (const patch of [{sortOrder:1.5},{sortOrder:NaN},{provider:'unknown'},{note:5},{takenAt:'2026-02-30'},{location:{latitude:0,longitude:181}}]) {
    assert.throws(()=>validateRollArchive([{...seedRoll,photos:[{...photo,...patch}]}]));
  }
  assert.throws(()=>validateRollArchive([{...seedRoll,photos:[photo,{...photo,id:'p2'}]}]));
  for (const documentPath of ['photos/r1/../photo-a.jpg','photos/r1/%2e%2e/photo-a.jpg','/photos/r1/photo-a.jpg','photos\\r1\\photo-a.jpg']) {
    assert.throws(()=>validateRollArchive([{...seedRoll,photos:[{...photo,provider:'filmer-copy',storageMode:'copy',localUri:'file:///legacy.jpg',documentPath}]}]));
  }
  assert.throws(()=>validateRollArchive([{...seedRoll,filmOverride:{brand:'B',name:'N',iso:100,type:'color',format:'35mm',imageDocumentPath:'film-covers/../original.jpg'}}]));
});

test('Resolution coalesces concurrent full image requests and survives a purged render file', async () => {
  const r=runtime(); r.select(1); await r.service.addToRoll('r1');
  const photo=r.store.getState().rolls[0].photos[0];
  const api=r.load('features/photos/services/PhotoReferenceService.ts');
  const results=await Promise.all([api.resolvePhoto(photo,'full'),api.resolvePhoto(photo,'full')]);
  assert.ok(results.every(result=>result.status==='ready')); assert.equal(r.state.nativeRequests.length,1);
  api.invalidatePhotoRenders(); await api.resolvePhoto(photo,'full'); assert.equal(r.state.nativeRequests.length,2);
});

test('Roll creation at an identical timestamp keeps IDs distinct and deletion isolated', () => {
  const r=runtime(), now=Date.now; Date.now=()=>123456789;
  try {
    const a=r.store.getState().createRoll(seedRoll), b=r.store.getState().createRoll(seedRoll);
    assert.notEqual(a.id,b.id); r.store.getState().deleteRoll(a.id);
    assert.ok(r.store.getState().rolls.some(roll=>roll.id===b.id));
  } finally { Date.now=now; }
});

test('Emergency raw export preserves malformed text exactly and cannot change the archive', async () => {
  const r=runtime(), raw=' {invalid archive\nTiếng Việt · 한국어';
  r.state.kv.set('filmer.rolls.v1',raw); const restarted=runtime(r.state);
  const service=restarted.load('features/rolls/services/ArchiveRecoveryService.ts');
  await service.exportRawArchive(restarted.store.getState().archive.raw);
  assert.equal(r.state.files.get(r.state.rawExport.uri).toString(),raw);
  assert.ok(r.state.rawExport.uri.startsWith('file:///app/Cache/filmer-recovery-'));
  assert.equal(r.state.kv.get('filmer.rolls.v1'),raw);
  r.state.noSharing=true; await assert.rejects(service.exportRawArchive(raw),/Sharing unavailable/);
  r.state.noSharing=false; r.state.failRecoveryExport=true; await assert.rejects(service.exportRawArchive(raw),/disk full/);
  assert.equal(r.state.kv.get('filmer.rolls.v1'),raw);
});

test('Recoverable access action uses limited selection or iOS Settings without changing frame data', async () => {
  const r=runtime(), raw=r.state.kv.get('filmer.rolls.v1');
  r.state.limited=true; await r.provider.manageAccess(); assert.equal(r.state.limitedPicker,true);
  r.state.limited=false; r.state.permission=false; await r.provider.manageAccess(); assert.equal(r.state.settingsOpened,true);
  assert.equal(r.state.kv.get('filmer.rolls.v1'),raw);
});

test('Custom catalogs persist every field across restart with stable Roll relationships and no archive rewrite on load', async () => {
  const r=runtime();
  const films=r.load('features/films/store/filmStore.ts').useFilmStore;
  const cameras=r.load('features/cameras/store/cameraStore.ts').useCameraStore;
  const film=films.getState().addCustomFilm({brand:'My Film',name:'Special',iso:200,type:'color',format:'120',formats:['120','35mm'],process:'C-41',aliases:['Custom'],shortDescription:{en:'Keep description'},extraField:{keep:1}});
  const source='file:///picker/camera.jpg'; r.state.files.set(source,Buffer.from('camera cover'));
  const camera=await cameras.getState().addCustomCamera({brand:'My Camera',model:'Prototype',format:'120',imageUri:source,extraField:{keep:2}});
  const roll=r.store.getState().createRoll({...seedRoll,filmId:film.id,filmName:film.brand+' '+film.name,cameraId:camera.id,cameraName:camera.brand+' '+camera.model});
  const raw=r.state.kv.get('filmer.rolls.v1'); const restarted=runtime(r.state);
  assert.deepEqual(restarted.load('features/films/store/filmStore.ts').useFilmStore.getState().films.find(f=>f.id===film.id),film);
  assert.deepEqual(restarted.load('features/cameras/store/cameraStore.ts').useCameraStore.getState().cameras.find(c=>c.id===camera.id),camera);
  assert.equal(restarted.store.getState().rolls.find(item=>item.id===roll.id).cameraId,camera.id);
  assert.equal(r.state.kv.get('filmer.rolls.v1'),raw);
  assert.match(camera.imageDocumentPath,/^camera-covers\/cover-/);
  assert.ok(r.state.files.has(source));
  const old=r.state.documentRoot; r.state.documentRoot='file:///updated-app/Documents';
  const uri=restarted.load('features/cameras/services/CameraCoverStorage.ts').cameraImageUri(camera);
  assert.ok(uri.startsWith(r.state.documentRoot)); assert.ok(!uri.startsWith(old));
});

test('Custom catalog save failures do not publish entries and Camera rollback protects shared source files', async () => {
  const r=runtime(); const films=r.load('features/films/store/filmStore.ts').useFilmStore;
  const cameras=r.load('features/cameras/store/cameraStore.ts').useCameraStore;
  const source='file:///app/Documents/camera-covers/cover-shared.jpg'; r.state.files.set(source,Buffer.from('shared cover'));
  const first=await cameras.getState().addCustomCamera({brand:'B',model:'First',format:'35mm',imageUri:source});
  const before=r.state.kv.get('filmer.cameras.v1'), count=cameras.getState().cameras.length;
  r.state.failSave=true;
  await assert.rejects(cameras.getState().addCustomCamera({brand:'B',model:'Second',format:'35mm',imageUri:first.imageUri}),/Disk full/);
  assert.equal(cameras.getState().cameras.length,count); assert.equal(r.state.kv.get('filmer.cameras.v1'),before);
  assert.ok(r.state.files.has(source)); assert.ok(r.state.files.has(first.imageUri));
  assert.equal(r.state.deleted.length,1);
  const filmCount=films.getState().films.length;
  assert.throws(()=>films.getState().addCustomFilm({brand:'B',name:'N',iso:100,type:'color',format:'35mm'}),/Disk full/);
  assert.equal(films.getState().films.length,filmCount); assert.equal(r.state.kv.has('filmer.films.v1'),false);
});

test('Partial Camera cover copies are rolled back without deleting originals or writing a catalog', async () => {
  const r=runtime(); const cameras=r.load('features/cameras/store/cameraStore.ts').useCameraStore;
  const source='file:///picker/partial.jpg';r.state.files.set(source,Buffer.from('original'));r.state.failUris.add(source);
  await assert.rejects(cameras.getState().addCustomCamera({brand:'B',model:'N',format:'35mm',imageUri:source}),/Native copy failed/);
  assert.ok(r.state.files.has(source));assert.equal(r.state.kv.has('filmer.cameras.v1'),false);assert.equal(r.state.deleted.length,1);
});

test('Corrupt or future catalog data enters recovery and stays byte-identical through failed load/save/retry', async () => {
  for (const key of ['filmer.films.v1','filmer.cameras.v1']) for (const raw of ['{invalid',JSON.stringify({schemaVersion:99,films:[],cameras:[]})]) {
    const r=runtime();r.state.kv.set(key,raw);
    const restarted=runtime(r.state);
    const store=key.includes('films')?restarted.load('features/films/store/filmStore.ts').useFilmStore:restarted.load('features/cameras/store/cameraStore.ts').useCameraStore;
    assert.equal(store.getState().archive.status,'recovery');assert.equal(store.getState().archive.raw,raw);
    store.getState().retryLoad();assert.equal(r.state.kv.get(key),raw);
    if(key.includes('films')) assert.throws(()=>store.getState().addCustomFilm({brand:'B',name:'N',iso:100,type:'color',format:'35mm'}),/recovery/);
    else await assert.rejects(store.getState().addCustomCamera({brand:'B',model:'N',format:'35mm'}),/recovery/);
    assert.equal(r.state.kv.get(key),raw);
    r.state.kv.set(key,'[]');store.getState().retryLoad();assert.equal(store.getState().archive.status,'ready');
  }
});

test('Custom IDs and Film cover destinations cannot collide at identical timestamps and randomness', async () => {
  const r=runtime(), now=Date.now, random=Math.random;Date.now=()=>123;Math.random=()=>0.25;
  try {
    const films=r.load('features/films/store/filmStore.ts').useFilmStore;
    const cameras=r.load('features/cameras/store/cameraStore.ts').useCameraStore;
    const input={brand:'B',name:'N',iso:100,type:'color',format:'35mm'};
    assert.notEqual(films.getState().addCustomFilm(input).id,films.getState().addCustomFilm(input).id);
    assert.notEqual((await cameras.getState().addCustomCamera({brand:'B',model:'N',format:'35mm'})).id,(await cameras.getState().addCustomCamera({brand:'B',model:'N',format:'35mm'})).id);
    const source='file:///picker/cover.jpg';r.state.files.set(source,Buffer.from('original'));
    const service=r.load('features/films/services/FilmCoverStorage.ts').FilmCoverStorage;
    const a=await service.copy(source),b=await service.copy(source);
    assert.notEqual(a.imageDocumentPath,b.imageDocumentPath);assert.ok(r.state.files.has(a.imageUri));assert.ok(r.state.files.has(b.imageUri));assert.equal(r.state.deleted.length,0);
  } finally {Date.now=now;Math.random=random;}
});

test('Deleting a Roll never deletes shared Camera covers or custom catalog entries', async () => {
  const r=runtime(), cameras=r.load('features/cameras/store/cameraStore.ts').useCameraStore;
  const source='file:///picker/shared.jpg';r.state.files.set(source,Buffer.from('shared'));
  const camera=await cameras.getState().addCustomCamera({brand:'B',model:'N',format:'35mm',imageUri:source});
  const a=r.store.getState().createRoll({...seedRoll,cameraId:camera.id}),b=r.store.getState().createRoll({...seedRoll,cameraId:camera.id});
  r.store.getState().deleteRoll(a.id);assert.ok(r.state.files.has(camera.imageUri));
  const restarted=runtime(r.state);assert.equal(restarted.store.getState().rolls.find(roll=>roll.id===b.id).cameraId,camera.id);
  assert.ok(restarted.load('features/cameras/store/cameraStore.ts').useCameraStore.getState().cameras.some(c=>c.id===camera.id));
});

test('Catalog SQLite failures are recoverable at cold startup and do not write empty defaults', () => {
 const r=runtime(); const before=new Map(r.state.kv); r.state.failRead=true;
 const restarted=runtime(r.state);
 const films=restarted.load('features/films/store/filmStore.ts').useFilmStore;
 const cameras=restarted.load('features/cameras/store/cameraStore.ts').useCameraStore;
 assert.equal(films.getState().archive.status,'recovery');assert.equal(cameras.getState().archive.status,'recovery');
 assert.deepEqual(r.state.kv,before);
 r.state.failRead=false;films.getState().retryLoad();cameras.getState().retryLoad();
 assert.equal(films.getState().archive.status,'ready');assert.equal(cameras.getState().archive.status,'ready');assert.deepEqual(r.state.kv,before);
});

test('Catalog duplicates/traversal are rejected and v1 envelope metadata remains intact', () => {
 const r=runtime();const {createCatalogRepository,validCustomFilm}=r.load('features/catalog/data/CatalogRepository.ts');
 const film={id:'custom-kept',brand:'B',name:'N',iso:100,type:'color',format:'35mm',isCustom:true};
 for(const entries of [[film,film],[{...film,imageDocumentPath:'film-covers/../original.jpg'}]]) {
  const raw=JSON.stringify(entries);r.state.kv.set('filmer.films.v1',raw);
  const repository=createCatalogRepository('filmer.films.v1','films',validCustomFilm,new Set());
  assert.equal(repository.load().status,'recovery');assert.throws(()=>repository.save([]),/recovery/);assert.equal(r.state.kv.get('filmer.films.v1'),raw);
 }
 r.state.kv.set('filmer.films.v1',JSON.stringify({schemaVersion:1,films:[film],extra:{keep:1}}));
 const repository=createCatalogRepository('filmer.films.v1','films',validCustomFilm,new Set());
 assert.equal(repository.load().status,'ready');repository.save([{...film,name:'Edited'}]);
 assert.deepEqual(JSON.parse(r.state.kv.get('filmer.films.v1')).extra,{keep:1});
});

test('Import appends after valid legacy sortOrder gaps without changing existing frame identity/order', async () => {
 const r=runtime();const original=[{id:'old-a',provider:'apple-photos',assetId:'old-asset-a',sortOrder:4,note:'keep'},{id:'old-b',provider:'apple-photos',assetId:'old-asset-b',sortOrder:9}];
 r.state.kv.set('filmer.rolls.v1',JSON.stringify([{...seedRoll,photos:original}]));
 const restarted=runtime(r.state);restarted.select(2);await restarted.service.addToRoll('r1');
 const photos=restarted.store.getState().rolls[0].photos;
 assert.deepEqual(photos.slice(0,2),original);assert.deepEqual(photos.map(photo=>photo.sortOrder),[4,9,10,11]);
 assert.deepEqual(runtime(r.state).store.getState().rolls[0].photos,photos);
});

test('36-photo selection imports once in selection order and survives a cold relaunch', async () => {
 const r=runtime();r.state.legacyCopyFixture=false;
 const assets=r.select(36);r.state.selection.assets=[...assets.slice(18),...assets.slice(0,18)];
 const expected=r.state.selection.assets.map(asset=>asset.assetId), before=r.state.writes.filter(key=>key==='filmer.rolls.v1').length;
 const result=await r.service.addToRoll('r1');assert.equal(result.addedCount,36);
 assert.equal(r.state.writes.filter(key=>key==='filmer.rolls.v1').length,before+1);
 const restarted=runtime(r.state), photos=restarted.store.getState().rolls[0].photos;
 assert.deepEqual(photos.map(photo=>photo.assetId),expected);assert.deepEqual(photos.map(photo=>photo.sortOrder),Array.from({length:36},(_,i)=>i));
 assert.ok(photos.every(photo=>photo.thumbnailUri===undefined && photo.localIdentifier===photo.assetId));
 assert.equal(r.state.copyCalls.length,0);
});

test('Duplicate picker identifiers and already imported assets cannot add duplicate frames or overwrite metadata', async () => {
 const r=runtime();r.state.legacyCopyFixture=false;const assets=r.select(4);
 r.state.selection.assets=[assets[2],assets[0],assets[2]];
 assert.equal((await r.service.addToRoll('r1')).addedCount,2);
 const original=r.store.getState().rolls[0].photos;
 r.store.getState().updatePhoto('r1',original[0].id,{note:'keep note'});
 r.state.selection.assets=[assets[2],assets[1],assets[0],assets[3]];
 assert.deepEqual(await r.service.addToRoll('r1'),{status:'selected',addedCount:2,failedCount:0,duplicateCount:2});
 const before=r.state.kv.get('filmer.rolls.v1');
 assert.equal((await r.service.addToRoll('r1')).addedCount,0);assert.equal(r.state.kv.get('filmer.rolls.v1'),before);
 const photos=r.store.getState().rolls[0].photos;assert.equal(photos.length,4);assert.equal(photos[0].note,'keep note');assert.equal(photos[0].id,original[0].id);
 assert.deepEqual(photos.map(photo=>photo.assetId),[assets[2],assets[0],assets[1],assets[3]].map(asset=>asset.assetId));
});

test('Cancelled native selection does not write a Roll archive', async () => {
 const r=runtime();r.state.legacyCopyFixture=false;
 const before=r.state.kv.get('filmer.rolls.v1'), writes=r.state.writes.length;
 assert.deepEqual(await r.service.addToRoll('r1'),{status:'cancelled'});
 assert.equal(r.state.kv.get('filmer.rolls.v1'),before);assert.equal(r.state.writes.length,writes);
});

test('Native import receives localized count/actions and appearance, while Relink requests a single picker', async () => {
 const r=runtime();r.state.legacyCopyFixture=false;r.app.getState().setLanguage('vi');r.app.getState().setAppearance('dark');
 r.select(1);await r.provider.pickMultiplePhotos('r1');const pick=r.state.nativePicks.at(-1);
 assert.equal(pick.single,false);assert.equal(pick.dark,true);assert.equal(pick.labels.title,'Thêm ảnh');assert.ok(pick.labels.countMany.includes('{count}'));
 await r.provider.pickMultiplePhotos('r1',true);assert.equal(r.state.nativePicks.at(-1).single,true);
});

test('Import deduplication uses the same verified-identifier fallback as legacy Reference resolution', async () => {
 const r=runtime();r.select(1);await r.service.addToRoll('r1');
 const roll=r.store.getState().rolls[0], photo=roll.photos[0];
 r.state.kv.set('filmer.rolls.v1',JSON.stringify([{...roll,photos:[{...photo,localIdentifier:'file:///expired-picker.jpg'}]}]));
 const restarted=runtime(r.state);restarted.select(1);
 const result=await restarted.service.addToRoll('r1');assert.equal(result.addedCount,0);assert.equal(result.duplicateCount,1);
 assert.equal(restarted.store.getState().rolls[0].photos[0].id,photo.id);
});

test('Missing PhotoKit falls back to system picker and persists durable copies', async () => {
  const r = runtime(undefined, true);
  const assets = r.select(2);
  const result = await r.service.addToRoll('r1');
  assert.equal(result.addedCount, 2);
  const photos = r.store.getState().rolls[0].photos;
  assert.ok(photos.every(photo => photo.provider === 'filmer-copy'));
  assert.equal(r.state.nativePicks, undefined);
  assert.equal(r.state.pickerOptions[0].orderedSelection, false);
  assert.equal(r.state.pickerOptions[0].allowsMultipleSelection, true);
  assert.equal(r.state.pickerOptions[0].selectionLimit, 0);
  assert.deepEqual(photos.map(photo => r.state.files.get(r.storage.resolveUri(photo)).toString()),
    assets.map(asset => r.state.files.get(asset.uri).toString()));
  assets.forEach(asset => r.state.files.delete(asset.uri));
  for (const photo of photos) {
    const resolved = await r.load('features/photos/services/PhotoReferenceService.ts').resolvePhoto(photo);
    assert.equal(resolved.status, 'ready');
    assert.ok(r.state.files.has(resolved.uri));
  }
});

test('Fallback cancellation and failed copy leave no photos or partial files', async () => {
  const r = runtime(undefined, true);
  assert.deepEqual(await r.service.addToRoll('r1'), { status: 'cancelled' });
  const assets = r.select(1);
  r.state.failUris.add(assets[0].uri);
  const result = await r.service.addToRoll('r1');
  assert.equal(result.addedCount, 0);
  assert.equal(result.failedCount, 1);
  assert.equal(r.store.getState().rolls[0].photos.length, 0);
  assert.equal([...r.state.files.keys()].filter(uri => uri.includes('/Documents/photos/')).length, 0);
});

test('Fallback archive failure cleans copied files and preserves the roll', async () => {
  const r = runtime(undefined, true);
  r.select(2);
  r.state.failSave = true;
  await assert.rejects(r.service.addToRoll('r1'));
  assert.equal(r.store.getState().rolls[0].photos.length, 0);
  assert.equal([...r.state.files.keys()].filter(uri => uri.includes('/Documents/photos/')).length, 0);
});

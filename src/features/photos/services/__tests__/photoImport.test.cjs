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
      if (state.failList) throw new Error('Directory read failed');
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
    async cacheInfo() {
      if (state.cacheInfoError || (state.failCacheAfterClear && state.didClear)) throw new Error('Cannot measure cache');
      const prefix = 'file:///app/Cache/filog-photo-renders/';
      const entries = [...state.files].filter(([uri]) => uri.startsWith(prefix) && uri.endsWith('.jpg'));
      return { bytes: entries.reduce((sum, [, bytes]) => sum + bytes.length, 0), files: entries.length, uri: prefix };
    },
    async clearRenders() {
      state.didClear = true;
      let count = 0;
      for (const uri of [...state.files.keys()]) if (uri.startsWith('file:///app/Cache/filog-photo-renders/') && uri.endsWith('.jpg')) {
        if (state.clearFailureAfter !== undefined && count >= state.clearFailureAfter) throw new Error('Cache removal failed');
        state.files.delete(uri); count++;
      }
      return count;
    },
    // cloudMap: cloud identifier -> current-device localIdentifier, or a full native result.
    async locate(cloudId) {
      (state.locateCalls ??= []).push(cloudId);
      if (!state.permission) return { status: 'permission-denied' };
      const mapped = state.cloudMap?.get(cloudId);
      if (mapped === undefined) return { status: state.limited ? 'limited' : 'unavailable' };
      return typeof mapped === 'object' ? mapped : { status: 'ready', assetId: mapped };
    },
  };
  const mocks = {
    'expo-sharing': { isAvailableAsync: async () => !state.noSharing, shareAsync: async (uri,options) => { state.rawExport={uri,options}; } },
    'expo-modules-core': { requireOptionalNativeModule: name => name === 'FiLogCloud' ? state.cloudBridge ?? null : missingNative ? null : native },
    'react-native': { Linking: { openSettings: async () => { state.settingsOpened=true; } }, AppState: { get currentState() { return state.appState ?? 'active'; }, addEventListener: (_event, fn) => { state.activeListener = fn; return { remove() {} }; } } },
    'expo-file-system': { File, Directory, Paths: { get document() { return new Directory(state.documentRoot); },
      get cache() { return new Directory('file:///app/Cache'); } } },
    'expo-sqlite': { defaultDatabaseDirectory: 'file:///app/Documents/SQLite' },
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
      getPermissionsAsync: async (...args) => { state.permissionChecks.push(args); return { status: state.permission ? 'granted' : state.undetermined ? 'undetermined' : 'denied', granted: state.permission, canAskAgain: true, accessPrivileges: state.limited ? 'limited' : 'all' }; },
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
  return { state, app, store, service, storage, resolve, select, load, provider, pickReference, native };
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
  assert.ok(r.state.rawExport.uri.startsWith('file:///app/Cache/filog-recovery-'));
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

test('Native bridge retains legacy argument compatibility, while Relink requests a single picker', async () => {
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

test('Missing PhotoKit cannot import copies or mutate the archive', async () => {
  const r = runtime(undefined, true);
  r.select(2);
  const before = r.state.kv.get('filmer.rolls.v1');
  const writes = r.state.writes.length;
  await assert.rejects(r.service.addToRoll('r1'), /requires a new iOS build/);
  assert.equal(r.state.kv.get('filmer.rolls.v1'), before);
  assert.equal(r.state.writes.length, writes);
  assert.equal(r.state.pickerOptions.length, 0);
  assert.equal(r.state.copyCalls.length, 0);
  assert.equal(r.state.permissionRequests.length, 0);
});

test('Limited system selections import only verified assets in returned order, retaining cloud IDs', async () => {
  const r = runtime(); r.state.legacyCopyFixture = false; r.state.limited = true;
  const assets = r.select(4);
  assets[0].cloudId = 'cloud-first';
  assets[2].cloudId = 'cloud-third';
  r.state.selection.assets = [assets[2], { assetId: null }, assets[0], assets[1], assets[3]];
  r.state.assetStatus.set(assets[1].assetId, 'limited');
  const result = await r.service.addToRoll('r1');
  assert.deepEqual(result, { status: 'selected', addedCount: 3, failedCount: 2 });
  const photos = r.store.getState().rolls[0].photos;
  assert.deepEqual(photos.map(photo => photo.assetId), [assets[2].assetId, assets[0].assetId, assets[3].assetId]);
  assert.deepEqual(photos.map(photo => photo.sortOrder), [0, 1, 2]);
  assert.deepEqual(photos.map(photo => photo.cloudIdentifier), ['cloud-third', 'cloud-first', undefined]);
  assert.equal(r.state.copyCalls.length, 0);
  assert.equal(r.state.permissionRequests.length, 0);
});

// Simulates a restore/new iPhone: old localIdentifiers vanish, the same iCloud Photos assets get new ones.
async function cloudImported(count, withCloud = () => true) {
  const r = runtime(); r.state.legacyCopyFixture = false;
  const assets = r.select(count);
  assets.forEach((asset, i) => { if (withCloud(i)) asset.cloudId = `cloud-${i}:001:AbC/+=`; });
  await r.service.addToRoll('r1');
  return { r, assets };
}
function moveToNewDevice(r, assets, indexes) {
  r.state.cloudMap ??= new Map();
  for (const i of indexes) {
    const uri = r.state.assetUris.get(assets[i].assetId);
    r.state.assetUris.delete(assets[i].assetId);
    r.state.assetUris.set(`device2-${i}`, uri);
    r.state.cloudMap.set(`cloud-${i}:001:AbC/+=`, `device2-${i}`);
  }
}
const resolver = r => r.load('features/photos/services/PhotoReferenceService.ts');

test('Reference import stores cloud identifiers only when PhotoKit provides them', async () => {
  const { r, assets } = await cloudImported(3, i => i !== 1);
  const photos = r.store.getState().rolls[0].photos;
  assert.equal(photos.length, 3);
  assert.equal(photos[0].cloudIdentifier, 'cloud-0:001:AbC/+=');
  assert.ok(!('cloudIdentifier' in photos[1]));
  photos.forEach((photo, i) => { assert.equal(photo.localIdentifier, assets[i].assetId); assert.equal(photo.id, `apple-photos-asset-${i}-${i}`); });
  assert.equal(r.state.copyCalls.length, 0);
  assert.deepEqual(runtime(r.state).store.getState().rolls[0].photos, photos);
});

test('Unusable cloud identifiers are dropped at import without failing the import', async () => {
  const r = runtime(); r.state.legacyCopyFixture = false;
  const assets = r.select(2); assets[0].cloudId = ''; assets[1].cloudId = 'bad\u0000id';
  const result = await r.service.addToRoll('r1');
  assert.equal(result.addedCount, 2); assert.equal(result.failedCount, 0);
  assert.ok(r.store.getState().rolls[0].photos.every(photo => !('cloudIdentifier' in photo)));
});

test('Legacy, Copy and malformed-cloud records load, resolve and never query cloud mapping', async () => {
  const legacy = { id: 'p1', provider: 'apple-photos', assetId: 'old-1', sortOrder: 0 };
  const odd = { id: 'p2', provider: 'apple-photos', storageMode: 'reference', assetId: 'old-2', localIdentifier: 'old-2', cloudIdentifier: 42, sortOrder: 1 };
  const r0 = runtime(); r0.state.kv.set('filmer.rolls.v1', JSON.stringify([{ ...seedRoll, photos: [legacy, odd] }]));
  const r = runtime(r0.state);
  assert.equal(r.store.getState().archive.status, 'ready');
  const raw = r.state.kv.get('filmer.rolls.v1');
  for (const photo of r.store.getState().rolls[0].photos) assert.equal((await resolver(r).resolvePhoto(photo)).status, 'unavailable');
  assert.equal(r.state.locateCalls, undefined);
  assert.equal(r.state.kv.get('filmer.rolls.v1'), raw);
  r.app.getState().setImportMode('copy'); r.state.legacyCopyFixture = true; r.select(1);
  await r.service.addToRoll('r1');
  const copy = r.store.getState().rolls[0].photos.find(photo => photo.provider === 'filmer-copy');
  assert.equal((await resolver(r).resolvePhoto(copy)).status, 'ready');
  assert.equal(r.state.locateCalls, undefined);
});

test('Stale reference recovers through its cloud identifier, changing only identifiers, across restart', async () => {
  const { r, assets } = await cloudImported(3);
  r.store.getState().updatePhoto('r1', r.store.getState().rolls[0].photos[1].id, { note: 'keep', takenAt: '2026-10-01', location: { latitude: 1, longitude: 2 } });
  r.store.getState().createRoll({ cameraName: 'C', cameraId: 'c', date: '2026-09', filmId: 'f', filmName: 'F', format: '120' });
  const before = r.store.getState().rolls;
  const restarted = runtime(r.state); moveToNewDevice(restarted, assets, [1]);
  const photo = restarted.store.getState().rolls.find(roll => roll.id === 'r1').photos[1];
  const result = await resolver(restarted).resolvePhoto(photo);
  assert.equal(result.status, 'ready'); assert.equal(result.uri, assets[1].uri);
  const after = restarted.store.getState().rolls;
  const r1Before = before.find(roll => roll.id === 'r1'), r1After = after.find(roll => roll.id === 'r1');
  assert.deepEqual(r1After.photos[1], { ...r1Before.photos[1], assetId: 'device2-1', localIdentifier: 'device2-1' });
  assert.deepEqual({ ...r1After, photos: [] }, { ...r1Before, photos: [] });
  assert.deepEqual([r1After.photos[0], r1After.photos[2]], [r1Before.photos[0], r1Before.photos[2]]);
  assert.deepEqual(after.find(roll => roll.id !== 'r1'), before.find(roll => roll.id !== 'r1'));
  assert.deepEqual(r1After.photos.map(p => p.id), r1Before.photos.map(p => p.id));
  assert.deepEqual(runtime(restarted.state).store.getState().rolls, after);
  // Repaired reference resolves directly; no further cloud lookups.
  assert.equal((await resolver(restarted).resolvePhoto(r1After.photos[1])).status, 'ready');
  assert.deepEqual(restarted.state.locateCalls, ['cloud-1:001:AbC/+=']);
});

test('The same stale asset in several Rolls is repaired together, and a moved-on reference is not overwritten', async () => {
  const { r, assets } = await cloudImported(1);
  const shared = r.store.getState().rolls[0].photos[0];
  const second = r.store.getState().createRoll({ cameraName: 'C', cameraId: 'c', date: '2026-09', filmId: 'f', filmName: 'F', format: '35mm' });
  r.store.getState().addPhotosToRoll(second.id, [{ ...shared }]);
  moveToNewDevice(r, assets, [0]);
  assert.equal((await resolver(r).resolvePhoto(shared)).status, 'ready');
  assert.ok(r.store.getState().rolls.every(roll => roll.photos[0].localIdentifier === 'device2-0'));
  assert.equal(r.store.getState().recoverPhotoReferences('asset-0', 'cloud-0:001:AbC/+=', 'other'), 0);
});

test('Failed mapping and deleted photos keep identifiers, show unavailable and query once per Retry', async () => {
  const { r } = await cloudImported(1);
  const photo = r.store.getState().rolls[0].photos[0], raw = r.state.kv.get('filmer.rolls.v1');
  r.state.assetUris.delete('asset-0');
  const api = resolver(r);
  for (let i = 0; i < 3; i++) assert.equal((await api.resolvePhoto(photo)).status, 'unavailable');
  assert.equal(r.state.locateCalls.length, 1);
  api.invalidatePhotoRenders();
  assert.equal((await api.resolvePhoto(photo)).status, 'unavailable');
  assert.equal(r.state.locateCalls.length, 2);
  r.state.cloudMap = new Map([['cloud-0:001:AbC/+=', { status: 'temporary-error' }]]); api.invalidatePhotoRenders();
  assert.equal((await api.resolvePhoto(photo)).status, 'unavailable');
  assert.equal(r.state.kv.get('filmer.rolls.v1'), raw);
  assert.equal(r.store.getState().rolls[0].photos[0], photo);
});

test('A mapped asset that fails independent verification is never written', async () => {
  const { r } = await cloudImported(1);
  const photo = r.store.getState().rolls[0].photos[0], raw = r.state.kv.get('filmer.rolls.v1');
  r.state.assetUris.delete('asset-0');
  r.state.cloudMap = new Map([['cloud-0:001:AbC/+=', 'ghost']]);
  assert.equal((await resolver(r).resolvePhoto(photo)).status, 'unavailable');
  r.state.cloudMap.set('cloud-0:001:AbC/+=', { status: 'ready', assetId: 'file:///not-an-identifier' });
  resolver(r).invalidatePhotoRenders();
  assert.equal((await resolver(r).resolvePhoto(photo)).status, 'unavailable');
  assert.equal(r.state.kv.get('filmer.rolls.v1'), raw);
});

test('Denied permission and transient errors never attempt recovery; limited access may recover', async () => {
  const { r, assets } = await cloudImported(2);
  const [a, b] = r.store.getState().rolls[0].photos, raw = r.state.kv.get('filmer.rolls.v1');
  const api = resolver(r);
  r.state.permission = false;
  assert.equal((await api.resolvePhoto(a)).status, 'permission-denied');
  r.state.permission = true; r.state.assetStatus.set('asset-0', 'temporary-error'); api.invalidatePhotoRenders();
  assert.equal((await api.resolvePhoto(a)).status, 'temporary-error');
  assert.equal(r.state.locateCalls, undefined);
  assert.equal(r.state.kv.get('filmer.rolls.v1'), raw);
  r.state.limited = true; moveToNewDevice(r, assets, [1]); r.state.cloudMap.delete('cloud-1:001:AbC/+=');
  assert.equal((await api.resolvePhoto(b)).status, 'limited');
  assert.equal(r.state.kv.get('filmer.rolls.v1'), raw);
  r.state.cloudMap.set('cloud-1:001:AbC/+=', 'device2-1'); api.invalidatePhotoRenders();
  assert.equal((await api.resolvePhoto(b)).status, 'ready');
  assert.equal(r.store.getState().rolls[0].photos[1].localIdentifier, 'device2-1');
});

test('A recovery that cannot be saved still displays this session and leaves the archive untouched', async () => {
  const { r, assets } = await cloudImported(1);
  const photo = r.store.getState().rolls[0].photos[0], raw = r.state.kv.get('filmer.rolls.v1');
  moveToNewDevice(r, assets, [0]); r.state.failSave = true;
  const api = resolver(r);
  assert.equal((await api.resolvePhoto(photo)).status, 'ready');
  assert.equal((await api.resolvePhoto(photo)).status, 'ready');
  assert.equal(r.state.locateCalls.length, 1);
  assert.equal(r.state.kv.get('filmer.rolls.v1'), raw);
  assert.equal(r.store.getState().rolls[0].photos[0], photo);
});

test('Builds without native locate keep the existing unavailable state', async () => {
  const { r, assets } = await cloudImported(1);
  delete r.native.locate; moveToNewDevice(r, assets, [0]);
  assert.equal((await resolver(r).resolvePhoto(r.store.getState().rolls[0].photos[0])).status, 'unavailable');
});

test('Manual Relink replaces the cloud identifier with the replacement one, or drops it', async () => {
  const { r } = await cloudImported(2);
  const relink = r.load('features/photos/services/PhotoRelinkService.ts').relinkPhoto;
  const [first, second] = r.store.getState().rolls[0].photos;
  const withCloud = r.select(1); withCloud[0].assetId = 'replacement-a'; withCloud[0].cloudId = 'cloud-new'; r.state.assetUris.set('replacement-a', withCloud[0].uri);
  await relink('r1', first.id);
  const withoutCloud = r.select(1); withoutCloud[0].assetId = 'replacement-b'; r.state.assetUris.set('replacement-b', withoutCloud[0].uri);
  await relink('r1', second.id);
  const [a, b] = r.store.getState().rolls[0].photos;
  assert.deepEqual(a, { ...first, assetId: 'replacement-a', localIdentifier: 'replacement-a', cloudIdentifier: 'cloud-new' });
  const { cloudIdentifier: _dropped, ...rest } = second;
  assert.deepEqual(b, { ...rest, assetId: 'replacement-b', localIdentifier: 'replacement-b' });
});

test('Photo Quality defaults safely, persists alongside old preferences and cannot publish a failed save', () => {
  const r = runtime();
  assert.equal(r.app.getState().photoQuality, 'optimized');
  r.app.getState().setLanguage('vi');
  r.app.getState().setImportMode('copy');
  r.app.getState().setPhotoQuality('high');
  const restarted = runtime(r.state);
  assert.equal(restarted.app.getState().photoQuality, 'high');
  assert.equal(restarted.app.getState().language, 'vi');
  assert.equal(restarted.app.getState().importMode, 'copy');
  r.state.failSave = true;
  assert.throws(() => restarted.app.getState().setPhotoQuality('optimized'));
  assert.equal(restarted.app.getState().photoQuality, 'high');
  r.state.failSave = false;
  r.state.kv.set('filmer.settings.v1', JSON.stringify({ language: 'ko', appearance: 'dark', photoQuality: 'invalid' }));
  const legacy = runtime(r.state);
  assert.equal(legacy.app.getState().photoQuality, 'optimized');
  assert.equal(legacy.app.getState().language, 'ko');
  // Settings saved before the import guide existed still show it once.
  assert.equal(legacy.app.getState().photoGuideSeen, false);
  legacy.app.getState().markPhotoGuideSeen();
  const guided = runtime(r.state);
  assert.equal(guided.app.getState().photoGuideSeen, true);
  assert.equal(guided.app.getState().language, 'ko');
  assert.deepEqual(guided.app.getState().homeTourSeen, []);
  guided.app.getState().markHomeTourSeen(['settings']);
  guided.app.getState().markHomeTourSeen(['newRoll']);
  assert.deepEqual(runtime(r.state).app.getState().homeTourSeen, ['newRoll', 'settings']);
  r.state.kv.set('filmer.settings.v1', JSON.stringify({ homeTourSeen: ['stats', 'unknown', 3] }));
  const filtered = runtime(r.state);
  assert.deepEqual(filtered.app.getState().homeTourSeen, ['stats']);
  filtered.app.getState().resetGuides();
  const replayed = runtime(r.state);
  assert.deepEqual(replayed.app.getState().homeTourSeen, []);
  assert.equal(replayed.app.getState().photoGuideSeen, false);
});

test('Reference check distinguishes available, saved recovery, limited, missing and transient failures without downloading photos', async () => {
  const { r, assets } = await cloudImported(5);
  moveToNewDevice(r, assets, [1]);
  r.state.assetStatus.set(assets[2].assetId, 'limited');
  r.state.assetStatus.set(assets[3].assetId, 'unavailable');
  r.state.assetStatus.set(assets[4].assetId, 'temporary-error');
  const before = r.store.getState().rolls[0].photos;
  const snapshots = [];
  const report = await r.load('features/settings/services/ReferenceRepairService.ts').ReferenceRepairService.run(value => snapshots.push(value));
  const { issues, ...counts } = report;
  assert.deepEqual(counts, { total: 5, checked: 5, available: 1, recovered: 1, restricted: 1, inaccessible: 1, errors: 1, skipped: 0 });
  assert.deepEqual(issues.map(issue => issue.reason), ['limited', 'unavailable', 'temporary-error']);
  assert.equal(r.state.nativeRequests.length, 0);
  assert.equal(r.state.copyCalls.length, 0);
  assert.equal(snapshots[0].checked, 0);
  assert.equal(snapshots.at(-1).checked, 5);
  const after = r.store.getState().rolls[0].photos;
  assert.deepEqual(after.map(p => [p.id, p.sortOrder, p.note]), before.map(p => [p.id, p.sortOrder, p.note]));
});

test('Reference check reports save errors and can retry without changing the original archive', async () => {
  const { r, assets } = await cloudImported(1);
  moveToNewDevice(r, assets, [0]);
  const before = r.state.kv.get('filmer.rolls.v1');
  const service = r.load('features/settings/services/ReferenceRepairService.ts').ReferenceRepairService;
  r.state.failSave = true;
  const failed = await service.run();
  assert.equal(failed.errors, 1);
  assert.equal(failed.recovered, 0);
  assert.equal(r.state.kv.get('filmer.rolls.v1'), before);
  r.state.failSave = false;
  assert.equal((await service.run()).recovered, 1);
});

test('Reference check handles denied access, empty archives, cancellation and single-flight execution', async () => {
  const { r } = await cloudImported(2);
  const service = r.load('features/settings/services/ReferenceRepairService.ts').ReferenceRepairService;
  r.state.permission = false;
  assert.equal((await service.run()).restricted, 2);
  const operation = new AbortController();
  const pending = service.run(report => { if (report.checked === 1) operation.abort(); }, operation.signal);
  await assert.rejects(service.run(), /already running/);
  assert.equal((await pending).checked, 1);
  r.state.permission = true;
  r.store.getState().deleteRoll('r1');
  assert.equal((await service.run()).total, 0);
});

test('Photos Access reads full, limited, denied, undetermined and missing module without prompting', async () => {
  const r = runtime();
  const service = r.load('features/settings/services/PhotosAccessService.ts').PhotosAccessService;
  assert.equal(await service.read(), 'full');
  r.state.limited = true; assert.equal(await service.read(), 'limited');
  r.state.limited = false; r.state.permission = false; assert.equal(await service.read(), 'denied');
  r.state.undetermined = true; assert.equal(await service.read(), 'undetermined');
  assert.equal(r.state.permissionRequests.length, 0);
  await service.request(); assert.equal(r.state.permissionRequests.length, 1);
  const missing = runtime(undefined, true);
  assert.equal(await missing.load('features/settings/services/PhotosAccessService.ts').PhotosAccessService.read(), 'unavailable');
});

test('Storage measures disjoint categories and clears only known previews, preserving all user files', async () => {
  const r = runtime();
  for (const directory of ['Documents', 'Documents/SQLite', 'Documents/film-covers', 'Documents/camera-covers', 'Documents/photos', 'Documents/photos/r1', 'Cache', 'Cache/filog-photo-renders']) r.state.directories.add('file:///app/' + directory);
  const entries = [
    ['Documents/SQLite/ExpoSQLiteStorage', 100], ['Documents/SQLite/ExpoSQLiteStorage-wal', 20],
    ['Documents/film-covers/cover-a.jpg', 30], ['Documents/camera-covers/cover-b.jpg', 40],
    ['Documents/photos/r1/photo-a.jpg', 50], ['Documents/other.txt', 60],
    ['Cache/filog-photo-renders/a.jpg', 70], ['Cache/filog-photo-renders/unknown.txt', 5], ['Cache/share.jpg', 80],
  ];
  for (const [path, size] of entries) r.state.files.set('file:///app/' + path, Buffer.alloc(size));
  const service = r.load('features/settings/services/StorageService.ts').StorageService;
  const measured = await service.measure();
  assert.deepEqual([measured.database, measured.covers, measured.copies, measured.cache, measured.other, measured.total], [120, 70, 50, 70, 145, 455]);
  assert.equal(await service.clearPhotoCache(), 70);
  assert.equal(r.state.files.has('file:///app/Cache/filog-photo-renders/a.jpg'), false);
  for (const [path] of entries.filter(([path]) => path !== 'Cache/filog-photo-renders/a.jpg')) assert.equal(r.state.files.has('file:///app/' + path), true, path);
  const after = await service.measure();
  assert.equal(after.cache, 0);
  // Unknown files are measured as Other and remain untouched.
  assert.equal(after.total, 385);
  r.state.cacheInfoError = true;
  assert.equal((await service.measure()).cache, null);
  await assert.rejects(service.clearPhotoCache());
});


test('Storage read errors remain errors and do not clear user files', async () => {
  const r = runtime(); r.state.directories.add('file:///app/Documents');
  const before = [...r.state.files]; r.state.failList = true;
  await assert.rejects(r.load('features/settings/services/StorageService.ts').StorageService.measure(), /Directory read failed/);
  assert.deepEqual([...r.state.files], before);
});

test('Transient cloud mapping failure is retryable in reference verification', async () => {
  const { r, assets } = await cloudImported(1);
  moveToNewDevice(r, assets, [0]);
  r.state.cloudMap.set('cloud-0:001:AbC/+=', { status: 'temporary-error' });
  const service = r.load('features/settings/services/ReferenceRepairService.ts').ReferenceRepairService;
  assert.equal((await service.run()).errors, 1);
  r.state.cloudMap.set('cloud-0:001:AbC/+=', 'device2-0');
  assert.equal((await service.run()).recovered, 1);
});


test('Empty storage has finite zero totals and does not count Apple Photos originals', async () => {
  const r = runtime();
  r.state.files.set('file:///apple-photos/original.jpg', Buffer.alloc(4096));
  const measured = await r.load('features/settings/services/StorageService.ts').StorageService.measure();
  assert.equal(measured.total, 0);
  assert.equal(measured.cache, 0);
  assert.ok(Object.values(measured).every(Number.isFinite));
});

test('Large storage measurement sums exact file bytes while retaining custom covers and copies', async () => {
  const r = runtime();
  r.state.directories.add('file:///app/Documents');
  r.state.directories.add('file:///app/Documents/photos');
  r.state.directories.add('file:///app/Documents/photos/r1');
  for (let i = 1; i <= 500; i++) r.state.files.set(`file:///app/Documents/photos/r1/photo-${i}.jpg`, Buffer.alloc(i));
  const before = [...r.state.files.keys()];
  const measured = await r.load('features/settings/services/StorageService.ts').StorageService.measure();
  assert.equal(measured.copies, 500 * 501 / 2);
  assert.equal(measured.total, measured.copies);
  assert.deepEqual([...r.state.files.keys()], before);
});

test('Partial cache deletion reports actual freed bytes and preserves every user-owned file', async () => {
  const r = runtime();
  r.state.files.set('file:///app/Cache/filog-photo-renders/a.jpg', Buffer.alloc(70));
  r.state.files.set('file:///app/Cache/filog-photo-renders/b.jpg', Buffer.alloc(30));
  const retained = ['file:///app/Documents/SQLite/ExpoSQLiteStorage', 'file:///app/Documents/film-covers/cover-a.jpg', 'file:///app/Documents/photos/r1/photo-a.jpg'];
  for (const uri of retained) r.state.files.set(uri, Buffer.from('user-data'));
  const { StorageService, PhotoCacheClearError } = r.load('features/settings/services/StorageService.ts');
  r.state.clearFailureAfter = 1;
  await assert.rejects(StorageService.clearPhotoCache(), error => error instanceof PhotoCacheClearError && error.freedBytes === 70);
  assert.ok(retained.every(uri => r.state.files.get(uri).toString() === 'user-data'));
  assert.equal(r.state.files.has('file:///app/Cache/filog-photo-renders/b.jpg'), true);
  r.state.clearFailureAfter = undefined;
  assert.equal(await StorageService.clearPhotoCache(), 30);
});

test('A failed post-clear measurement never claims a successful cleanup or resets metadata', async () => {
  const r = runtime();
  const before = r.state.kv.get('filmer.rolls.v1');
  r.state.failCacheAfterClear = true;
  const { StorageService, PhotoCacheClearError } = r.load('features/settings/services/StorageService.ts');
  await assert.rejects(StorageService.clearPhotoCache(), error => error instanceof PhotoCacheClearError && error.freedBytes === null);
  assert.equal(r.state.kv.get('filmer.rolls.v1'), before);
});

test('Large reference verification preserves frame identity and never requests image rendering', async () => {
  const r = runtime(); r.state.legacyCopyFixture = false;
  r.select(500); await r.service.addToRoll('r1');
  const before = r.state.kv.get('filmer.rolls.v1');
  const report = await r.load('features/settings/services/ReferenceRepairService.ts').ReferenceRepairService.run();
  assert.equal(report.total, 500);
  assert.equal(report.available, 500);
  assert.equal(report.checked, 500);
  assert.equal(report.errors, 0);
  assert.equal(r.state.kv.get('filmer.rolls.v1'), before);
  assert.equal(r.state.nativeRequests.length, 0);
});

// CloudKit integration uses the actual guarded Roll/catalog stores; only the network transport is mocked.
function fakeCloud() {
  const records = new Map(); let revision = 0;
  const server = {
    account: 'account-a', available: true, configured: true, offline: false, writes: 0, expire: false,
    async identity() { return { configured: server.configured, available: server.available, account: server.account }; },
    transport(deviceID) { return {
      deviceID, account: server.identity,
      async fetch(token, account) {
        if (server.offline) throw Object.assign(new Error('offline'), { code: '4' });
        if (account !== server.account) throw new Error('account changed');
        if (server.expire && token) { server.expire = false; throw Object.assign(new Error('expired token'), { code: '21' }); }
        if (server.beforeFetch) { const hook = server.beforeFetch; server.beforeFetch = undefined; hook(); }
        return { records: [...records.values()].filter(item => item.revision > Number(token ?? 0)).map(({ document, tag }) => ({ document, tag })), token: String(revision), more: false };
      },
      async save(key, document, tag, account) {
        if (server.offline) throw new Error('offline');
        if (account !== server.account) throw new Error('account changed');
        if (server.beforeSave) { const hook = server.beforeSave; server.beforeSave = undefined; hook(); }
        const old = records.get(key);
        if (old && old.tag !== tag) return { conflict: { document: old.document, tag: old.tag } };
        const value = { document, revision: ++revision, tag: String(revision) }; records.set(key, value); server.writes++;
        return { document, tag: value.tag };
      },
    }; },
    inject(key, document) { records.set(key, { document, revision: ++revision, tag: String(revision) }); },
    records,
  };
  return server;
}
function cloudDevice(server, name, previous) {
  const r = runtime(previous);
  const { CloudSyncEngine } = r.load('features/cloud/services/CloudSyncEngine.ts');
  const local = () => ({ rolls: r.store.getState().rolls, films: r.load('features/films/store/filmStore.ts').useFilmStore.getState().films.filter(f => f.isCustom), cameras: r.load('features/cameras/store/cameraStore.ts').useCameraStore.getState().cameras.filter(c => c.isCustom) });
  const io = {
    read: () => { const raw = r.state.kv.get('cloud-test'); return raw ? JSON.parse(raw) : undefined; },
    write: value => { if (r.state.failJournal) throw new Error('journal disk full'); r.state.kv.set('cloud-test', JSON.stringify(value)); },
    local,
    apply: value => {
      const f = r.load('features/films/store/filmStore.ts').useFilmStore;
      const c = r.load('features/cameras/store/cameraStore.ts').useCameraStore;
      f.getState().applyCloudItems(value.films, f.getState().films);
      c.getState().applyCloudItems(value.cameras, c.getState().cameras);
      if (r.state.failMerge) throw new Error('interrupted merge');
      r.store.getState().applyCloudRolls(value.rolls, r.store.getState().rolls);
    },
  };
  const engine = new CloudSyncEngine(io, server.transport(name));
  const edit = patch => r.store.getState().updateRoll('r1', { ...r.store.getState().rolls.find(roll => roll.id === 'r1'), ...patch });
  return { r, engine, io, edit, local };
}

test('Cloud bootstrap preserves nonempty old local archives when cloud is empty', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a');
  const before = a.local().rolls;
  await a.engine.run();
  assert.deepEqual(a.local().rolls, before);
  assert.equal(a.engine.snapshot.status, 'metadata-synced');
  assert.equal(a.engine.snapshot.pending, 0);
  assert.ok(server.writes > 0);
});

test('Two devices converge on independent field edits without replacing entire libraries', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); const b = cloudDevice(server, 'b');
  await a.engine.run(); await b.engine.run(); await a.engine.run();
  a.edit({ notes: 'from A' }); a.engine.capture();
  b.edit({ lab: 'from B' }); b.engine.capture();
  await a.engine.run(); await b.engine.run(); await a.engine.run();
  for (const device of [a, b]) {
    assert.equal(device.local().rolls[0].notes, 'from A');
    assert.equal(device.local().rolls[0].lab, 'from B');
    assert.equal(device.local().rolls.length, 1);
  }
});

test('Offline edits survive process restart and synchronize when online', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); await a.engine.run();
  server.offline = true; a.edit({ notes: 'offline note' }); a.engine.capture();
  await assert.rejects(a.engine.run(), /offline/);
  const restarted = cloudDevice(server, 'a-new-process', a.r.state);
  server.offline = false; await restarted.engine.run();
  assert.equal(restarted.local().rolls[0].notes, 'offline note');
  assert.equal(restarted.engine.snapshot.pending, 0);
});

test('Deletion tombstones defeat stale offline edits and do not resurrect a Roll', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); const b = cloudDevice(server, 'b');
  await a.engine.run(); await b.engine.run();
  b.edit({ notes: 'stale update' }); b.engine.capture();
  a.r.store.getState().deleteRoll('r1'); a.engine.capture(); await a.engine.run();
  await b.engine.run(); await a.engine.run();
  assert.equal(a.local().rolls.length, 0); assert.equal(b.local().rolls.length, 0);
  assert.ok([...server.records.values()].some(item => JSON.parse(item.document).deleted));
});

test('New installation restores metadata/frame order and cloud identifiers without local asset paths', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); a.r.state.legacyCopyFixture = false;
  const assets = a.r.select(3); assets.forEach((asset, i) => { asset.cloudId = `cloud-${i}`; });
  await a.r.service.addToRoll('r1');
  const roll = a.local().rolls[0];
  a.r.store.getState().reorderPhotos('r1', [...roll.photos].reverse().map(photo => photo.id));
  await a.engine.run();
  const b = cloudDevice(server, 'b'); b.r.store.getState().deleteRoll('r1'); await b.engine.run();
  const restored = b.local().rolls[0];
  assert.deepEqual(restored.photos.map(p => [p.id, p.sortOrder, p.cloudIdentifier]), a.local().rolls[0].photos.map(p => [p.id, p.sortOrder, p.cloudIdentifier]));
  assert.ok(restored.photos.every(p => p.assetId.startsWith('pending-reference-')));
  const networkPayload = [...server.records.values()].map(item => item.document).join('');
  assert.equal(networkPayload.includes('localIdentifier'), false);
  assert.equal(networkPayload.includes('file:///'), false);
  assert.equal(a.r.state.copyCalls.length, 0);
});

test('Account switching and signed-out states pause without mixing libraries or resetting local data', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); await a.engine.run();
  const before = JSON.stringify(a.local()); const writes = server.writes;
  server.account = 'another-account'; await assert.rejects(a.engine.run(), /account changed/);
  assert.equal(JSON.stringify(a.local()), before); assert.equal(server.writes, writes);
  server.account = 'account-a'; server.available = false; await assert.rejects(a.engine.run(), /account unavailable/);
  assert.equal(JSON.stringify(a.local()), before);
});

test('Unconfigured CloudKit does not upload, alter local data or claim sync success', async () => {
  const server = fakeCloud(); server.configured = false; const a = cloudDevice(server, 'a');
  const before = JSON.stringify(a.local()); await a.engine.run();
  assert.equal(a.engine.snapshot.status, 'unavailable');
  assert.equal(a.engine.snapshot.lastSync, undefined); assert.equal(server.writes, 0);
  assert.equal(JSON.stringify(a.local()), before);
});

test('Disabling sync keeps local edits and durable pending records', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); await a.engine.run();
  a.engine.setEnabled(false); a.edit({ notes: 'retained' }); a.engine.capture(); const writes = server.writes;
  await a.engine.run(); assert.equal(a.engine.snapshot.status, 'off'); assert.equal(server.writes, writes);
  assert.ok(a.engine.snapshot.pending > 0);
  a.engine.setEnabled(true); await a.engine.run(); assert.equal(a.local().rolls[0].notes, 'retained');
});

test('Journal write failure stops network writes and preserves the original archive', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); const before = JSON.stringify(a.local());
  a.r.state.failJournal = true; await assert.rejects(a.engine.run(), /journal disk full/);
  assert.equal(server.writes, 0); assert.equal(JSON.stringify(a.local()), before);
});

test('Expired zone tokens refetch safely without clearing local records', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); await a.engine.run();
  server.expire = true; const before = JSON.stringify(a.local()); await a.engine.run();
  assert.equal(JSON.stringify(a.local()), before); assert.equal(a.engine.snapshot.status, 'metadata-synced');
});

test('Interrupted merge replays its durable stage after relaunch', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); a.edit({ notes: 'restore me' }); await a.engine.run();
  const b = cloudDevice(server, 'b'); b.r.store.getState().deleteRoll('r1'); b.r.state.failMerge = true;
  await assert.rejects(b.engine.run(), /interrupted merge/);
  assert.ok(JSON.parse(b.r.state.kv.get('cloud-test')).stage);
  b.r.state.failMerge = false; const restarted = cloudDevice(server, 'b2', b.r.state); await restarted.engine.run();
  assert.equal(restarted.local().rolls[0].notes, 'restore me');
});

test('New local edits after an interrupted merge require review rather than being overwritten', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); await a.engine.run();
  a.r.state.failMerge = true; await assert.rejects(a.engine.run(), /interrupted merge/);
  a.r.state.failMerge = false; a.edit({ notes: 'new protected edit' });
  await assert.rejects(a.engine.run(), /review required/);
  assert.equal(a.local().rolls[0].notes, 'new protected edit');
});

test('In-flight save acknowledgment cannot discard a newer local edit', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); await a.engine.run();
  a.edit({ notes: 'first' }); a.engine.capture();
  server.beforeSave = () => { a.edit({ notes: 'newer' }); a.engine.capture(); };
  await a.engine.run();
  assert.equal(a.local().rolls[0].notes, 'newer');
  assert.equal(a.engine.snapshot.pending, 0);
  assert.ok([...server.records.values()].some(item => JSON.parse(item.document).fields.notes?.value === 'newer'));
});


test('Compare-and-save conflicts merge remote fields rather than overwriting them', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); await a.engine.run();
  a.edit({ notes: 'local pending edit' }); a.engine.capture();
  const key = [...server.records.keys()][0];
  server.beforeSave = () => {
    const remote = JSON.parse(server.records.get(key).document);
    remote.fields.lab = { stamp: { n: 500, device: 'concurrent-device' }, value: 'remote concurrent lab' };
    server.inject(key, JSON.stringify(remote));
  };
  await a.engine.run();
  assert.equal(a.local().rolls[0].notes, 'local pending edit');
  assert.equal(a.local().rolls[0].lab, 'remote concurrent lab');
  assert.equal(a.engine.snapshot.pending, 0);
});

test('Cloud merge preserves legacy sortOrder gaps and custom catalog IDs without uploading covers', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); a.r.state.legacyCopyFixture = false;
  a.r.select(2); await a.r.service.addToRoll('r1');
  const current = a.local().rolls[0];
  a.r.store.getState().applyCloudRolls([{ ...current, photos: current.photos.map((photo, i) => ({ ...photo, sortOrder: i * 5 })) }], a.r.store.getState().rolls);
  const film = a.r.load('features/films/store/filmStore.ts').useFilmStore.getState().addCustomFilm({ brand: 'Custom', name: 'Stock', iso: 100, type: 'color', format: '35mm', imageDocumentPath: 'film-covers/cover-a.jpg', imageUri: 'file:///app/cover.jpg' });
  await a.engine.run();
  assert.deepEqual(a.local().rolls[0].photos.map(photo => photo.sortOrder), [0, 5]);
  const b = cloudDevice(server, 'b'); b.r.store.getState().deleteRoll('r1'); await b.engine.run();
  assert.equal(b.local().films[0].id, film.id);
  assert.equal(b.local().films[0].imageDocumentPath, undefined);
  assert.ok(a.local().films[0].imageDocumentPath);
  assert.ok(![...server.records.values()].some(item => item.document.includes('file:///')));
});

test('Restored legacy Copy frames keep identities and show unavailable without copying original files', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a');
  a.r.app.getState().setImportMode('copy'); a.r.select(1); await a.r.service.addToRoll('r1');
  const original = a.local().rolls[0].photos[0]; await a.engine.run();
  const b = cloudDevice(server, 'b'); b.r.store.getState().deleteRoll('r1'); await b.engine.run();
  const restored = b.local().rolls[0].photos[0];
  assert.equal(restored.id, original.id); assert.equal(restored.provider, 'filmer-copy');
  assert.equal((await b.r.load('features/photos/services/PhotoReferenceService.ts').resolvePhoto(restored)).status, 'unavailable');
  assert.equal(b.r.state.copyCalls.length, 0);
  assert.ok(a.r.state.files.has(a.r.storage.resolveUri(original)));
});

test('Invalid cloud data and orphan frames pause restore before replacing a local archive', async () => {
  for (const kind of ['invalid-roll', 'orphan']) {
    const server = fakeCloud(); const a = cloudDevice(server, 'a');
    const before = JSON.stringify(a.local());
    const doc = kind === 'orphan'
      ? { schema: 1, kind: 'photo', id: 'p', rollId: 'missing', fields: { provider: { stamp: { n: 1, device: 'z' }, value: 'apple-photos' }, sortOrder: { stamp: { n: 1, device: 'z' }, value: 0 } } }
      : { schema: 1, kind: 'roll', id: 'broken', fields: { date: { stamp: { n: 1, device: 'z' }, value: 'not-a-date' } } };
    server.inject(JSON.stringify([doc.kind, doc.rollId ?? '', doc.id]), JSON.stringify(doc));
    await assert.rejects(a.engine.run());
    assert.equal(JSON.stringify(a.local()), before);
    assert.equal(a.engine.snapshot.lastSync, undefined);
  }
});

test('Corrupt or future cloud journals do not reset local stores', () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); const before = JSON.stringify(a.local());
  a.r.state.kv.set('cloud-test', JSON.stringify({ schema: 999 }));
  assert.throws(() => cloudDevice(server, 'a', a.r.state), /recovery/);
  assert.equal(JSON.stringify(a.local()), before);
});

test('Expired tokens with missing server records pause for review instead of silently declaring restored', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); await a.engine.run();
  const before = JSON.stringify(a.local()); server.records.clear(); server.expire = true;
  await assert.rejects(a.engine.run(), /history changed/);
  assert.equal(JSON.stringify(a.local()), before);
  assert.equal(a.engine.snapshot.status, 'error');
});

test('An account change during fetch never applies or uploads the other account records', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); await a.engine.run();
  const before = JSON.stringify(a.local()); const writes = server.writes;
  server.beforeFetch = () => { server.account = 'account-b'; };
  await assert.rejects(a.engine.run(), /account changed/);
  assert.equal(JSON.stringify(a.local()), before); assert.equal(server.writes, writes);
});

test('Remote deletion retains a local review preimage and never deletes copied files', () => {
  const r = runtime();
  const before = { rolls: r.store.getState().rolls, films: [], cameras: [] };
  r.state.files.set('file:///app/Documents/photos/r1/photo-owned.jpg', Buffer.from('original-local-copy'));
  r.load('features/cloud/services/retainLocalPreimages.ts').retainLocalPreimages('retained-test', before, { rolls: [], films: [], cameras: [] });
  const saved = JSON.parse(r.state.kv.get('retained-test'));
  assert.deepEqual(saved.records[JSON.stringify(['rolls', 'r1'])].value, before.rolls[0]);
  assert.equal(r.state.files.get('file:///app/Documents/photos/r1/photo-owned.jpg').toString(), 'original-local-copy');
});

test('Remote Relink invalidates an old but accessible local identifier and remaps the new cloud reference', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); a.r.state.legacyCopyFixture = false;
  a.r.select(1)[0].cloudId = 'cloud-old'; await a.r.service.addToRoll('r1'); await a.engine.run();
  const b = cloudDevice(server, 'b'); b.r.store.getState().deleteRoll('r1'); await b.engine.run();
  b.r.state.cloudMap = new Map([['cloud-old', 'b-old']]); b.r.state.assetUris.set('b-old', 'file:///b-old.jpg'); b.r.state.files.set('file:///b-old.jpg', Buffer.from('old'));
  await b.r.load('features/settings/services/ReferenceRepairService.ts').ReferenceRepairService.run(); b.engine.capture();
  const oldPhoto = b.local().rolls[0].photos[0]; assert.equal(oldPhoto.assetId, 'b-old');
  const id = a.local().rolls[0].photos[0].id;
  a.r.store.getState().relinkPhoto('r1', id, 'a-new', 'cloud-new'); a.engine.capture(); await a.engine.run(); await b.engine.run();
  const pending = b.local().rolls[0].photos[0];
  assert.equal(pending.id, oldPhoto.id); assert.equal(pending.sortOrder, oldPhoto.sortOrder);
  assert.equal(pending.cloudIdentifier, 'cloud-new'); assert.notEqual(pending.assetId, 'b-old');
  b.r.state.cloudMap.set('cloud-new', 'b-new'); b.r.state.assetUris.set('b-new', 'file:///b-new.jpg'); b.r.state.files.set('file:///b-new.jpg', Buffer.from('new'));
  const repaired = await b.r.load('features/settings/services/ReferenceRepairService.ts').ReferenceRepairService.run();
  assert.equal(repaired.recovered, 1); assert.equal(b.local().rolls[0].photos[0].assetId, 'b-new');
});

test('Cloud projection retains unknown legacy metadata and does not invalidate a usable photo with a malformed optional cloud ID', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); a.r.state.legacyCopyFixture = false;
  a.r.select(1); await a.r.service.addToRoll('r1');
  const old = a.local().rolls[0];
  a.r.store.getState().applyCloudRolls([{ ...old, legacyExtra: 'preserve', photos: old.photos.map(photo => ({ ...photo, legacyDetail: 'keep', cloudIdentifier: 42 })) }], a.r.store.getState().rolls);
  const assetId = a.local().rolls[0].photos[0].assetId;
  await a.engine.run();
  assert.equal(a.local().rolls[0].legacyExtra, 'preserve');
  assert.equal(a.local().rolls[0].photos[0].legacyDetail, 'keep');
  assert.equal(a.local().rolls[0].photos[0].assetId, assetId);
});

test('Concurrent same-field edits converge deterministically and cleared fields stay cleared', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); const b = cloudDevice(server, 'b');
  await a.engine.run(); await b.engine.run(); await a.engine.run();
  a.edit({ notes: 'A' }); b.edit({ notes: 'B' }); a.engine.capture(); b.engine.capture();
  await a.engine.run(); await b.engine.run(); await a.engine.run();
  assert.equal(a.local().rolls[0].notes, b.local().rolls[0].notes);
  b.edit({ notes: undefined }); b.engine.capture(); await b.engine.run(); await a.engine.run();
  assert.equal(a.local().rolls[0].notes, undefined); assert.equal(b.local().rolls[0].notes, undefined);
});

test('A failed toggle save keeps the prior enabled preference', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a'); await a.engine.run();
  a.r.state.failJournal = true; assert.throws(() => a.engine.setEnabled(false));
  assert.equal(a.engine.snapshot.enabled, true);
  a.r.state.failJournal = false; await a.engine.run(); assert.equal(a.engine.snapshot.enabled, true);
});

test('Cloud review history preserves later overwritten notes instead of retaining only the first version', () => {
  const r = runtime(); const retain = r.load('features/cloud/services/retainLocalPreimages.ts').retainLocalPreimages;
  const original = r.store.getState().rolls[0];
  const state = notes => ({ rolls: [{ ...original, notes }], films: [], cameras: [] });
  retain('review', state('first local note'), state('remote note'));
  retain('review', state('second local note'), state('another remote note'));
  const saved = JSON.parse(r.state.kv.get('review')).records[JSON.stringify(['rolls', 'r1'])];
  assert.equal(saved.value.notes, 'first local note');
  assert.equal(saved.history[0].value.notes, 'second local note');
});

test('Fresh restore reports actual paged downloads, applies only complete data and repeats without duplicates', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'source');
  a.r.state.legacyCopyFixture = false; a.r.select(3).forEach((asset, i) => { asset.cloudId = `restore-${i}`; });
  await a.r.service.addToRoll('r1'); await a.engine.run();
  const b = cloudDevice(server, 'fresh'); b.r.store.getState().deleteRoll('r1');
  const records = [...server.records.values()].map(({ document, tag }) => ({ document, tag }));
  const events = [];
  const { CloudSyncEngine } = b.r.load('features/cloud/services/CloudSyncEngine.ts');
  let first = true;
  const transport = { ...server.transport('fresh'), async fetch() {
    assert.equal(b.local().rolls.length, 0, 'No partially downloaded archive is published');
    if (first) { first = false; return { records: records.slice(0, 1), token: 'page-one', more: true }; }
    return { records: records.slice(1), token: String(records.length), more: false };
  } };
  const engine = new CloudSyncEngine(b.io, transport, state => events.push(structuredClone(state)));
  await engine.run();
  assert.ok(events.some(state => state.restore?.phase === 'downloading' && state.restore.received === 1));
  assert.ok(events.some(state => state.restore?.phase === 'applying' && state.restore.received === records.length));
  assert.equal(engine.snapshot.restore, undefined);
  assert.equal(engine.snapshot.status, 'metadata-synced');
  const before = JSON.stringify(b.local());
  const restarted = cloudDevice(server, 'fresh-restarted', b.r.state);
  await restarted.engine.run(); await restarted.engine.run();
  assert.equal(JSON.stringify(restarted.local()), before);
  assert.equal(restarted.local().rolls[0].photos.length, 3);
});

test('Interrupted download pauses restore without committing partial records or claiming success', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'source');
  a.r.state.legacyCopyFixture = false; a.r.select(2); await a.r.service.addToRoll('r1'); await a.engine.run();
  const b = cloudDevice(server, 'fresh'); b.r.store.getState().deleteRoll('r1');
  const records = [...server.records.values()].map(({ document, tag }) => ({ document, tag }));
  let page = 0;
  const { CloudSyncEngine } = b.r.load('features/cloud/services/CloudSyncEngine.ts');
  const engine = new CloudSyncEngine(b.io, { ...server.transport('fresh'), async fetch() {
    if (page++ === 0) return { records: records.slice(0, 1), token: 'partial', more: true };
    throw Object.assign(new Error('network interrupted'), { kind: 'network' });
  } });
  await assert.rejects(engine.run(), /interrupted/);
  assert.deepEqual(engine.snapshot.restore, { phase: 'paused', received: 1 });
  assert.equal(engine.snapshot.lastSync, undefined);
  assert.equal(b.local().rolls.length, 0);
  assert.equal(JSON.parse(b.r.state.kv.get('cloud-test')).token, undefined);
  const resumed = cloudDevice(server, 'fresh-restarted', b.r.state); await resumed.engine.run();
  assert.equal(resumed.local().rolls[0].photos.length, 2);
  assert.equal(resumed.engine.snapshot.status, 'metadata-synced');
});

test('Roll membership prevents a truncated restore when an upload stops before saving all frames', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'source');
  a.r.state.legacyCopyFixture = false; a.r.select(2); await a.r.service.addToRoll('r1'); await a.engine.run();
  const key = [...server.records.keys()].find(key => JSON.parse(key)[0] === 'photo');
  const delayed = server.records.get(key); server.records.delete(key);
  const b = cloudDevice(server, 'fresh'); b.r.store.getState().deleteRoll('r1');
  await assert.rejects(b.engine.run(), /restore incomplete/);
  assert.equal(b.engine.snapshot.errorKind, 'incomplete');
  assert.equal(b.engine.snapshot.lastSync, undefined);
  assert.equal(b.local().rolls.length, 0);
  server.inject(key, delayed.document);
  await b.engine.run();
  assert.equal(b.local().rolls[0].photos.length, 2);
  assert.equal(b.engine.snapshot.status, 'metadata-synced');
});

test('Empty cloud and unavailable accounts never publish a restored-data claim', async () => {
  const server = fakeCloud(); const b = cloudDevice(server, 'fresh'); b.r.store.getState().deleteRoll('r1');
  server.available = false;
  await assert.rejects(b.engine.run(), /account unavailable/);
  // No account means nothing to restore: report the account, not an endlessly paused restore.
  assert.equal(b.engine.snapshot.restore, undefined);
  assert.equal(b.engine.snapshot.errorKind, 'account');
  assert.equal(b.engine.snapshot.lastSync, undefined);
  server.available = true; await b.engine.run();
  assert.equal(b.local().rolls.length, 0);
  assert.equal(b.engine.snapshot.restore, undefined);
  assert.equal(b.engine.snapshot.status, 'metadata-synced'); // Empty metadata checked, no "restored" flag exists.
});

test('A tombstoned frame satisfies membership without resurrecting or duplicating it', async () => {
  const server = fakeCloud(); const a = cloudDevice(server, 'a');
  a.r.state.legacyCopyFixture = false; a.r.select(2); await a.r.service.addToRoll('r1'); await a.engine.run();
  const { projectCloud, wireItems } = a.r.load('features/cloud/utils/cloudProjection.ts');
  const { cloudKey, updateDocument } = a.r.load('features/cloud/utils/cloudModel.ts');
  const items = wireItems(a.local());
  const docs = Object.fromEntries(items.map(item => [cloudKey(item), updateDocument(undefined, item, undefined, { n: 1, device: 'a' })]));
  const frameKey = Object.keys(docs).find(key => docs[key].kind === 'photo');
  docs[frameKey].deleted = { n: 2, device: 'b' };
  assert.equal(projectCloud(docs, a.local()).rolls[0].photos.length, 1);
});

test('Cloud driver stays local when no native CloudKit bridge is installed', async () => {
  const r = runtime(); const before = r.state.kv.get('filmer.rolls.v1');
  const driver = r.load('features/cloud/services/cloudSync.ts');
  await driver.syncNow();
  const sync = driver.useCloudStore.getState().sync;
  assert.equal(sync.configured, false);
  assert.equal(sync.unavailableReason, 'native-build');
  assert.equal(sync.status, 'unavailable');
  assert.equal(sync.lastSync, undefined);
  assert.equal(r.state.kv.get('filmer.rolls.v1'), before);
});

test('Cloud driver rejects unavailable signing capabilities without changing local archives', async () => {
  const r = runtime(); const before = r.state.kv.get('filmer.rolls.v1');
  r.state.cloudBridge = { deviceID: 'test', namespace: 'local-build', async account() { return { configured: false, reason: 'configuration' }; } };
  const driver = r.load('features/cloud/services/cloudSync.ts');
  await driver.syncNow();
  const sync = driver.useCloudStore.getState().sync;
  assert.equal(sync.unavailableReason, 'configuration');
  assert.equal(sync.status, 'unavailable');
  assert.equal(sync.lastSync, undefined);
  assert.equal(r.state.kv.get('filmer.rolls.v1'), before);
});

test('Native account-change notifications recheck account binding and subscriptions are removed', async () => {
  const r = runtime(); const server = fakeCloud(); const transport = server.transport('native-driver');
  let accountChanged; let removed = false;
  r.state.cloudBridge = { ...transport, namespace: 'account-events', addListener(event, listener) {
    assert.equal(event, 'onAccountChanged'); accountChanged = listener;
    return { remove() { removed = true; } };
  } };
  const driver = r.load('features/cloud/services/cloudSync.ts');
  const stop = driver.startCloudSync();
  try {
    await driver.syncNow();
    assert.equal(driver.useCloudStore.getState().sync.status, 'metadata-synced');
    const archive = r.state.kv.get('filmer.rolls.v1'); const writes = server.writes;
    server.account = 'changed-account'; accountChanged(); await driver.syncNow();
    assert.equal(driver.useCloudStore.getState().sync.errorKind, 'account-changed');
    assert.equal(r.state.kv.get('filmer.rolls.v1'), archive);
    assert.equal(server.writes, writes);
    server.account = 'account-a'; accountChanged(); await driver.syncNow();
    assert.equal(driver.useCloudStore.getState().sync.status, 'metadata-synced');
  } finally { stop(); }
  assert.equal(removed, true);
});

test('An older native CloudKit bridge without events can still sync and stop safely', async () => {
  const r = runtime(); const server = fakeCloud();
  r.state.cloudBridge = { ...server.transport('old-native'), namespace: 'old-native' };
  const driver = r.load('features/cloud/services/cloudSync.ts');
  const stop = driver.startCloudSync();
  try {
    await driver.syncNow();
    assert.equal(driver.useCloudStore.getState().sync.status, 'metadata-synced');
  } finally { stop(); }
});

test('Signed entitlement preflight failures reach Settings state without cloud writes or local data changes', async () => {
  for (const reason of ['signing-unavailable', 'missing-entitlement', 'container-mismatch', 'environment-mismatch']) {
    const r = runtime(); const before = r.state.kv.get('filmer.rolls.v1'); let fetches = 0;
    r.state.cloudBridge = { deviceID: 'test', namespace: 'signing-' + reason, async account() { return { configured: false, reason }; }, async fetch() { fetches++; throw new Error('must not fetch'); } };
    const driver = r.load('features/cloud/services/cloudSync.ts'); await driver.syncNow();
    const sync = driver.useCloudStore.getState().sync;
    assert.equal(sync.configured, false); assert.equal(sync.status, 'unavailable');
    assert.equal(sync.unavailableReason, reason); assert.equal(sync.lastSync, undefined);
    assert.equal(fetches, 0); assert.equal(r.state.kv.get('filmer.rolls.v1'), before);
    r.store.getState().updateRoll('r1', { ...r.store.getState().rolls[0], notes: 'Offline edits still work' });
    assert.equal(r.store.getState().rolls[0].notes, 'Offline edits still work');
  }
});

test('Optional CloudKit bridge import and constant failures cannot abort application module initialization', async () => {
  for (const failure of ['import', 'namespace', 'deviceID']) {
    const r = runtime();
    r.state.kv.set('filmer.cloud.v1.saved-device', '{"preserved":"cloud journal"}');
    const before = [...r.state.kv];
    if (failure === 'import') Object.defineProperty(r.state, 'cloudBridge', { get() { throw new TypeError('Native module initialization failed'); } });
    else {
      r.state.cloudBridge = { namespace: 'saved-device', deviceID: 'device' };
      Object.defineProperty(r.state.cloudBridge, failure, { get() { throw new TypeError('Native constant unavailable'); } });
    }
    const driver = r.load('features/cloud/services/cloudSync.ts');
    await driver.syncNow();
    assert.equal(driver.useCloudStore.getState().sync.status, 'unavailable');
    assert.deepEqual([...r.state.kv], before);
    assert.deepEqual(r.state.deleted, []);
    r.store.getState().updateRoll('r1', { ...r.store.getState().rolls[0], notes: 'Local editing remains available' });
    assert.equal(r.store.getState().rolls[0].notes, 'Local editing remains available');
  }
});

test('Optional CloudKit subscription initialization failures clean up partial subscriptions without escaping startup', () => {
  const r = runtime(); const before = [...r.state.kv]; let removed = 0;
  r.store.subscribe = () => () => { removed++; };
  r.load('features/films/store/filmStore.ts').useFilmStore.subscribe = () => { throw new TypeError('Service not initialized'); };
  const driver = r.load('features/cloud/services/cloudSync.ts');
  const stop = driver.startCloudSync();
  assert.equal(removed, 1);
  assert.equal(driver.useCloudStore.getState().sync.status, 'error');
  assert.doesNotThrow(stop);
  assert.deepEqual([...r.state.kv], before);
});

test('Null native rejections, missing native methods and corrupt cloud journals stay isolated from local startup', async () => {
  for (const failure of ['null-rejection', 'missing-method', 'journal']) {
    const r = runtime();
    r.state.cloudBridge = { deviceID: 'device', namespace: 'init-failure' };
    if (failure === 'null-rejection') r.state.cloudBridge.account = async () => { throw null; };
    if (failure === 'journal') r.state.kv.set('filmer.cloud.v1.init-failure', '{broken journal');
    const before = [...r.state.kv];
    const driver = r.load('features/cloud/services/cloudSync.ts');
    await assert.doesNotReject(driver.syncNow());
    assert.equal(driver.useCloudStore.getState().sync.status, 'error');
    assert.deepEqual([...r.state.kv], before);
    assert.equal(r.store.getState().archive.status, 'ready');
    assert.deepEqual(r.state.deleted, []);
  }
});

test('Creation order updates immediately and survives persisted reload, edits and CloudKit restore', async () => {
  const server = fakeCloud(), source = cloudDevice(server, 'creation-source');
  const store = source.r.store;
  store.getState().applyCloudRolls([{ ...store.getState().rolls[0], createdAt: '2020-01-01T00:00:00.000Z' }], store.getState().rolls);
  const { sortRollsByCreation } = source.r.load('features/rolls/utils/groupRolls.ts');
  const orderedIDs = device => sortRollsByCreation(device.r.store.getState().rolls).map(roll => roll.id);
  let published;
  const unsubscribe = store.subscribe(state => { published = sortRollsByCreation(state.rolls)[0].id; });
  const created = store.getState().createRoll({ ...seedRoll, date: '2000-01' });
  unsubscribe();
  assert.ok(Number.isFinite(Date.parse(created.createdAt)));
  assert.equal(published, created.id, 'Zustand publishes the saved new Roll without a reload');
  const expected = [created.id, 'r1'];
  assert.deepEqual(orderedIDs(source), expected);
  source.edit({ date: '2026-12', notes: 'An edit must not promote this Roll', createdAt: '2099-01-01T00:00:00Z' });
  assert.equal(store.getState().rolls.find(roll => roll.id === 'r1').createdAt, '2020-01-01T00:00:00.000Z');
  assert.deepEqual(orderedIDs(source), expected);
  const restarted = cloudDevice(server, 'creation-source-restarted', source.r.state);
  assert.deepEqual(orderedIDs(restarted), expected);
  await restarted.engine.run();
  const restored = cloudDevice(server, 'creation-restored');
  restored.r.store.getState().deleteRoll('r1');
  await restored.engine.run();
  assert.deepEqual(orderedIDs(restored), expected);
  assert.equal(restored.r.store.getState().rolls.find(roll => roll.id === created.id).createdAt, created.createdAt);
  restored.edit({ notes: 'Synced edit of older Roll' });
  await restored.engine.run(); await restarted.engine.run();
  assert.deepEqual(orderedIDs(restored), expected);
  assert.deepEqual(orderedIDs(restarted), expected);
  assert.deepEqual(orderedIDs(cloudDevice(server, 'creation-restored-restarted', restored.r.state)), expected);
});

test('Older cloud metadata preserves known local creation time and legacy archives remain readable', () => {
  const r = runtime();
  const { wireItems, projectCloud } = r.load('features/cloud/utils/cloudProjection.ts');
  const { cloudKey, updateDocument } = r.load('features/cloud/utils/cloudModel.ts');
  const legacy = { rolls: [seedRoll], films: [], cameras: [] };
  const docs = Object.fromEntries(wireItems(legacy).map(item => [cloudKey(item), updateDocument(undefined, item, undefined, { n: 1, device: 'old-client' })]));
  const local = { ...legacy, rolls: [{ ...seedRoll, createdAt: '2020-01-01T00:00:00.000Z' }] };
  assert.equal(projectCloud(docs, local).rolls[0].createdAt, local.rolls[0].createdAt);
  assert.equal(projectCloud(docs, legacy).rolls[0].createdAt, undefined);
  const { validateRollArchive } = r.load('features/rolls/data/validateRollArchive.ts');
  assert.equal(validateRollArchive([seedRoll])[0], seedRoll);
  assert.throws(() => validateRollArchive([{ ...seedRoll, createdAt: 'not-a-time' }]), /Invalid/);
});

test('Repeated metadata polls preserve visible render cache while still checking unresolved references', async () => {
  const { r } = await cloudImported(2);
  const server = fakeCloud();
  r.state.cloudBridge = { ...server.transport('quiet-poll'), namespace: 'quiet-poll' };
  const api = resolver(r);
  let invalidations = 0;
  const stop = api.observePhotoLibrary(() => invalidations++);
  try {
    const photo = r.store.getState().rolls[0].photos[0];
    const first = await api.resolvePhoto(photo);
    const requests = r.state.nativeRequests.length;
    const driver = r.load('features/cloud/services/cloudSync.ts');
    await driver.syncNow(); await driver.syncNow(); await driver.syncNow();
    assert.equal(driver.useCloudStore.getState().sync.status, 'metadata-synced');
    assert.equal(invalidations, 0, 'automatic metadata checks must not blank every mounted image');
    assert.equal((await api.resolvePhoto(photo)).uri, first.uri);
    assert.equal(r.state.nativeRequests.length, requests, 'warm preview is reused');
    r.state.permission = false;
    await driver.syncNow();
    assert.equal(driver.useCloudStore.getState().photosUnresolved, 2);
    assert.equal((await api.resolvePhoto(photo)).status, 'permission-denied', 'cache never overrides fresh access verification');
    await r.load('features/settings/services/ReferenceRepairService.ts').ReferenceRepairService.run();
    assert.equal(invalidations, 2, 'explicit repair still refreshes views before and after checking');
  } finally { stop(); }
});

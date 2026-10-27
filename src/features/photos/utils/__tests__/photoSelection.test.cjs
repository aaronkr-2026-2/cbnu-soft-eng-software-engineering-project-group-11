const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');
const src = path.resolve(__dirname, '../../../..');

function load(relative, mocks = {}) {
  const filename = path.resolve(src, relative);
  const module = new Module(filename);
  module.filename = filename; module.paths = Module._nodeModulePaths(path.dirname(filename));
  module.require = name => {
    if (name in mocks) return mocks[name];
    if (name === 'react-native') return { Dimensions: { get: () => ({ width: 390, height: 844 }) }, PixelRatio: { get: () => 3 } };
    if (!name.startsWith('.')) return require(name);
    const base = path.resolve(path.dirname(filename), name);
    return load(path.relative(src, base + (fs.existsSync(base + '.ts') ? '.ts' : '.tsx')), mocks);
  };
  const extra = filename.endsWith('ReorderablePhotoGrid.tsx') ? '\nexport { PhotoTile };' : '';
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8') + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return module.exports;
}

// Deterministic hook/callback checks, not a substitute for native recognizer arbitration tests.
function hookRunner() {
  const values = [], dependencies = [], cleanups = []; let cursor = 0, effects = [];
  const changed = (i, deps) => !dependencies[i] || !deps || deps.some((value, index) => !Object.is(value, dependencies[i][index]));
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial;
      return [values[i], next => { values[i] = typeof next === 'function' ? next(values[i]) : next; }]; },
    useRef(initial) { const i = cursor++; if (!(i in values)) values[i] = { current: initial }; return values[i]; },
    useMemo(fn, deps) { const i = cursor++; if (changed(i, deps)) { values[i] = fn(); dependencies[i] = deps; } return values[i]; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (changed(i, deps)) { dependencies[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); }); } },
    memo: fn => fn,
  };
  return { hooks, render(fn) { cursor = 0; effects = []; const result = fn(); effects.forEach(effect => effect()); return result; } };
}

const photos = Array.from({ length: 36 }, (_, index) => ({ id: String(index), sortOrder: index }));
const utils = load('features/photos/utils/photoSelection.ts');

test('Selection utility uses persisted photo order, never Set insertion order', () => {
  const selected = new Set(['10', '2', '0']);
  assert.deepEqual(utils.orderedSelectedPhotos([...photos].reverse(), selected).map(p => p.id), ['0', '2', '10']);
});

test('Grid hit testing excludes gaps, outside coordinates, empty last cells and the add slot', () => {
  assert.equal(utils.photoIndexAtPoint(10, 10, 100, 8, 36), 0);
  assert.equal(utils.photoIndexAtPoint(120, 120, 100, 8, 36), 4);
  assert.equal(utils.photoIndexAtPoint(104, 10, 100, 8, 36), -1);
  assert.equal(utils.photoIndexAtPoint(10, 104, 100, 8, 36), -1);
  assert.equal(utils.photoIndexAtPoint(-1, 0, 100, 8, 36), -1);
  assert.equal(utils.photoIndexAtPoint(400, 0, 100, 8, 36), -1);
  assert.equal(utils.photoIndexAtPoint(120, 10, 100, 8, 1), -1);
  assert.equal(utils.photoIndexAtPoint(0, 0, 0, 8, 36), -1);
});

test('Selection drag fails early for vertical/diagonal swipes and activates only deliberate horizontal movement', () => {
  for (const dy of [7, -7, 20, -20, 150]) assert.equal(utils.selectionDragIntent(0, dy), 'scroll');
  assert.equal(utils.selectionDragIntent(8, 8), 'scroll');
  assert.equal(utils.selectionDragIntent(-10, 2), 'select');
  assert.equal(utils.selectionDragIntent(10, -2), 'select');
  assert.equal(utils.selectionDragIntent(2, 2), 'wait');
});

test('Local selection supports tap toggling, additive ranges, Select All, deselect and exit', () => {
  const runner = hookRunner();
  const { usePhotoSelection } = load('features/photos/hooks/usePhotoSelection.ts', { react: runner.hooks });
  let currentPhotos = photos;
  const render = () => runner.render(() => usePhotoSelection(currentPhotos));
  let selection = render();
  selection.enter(); selection = render(); assert.equal(selection.selectionMode, true);
  selection.toggle('2'); selection = render(); assert.equal(selection.selectedPhotos.length, 1);
  selection.toggle('2'); selection = render(); assert.equal(selection.selectedPhotos.length, 0);
  selection.addRange(0, 10); selection = render(); assert.equal(selection.selectedPhotos.length, 11);
  const previous = selection.selectedIds;
  selection.addRange(3, 8); selection = render(); assert.equal(selection.selectedIds, previous, 'crossing selected cells must not toggle or publish a duplicate set');
  selection.toggleAll(); selection = render(); assert.equal(selection.selectedPhotos.length, 36); assert.equal(selection.allSelected, true);
  selection.toggle('5'); selection = render(); assert.equal(selection.selectedPhotos.length, 35);
  selection.toggleAll(); selection = render(); assert.equal(selection.selectedPhotos.length, 36);
  selection.toggleAll(); selection = render(); assert.equal(selection.selectedPhotos.length, 0);
  selection.addRange(0, 3); selection = render(); currentPhotos = photos.slice(2); render(); selection = render();
  assert.deepEqual([...selection.selectedIds], ['2', '3']);
  selection.exit(); selection = render(); assert.equal(selection.selectionMode, false); assert.equal(selection.selectedIds.size, 0);
  selection.addRange(0, 30); selection.toggle('2'); selection = render(); assert.equal(selection.selectedIds.size, 0, 'late gesture callbacks after exit are ignored');
});

function gestureRuntime() {
  const runner = hookRunner(); let gestures = []; let resolutions = 0;
  const gesture = kind => {
    const config = { kind };
    const proxy = new Proxy(config, { get: (target, key) => key in target ? target[key] : (...args) => { target[key] = args[0]; return proxy; } });
    gestures.push(config); return proxy;
  };
  const mocks = {
    react: runner.hooks,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', Image: 'Image', Text: 'Text', StyleSheet: { create: value => value, absoluteFill: {} } },
    'react-native-gesture-handler': { Gesture: { Pan: () => gesture('pan'), Tap: () => gesture('tap'), LongPress: () => gesture('hold'),
      Simultaneous: (...children) => ({ kind: 'simultaneous', children }), Exclusive: (...children) => ({ kind: 'exclusive', children }) }, GestureDetector: 'detector' },
    'react-native-reanimated': { View: 'animated-view', useSharedValue: value => runner.hooks.useRef(value === undefined ? undefined : { value }).current,
      useAnimatedReaction: () => {}, useAnimatedStyle: fn => fn(), withSpring: value => value, withTiming: value => value },
    'react-native-worklets': { scheduleOnRN: (fn, ...args) => fn(...args) },
    'expo-haptics': { ImpactFeedbackStyle: { Medium: 'medium' }, impactAsync: () => Promise.resolve(), selectionAsync: () => Promise.resolve() },
    '../../../constants/theme': { useThemedStyles: () => ({}), spacing: { sm: 8 } },
    '../../../i18n/useTranslation': { useTranslation: () => ({ t: key => key }) },
    '../hooks/useResolvedPhoto': { renderPixels: value => value * 3, useResolvedPhoto: () => { runner.hooks.useMemo(() => { resolutions++; }, []); return { uri: 'file:///photo.jpg', status: 'ready', failed() {} }; } },
    './PhotoResolutionStatus': { PhotoResolutionStatus: 'status' },
  };
  return { runner, mocks, load: relative => load(relative, mocks), render(fn) { gestures = []; return runner.render(fn); },
    get gestures() { return gestures; }, get resolutions() { return resolutions; } };
}

test('Repeated vertical swipes, gap starts and quick taps fail selection Pan without disabling scroll', () => {
  for (let repeat = 0; repeat < 20; repeat++) {
    const r = gestureRuntime();
    const { usePhotoSelectionGesture } = r.load('features/photos/hooks/usePhotoSelectionGesture.ts');
    const ranges = [], scrolling = [];
    r.render(() => usePhotoSelectionGesture(true, 100, 36, (...range) => ranges.push(range), value => scrolling.push(value)));
    const pan = r.gestures[0]; let failed = 0, activated = 0;
    const state = { fail: () => failed++, activate: () => activated++ };
    const touch = (x, y) => ({ allTouches: [{ x, y }] });
    pan.onTouchesDown(touch(10, 10), state);
    pan.onTouchesMove(touch(10, 17), state);
    assert.equal(failed, 1); assert.equal(activated, 0);
    pan.onTouchesDown(touch(10, 30), state);
    pan.onTouchesMove(touch(10, 20), state);
    assert.equal(failed, 2);
    pan.onTouchesDown(touch(104, 10), state); assert.equal(failed, 3);
    pan.onTouchesDown(touch(10, 10), state); pan.onTouchesUp({}, state); assert.equal(failed, 4);
    assert.deepEqual(ranges, []); assert.deepEqual(scrolling, []);
    assert.equal(pan.manualActivation, true); assert.equal(pan.activateAfterLongPress, undefined);
  }
});

test('Horizontal selection drag adds crossed ranges once per slot, then releases scroll on finalize', () => {
  const r = gestureRuntime(); const ranges = [], scrolling = [];
  const { usePhotoSelectionGesture } = r.load('features/photos/hooks/usePhotoSelectionGesture.ts');
  r.render(() => usePhotoSelectionGesture(true, 100, 36, (...range) => ranges.push(range), value => scrolling.push(value)));
  const pan = r.gestures[0]; let activated = 0;
  const state = { fail: () => assert.fail('horizontal drag failed'), activate: () => activated++ };
  pan.onTouchesDown({ allTouches: [{ x: 10, y: 10 }] }, state);
  pan.onTouchesMove({ allTouches: [{ x: 20, y: 11 }] }, state);
  assert.equal(activated, 1); pan.onStart();
  for (let frame = 0; frame < 100; frame++) pan.onUpdate({ x: 120, y: 10 });
  pan.onUpdate({ x: 230, y: 230 }); pan.onUpdate({ x: 120, y: 10 });
  assert.deepEqual(ranges, [[0, 0], [0, 1], [1, 8], [1, 8]]);
  assert.deepEqual(scrolling, [true]); pan.onFinalize(); assert.deepEqual(scrolling, [true, false]);
});

test('Selected thumbnails only toggle selection, disable reorder, and cache URI resolution across selection changes', () => {
  const r = gestureRuntime(); const { PhotoTile } = r.load('features/photos/components/ReorderablePhotoGrid.tsx');
  let opened = 0, toggled = 0, reordered = 0;
  const selectionGesture = { kind: 'selection-pan' };
  const props = { photo: photos[0], initialIndex: 0, size: 100, count: 36, positions: { value: { 0: 0 } },
    onPhotoPress: () => opened++, onDraggingChange: () => {}, onDrop: () => reordered++, onAccessibleMove: () => reordered++,
    selecting: true, selected: false, onToggleSelection: () => toggled++, selectionGesture, interactionDisabled: false };
  let tree = r.render(() => PhotoTile(props));
  assert.equal(tree.props.gesture.kind, 'tap');
  const tap = r.gestures.find(g => g.kind === 'tap');
  assert.equal(tap.requireExternalGestureToFail, selectionGesture);
  assert.equal(r.gestures.find(g => g.kind === 'hold').enabled, false);
  assert.equal(r.gestures.find(g => g.kind === 'pan').enabled, false);
  tap.onEnd({}, false); assert.equal(toggled, 0);
  tap.onEnd({}, true); assert.equal(toggled, 1); assert.equal(opened, 0);
  tree = r.render(() => PhotoTile({ ...props, selected: true }));
  assert.equal(r.resolutions, 1);
  assert.equal(tree.props.children.props.accessibilityRole, 'checkbox');
  assert.equal(tree.props.children.props.accessibilityState.checked, true);
  tree.props.children.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
  assert.equal(reordered, 0);
});

test('Browse retains successful photo taps and early-failing reorder Pan; busy selection disables taps', () => {
  const r = gestureRuntime(); const { PhotoTile } = r.load('features/photos/components/ReorderablePhotoGrid.tsx'); let opened = 0;
  const props = { photo: photos[0], initialIndex: 0, size: 100, count: 36, positions: { value: { 0: 0 } },
    onPhotoPress: () => opened++, onDraggingChange: () => {}, onDrop: () => {}, onAccessibleMove: () => {},
    selecting: false, selected: false, selectionGesture: {}, interactionDisabled: false };
  r.render(() => PhotoTile(props));
  assert.equal(r.gestures.find(g => g.kind === 'hold').minDuration, 250);
  assert.equal(r.gestures.find(g => g.kind === 'hold').enabled, true);
  r.gestures.find(g => g.kind === 'tap').onEnd({}, true); assert.equal(opened, 1);
  const pan = r.gestures.find(g => g.kind === 'pan'); let failed = 0;
  pan.onTouchesDown({ allTouches: [{ absoluteX: 10, absoluteY: 10 }] });
  pan.onTouchesMove({ allTouches: [{ absoluteX: 10, absoluteY: 25 }] }, { fail: () => failed++, activate: () => assert.fail('early swipe activated reorder') });
  assert.equal(failed, 1);
  r.render(() => PhotoTile({ ...props, selecting: true, interactionDisabled: true }));
  assert.equal(r.gestures.find(g => g.kind === 'tap').enabled, false);
});

test('Photo resolution UI clears stale images on library change, ignores old requests and allows Retry', async () => {
  const runner=hookRunner(); const pending=[]; let changed;
  const api={
    observePhotoLibrary: listener=>{changed=listener;return ()=>{};},
    invalidatePhotoRenders: ()=>changed(),
    resolvePhoto: (_photo,size)=>new Promise(resolve=>pending.push({resolve,size})),
  };
  const {useResolvedPhoto}=load('features/photos/hooks/useResolvedPhoto.ts',{
    react:runner.hooks,'../services/PhotoReferenceService':api,
    '../../../store/app-store': { useAppStore: selector => selector({ photoQuality: 'optimized' }) },
  });
  const photo={id:'p',provider:'apple-photos',assetId:'asset',sortOrder:0};
  const render=()=>runner.render(()=>useResolvedPhoto(photo,'thumbnail'));
  assert.equal(render().status,'loading'); assert.equal(pending[0].size,'thumbnail');
  pending[0].resolve({status:'ready',uri:'file:///render.jpg'}); await Promise.resolve();
  assert.equal(render().uri,'file:///render.jpg');
  changed(); assert.equal(render().uri,undefined); assert.equal(render().status,'loading');
  // A second library notification cancels the obsolete pending result.
  changed(); render(); pending[2].resolve({status:'unavailable'}); await Promise.resolve();
  pending[1].resolve({status:'ready',uri:'file:///obsolete.jpg'}); await Promise.resolve();
  const unavailable=render(); assert.equal(unavailable.status,'unavailable'); assert.equal(unavailable.uri,undefined);
  unavailable.retry(); assert.equal(render().status,'loading');
  pending[3].resolve({status:'ready',uri:'file:///relinked.jpg'}); await Promise.resolve();
  assert.equal(render().uri,'file:///relinked.jpg');
  render().failed(); assert.equal(render().status,'temporary-error'); assert.equal(render().uri,undefined);
});


test('Viewer loads thumbnail, screen, then bounded high quality; neighbours stop at screen size', async () => {
  const runner = hookRunner(); let quality = 'optimized'; const requests = [];
  const { useResolvedPhoto } = load('features/photos/hooks/useResolvedPhoto.ts', {
    react: runner.hooks,
    '../../../store/app-store': { useAppStore: selector => selector({ photoQuality: quality }) },
    '../services/PhotoReferenceService': {
      observePhotoLibrary: () => () => {}, invalidatePhotoRenders: () => {},
      resolvePhoto: async (photo, size, pixels) => { requests.push({ size, pixels }); return { status: 'ready', uri: String(pixels) }; },
    },
  });
  const photo = { id: 'p', provider: 'apple-photos', assetId: 'a', sortOrder: 0 };
  const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  runner.render(() => useResolvedPhoto(photo, 'full')); await flush();
  assert.deepEqual(requests, [{ size: 'thumbnail', pixels: 512 }, { size: 'thumbnail', pixels: 2560 }]);
  quality = 'high'; requests.length = 0;
  runner.render(() => useResolvedPhoto(photo, 'full')); await flush();
  assert.deepEqual(requests.map(r => r.pixels), [512, 2560, 4096]);
  assert.ok(requests.every(r => r.size === 'thumbnail'), 'Viewer never requests original size');
  requests.length = 0;
  runner.render(() => useResolvedPhoto(photo, 'full', 512, false)); await flush();
  assert.deepEqual(requests.map(r => r.pixels), [512, 2560]);
});

test('Rapid navigation cancels old work and cannot publish out-of-order images or restart on caption edits', async () => {
  const runner = hookRunner(); const pending = [];
  const { useResolvedPhoto } = load('features/photos/hooks/useResolvedPhoto.ts', {
    react: runner.hooks,
    '../../../store/app-store': { useAppStore: selector => selector({ photoQuality: 'optimized' }) },
    '../services/PhotoReferenceService': {
      observePhotoLibrary: () => () => {}, invalidatePhotoRenders: () => {},
      resolvePhoto: (photo, size, pixels, signal) => new Promise(resolve => pending.push({ photo, resolve, signal })),
    },
  });
  let photo = { id: 'a', provider: 'apple-photos', assetId: 'a', sortOrder: 0 };
  const render = () => runner.render(() => useResolvedPhoto(photo));
  const oldFailure = render().failed; photo = { ...photo, note: 'caption', sortOrder: 5 }; render();
  assert.equal(pending.length, 1);
  photo = { ...photo, id: 'b', assetId: 'b' }; render();
  assert.equal(pending[0].signal.aborted, true);
  pending[1].resolve({ status: 'ready', uri: 'b' }); await Promise.resolve();
  pending[0].resolve({ status: 'ready', uri: 'a' }); await Promise.resolve();
  assert.equal(render().uri, 'b');
  oldFailure(); assert.equal(render().uri, 'b', 'a late decode failure from the previous frame cannot clear the current frame');
});

test('Progressive upgrade preserves preview on transient failures but removes it on missing-original results', async () => {
  for (const status of ['temporary-error', 'unavailable', 'permission-denied', 'limited']) {
    const runner = hookRunner(); const pending = [];
    const { useResolvedPhoto } = load('features/photos/hooks/useResolvedPhoto.ts', {
      react: runner.hooks,
      '../../../store/app-store': { useAppStore: selector => selector({ photoQuality: 'optimized' }) },
      '../services/PhotoReferenceService': {
        observePhotoLibrary: () => () => {}, invalidatePhotoRenders: () => {},
        resolvePhoto: () => new Promise(resolve => pending.push(resolve)),
      },
    });
    const photo = { id: 'a', provider: 'apple-photos', assetId: 'a', sortOrder: 0 };
    const render = () => runner.render(() => useResolvedPhoto(photo, 'full'));
    render(); pending[0]({ status: 'ready', uri: 'preview' }); await Promise.resolve();
    assert.equal(render().uri, 'preview');
    pending[1]({ status }); await Promise.resolve();
    assert.equal(render().uri, status === 'temporary-error' ? 'preview' : undefined);
  }
});


test('Grid window preserves original frame indices and limits mounted cells around the viewport', () => {
  const r = gestureRuntime();
  const { ReorderablePhotoGrid } = r.load('features/photos/components/ReorderablePhotoGrid.tsx');
  const many = Array.from({ length: 1000 }, (_, index) => ({ id: String(index), sortOrder: index }));
  let viewport = { top: 0, height: 600 };
  const props = { photos: many, onPhotoPress() {}, onReorder() {}, onDraggingChange() {}, onAdd() {} };
  const grid = () => r.render(() => ReorderablePhotoGrid({ ...props, viewport })).props.children[1].props.children;
  grid().props.onLayout({ nativeEvent: { layout: { width: 320, y: 200 } } });
  const initial = grid().props.children[0];
  assert.equal(initial.length, 30); assert.equal(initial[0].props.initialIndex, 0);
  viewport = { top: 3000, height: 600 };
  const scrolled = grid().props.children[0];
  assert.equal(scrolled.length, 51); assert.ok(scrolled[0].props.initialIndex > 0);
  assert.ok(scrolled.every(cell => cell.props.photo.id === String(cell.props.initialIndex)));
  viewport = undefined; assert.equal(grid().props.children[0].length, 1000, 'callers without a viewport retain compatibility');
});

test('A late thumbnail decode error cannot clear the upgraded viewer source', async () => {
  const runner = hookRunner(), pending = [];
  const { useResolvedPhoto } = load('features/photos/hooks/useResolvedPhoto.ts', {
    react: runner.hooks,
    '../../../store/app-store': { useAppStore: selector => selector({ photoQuality: 'optimized' }) },
    '../services/PhotoReferenceService': {
      observePhotoLibrary: () => () => {}, invalidatePhotoRenders() {},
      resolvePhoto: () => new Promise(resolve => pending.push(resolve)),
    },
  });
  const photo = { id: 'a', provider: 'apple-photos', assetId: 'a', sortOrder: 0 };
  const render = () => runner.render(() => useResolvedPhoto(photo, 'full'));
  render(); pending[0]({ status: 'ready', uri: 'preview' }); await Promise.resolve();
  const previewFailure = render().failed;
  pending[1]({ status: 'ready', uri: 'screen' }); await Promise.resolve();
  previewFailure(); assert.equal(render().uri, 'screen');
  render().failed(); assert.equal(render().status, 'temporary-error');
});

test('Foreground revalidation keeps the same visible thumbnail and render key until a verified replacement is ready', async () => {
  const runner = hookRunner(), pending = []; let changed;
  const { useResolvedPhoto } = load('features/photos/hooks/useResolvedPhoto.ts', {
    react: runner.hooks,
    '../services/PhotoReferenceService': {
      observePhotoLibrary: listener => { changed = listener; return () => {}; }, invalidatePhotoRenders: () => changed('invalidate'),
      resolvePhoto: () => new Promise(resolve => pending.push(resolve)),
    },
    '../../../store/app-store': { useAppStore: select => select({ photoQuality: 'optimized' }) },
  });
  const photo = { id: 'p', provider: 'apple-photos', assetId: 'asset', sortOrder: 0 };
  const render = () => runner.render(() => useResolvedPhoto(photo));
  render(); pending[0]({ status: 'ready', uri: 'file:///preview.jpg' }); await Promise.resolve();
  const key = render().renderKey;
  changed('refresh');
  assert.equal(render().uri, 'file:///preview.jpg'); assert.equal(render().renderKey, key);
  pending[1]({ status: 'ready', uri: 'file:///preview.jpg' }); await Promise.resolve();
  assert.equal(render().uri, 'file:///preview.jpg'); assert.equal(render().renderKey, key);
  changed('refresh'); render(); pending[2]({ status: 'temporary-error' }); await Promise.resolve();
  assert.equal(render().uri, 'file:///preview.jpg', 'transient revalidation failure must not blank the image');
  changed('refresh'); render(); pending[3]({ status: 'permission-denied' }); await Promise.resolve();
  assert.equal(render().uri, undefined); assert.equal(render().status, 'permission-denied');
});

test('Library changes during foreground validation hide old pixels and stale foreground completions cannot restore them', async () => {
  const runner = hookRunner(), pending = []; let changed;
  const { useResolvedPhoto } = load('features/photos/hooks/useResolvedPhoto.ts', {
    react: runner.hooks,
    '../services/PhotoReferenceService': {
      observePhotoLibrary: listener => { changed = listener; return () => {}; }, invalidatePhotoRenders: () => {},
      resolvePhoto: () => new Promise(resolve => pending.push(resolve)),
    },
    '../../../store/app-store': { useAppStore: select => select({ photoQuality: 'optimized' }) },
  });
  const render = () => runner.render(() => useResolvedPhoto({ id: 'p', provider: 'apple-photos', assetId: 'asset', sortOrder: 0 }));
  render(); pending[0]({ status: 'ready', uri: 'old' }); await Promise.resolve();
  const key = render().renderKey;
  changed('refresh'); assert.equal(render().uri, 'old');
  changed('invalidate'); assert.equal(render().uri, undefined); assert.notEqual(render().renderKey, key);
  pending[1]({ status: 'ready', uri: 'obsolete-refresh' }); await Promise.resolve();
  assert.equal(render().uri, undefined);
  pending[2]({ status: 'unavailable' }); await Promise.resolve();
  assert.equal(render().status, 'unavailable'); assert.equal(render().uri, undefined);
});

test('High-quality viewer foreground checks do not downgrade the displayed image through thumbnail and screen tiers', async () => {
  const runner = hookRunner(), pending = []; let changed;
  const { useResolvedPhoto } = load('features/photos/hooks/useResolvedPhoto.ts', {
    react: runner.hooks,
    '../services/PhotoReferenceService': {
      observePhotoLibrary: listener => { changed = listener; return () => {}; }, invalidatePhotoRenders: () => {},
      resolvePhoto: () => new Promise(resolve => pending.push(resolve)),
    },
    '../../../store/app-store': { useAppStore: select => select({ photoQuality: 'high' }) },
  });
  const photo = { id: 'p', provider: 'apple-photos', assetId: 'asset', sortOrder: 0 };
  const render = () => runner.render(() => useResolvedPhoto(photo, 'full'));
  render();
  for (let i = 0; i < 3; i++) { pending[i]({ status: 'ready', uri: ['thumb', 'screen', 'high'][i] }); await Promise.resolve(); }
  assert.equal(render().uri, 'high');
  changed('refresh'); assert.equal(render().uri, 'high');
  pending[3]({ status: 'ready', uri: 'thumb' }); await Promise.resolve(); assert.equal(render().uri, 'high');
  pending[4]({ status: 'ready', uri: 'screen' }); await Promise.resolve(); assert.equal(render().uri, 'high');
  pending[5]({ status: 'ready', uri: 'high' }); await Promise.resolve(); assert.equal(render().uri, 'high');
});

test('Contact-sheet foreground refresh retains its displayed items while real library changes clear them', async () => {
  const runner = hookRunner(), pending = []; let changed;
  const { useResolvedPhotos } = load('features/photos/hooks/useResolvedPhotos.ts', {
    react: runner.hooks,
    '../services/PhotoReferenceService': {
      observePhotoLibrary: listener => { changed = listener; return () => {}; },
      resolvePhoto: () => new Promise(resolve => pending.push(resolve)),
    },
  });
  const photos = [{ id: 'p', provider: 'apple-photos', assetId: 'asset', sortOrder: 0 }];
  const render = () => runner.render(() => useResolvedPhotos(photos));
  const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  render(); pending[0]({ status: 'ready', uri: 'sheet-preview' }); await flush();
  assert.equal(render().items[0].uri, 'sheet-preview');
  changed('refresh'); assert.equal(render().items[0].uri, 'sheet-preview');
  pending[1]({ status: 'ready', uri: 'sheet-preview' }); await flush();
  assert.equal(render().items[0].uri, 'sheet-preview');
  changed('invalidate'); assert.equal(render().items[0].uri, undefined);
  pending[2]({ status: 'unavailable' }); await flush();
  assert.equal(render().items[0].status, 'unavailable');
});

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
  const values = [], dependencies = []; let cursor = 0, effects = [];
  const changed = (i, deps) => !dependencies[i] || !deps || deps.some((value, index) => !Object.is(value, dependencies[i][index]));
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial;
      return [values[i], next => { values[i] = typeof next === 'function' ? next(values[i]) : next; }]; },
    useRef(initial) { const i = cursor++; if (!(i in values)) values[i] = { current: initial }; return values[i]; },
    useMemo(fn, deps) { const i = cursor++; if (changed(i, deps)) { values[i] = fn(); dependencies[i] = deps; } return values[i]; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (changed(i, deps)) { dependencies[i] = deps; effects.push(fn); } },
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
    '../utils/resolvePhotoUri': { resolvePhotoUri: () => { resolutions++; return 'file:///photo.jpg'; } },
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

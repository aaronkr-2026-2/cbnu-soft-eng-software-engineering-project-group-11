const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');
const feature = path.resolve(__dirname, '../..');

function load(relative, mocks = {}) {
  const filename = path.resolve(feature, relative);
  const module = new Module(filename);
  module.filename = filename;
  module.paths = Module._nodeModulePaths(path.dirname(filename));
  module.require = name => name in mocks ? mocks[name] : name.startsWith('.')
    ? load(path.relative(feature, path.resolve(path.dirname(filename), name + '.ts')), mocks) : require(name);
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return module.exports;
}

const { getContactSheetLayout, orderedContactPhotos, contactSheetRows, contactSheetCaptureSize } = load('utils/contactSheetLayout.ts');

for (const count of [1, 6, 12, 24, 36, 72]) {
  test(`${count} photos produce deterministic 2400px geometry with no fake frames`, () => {
    const layout = getContactSheetLayout('35mm', count);
    const photos = Array.from({ length: count }, (_, i) => ({ id: String(i), sortOrder: i }));
    const rows = contactSheetRows(photos, layout.columns);
    assert.equal(layout.width, 2400);
    assert.equal(layout.rows, Math.ceil(count / 6));
    assert.equal(rows.flat().length, count);
    assert.ok(rows.every(row => row.length <= 6));
    assert.equal(layout.height, layout.padding + layout.headerHeight + layout.rows * layout.stripHeight +
      Math.max(0, layout.rows - 1) * layout.stripGap + layout.bottomPadding);
    assert.ok(layout.frameWidth * 6 + layout.frameGap * 5 + layout.stripPadding * 2 <= layout.width - layout.padding * 2);
  });
}

test('Reordering follows persisted sortOrder, never filenames or dates, without mutation', () => {
  const photos = [
    { id: 'z', sortOrder: 2, thumbnailUri: 'file:///first.jpg', takenAt: '2020-01-01' },
    { id: 'a', sortOrder: 0, thumbnailUri: 'file:///last.jpg', takenAt: '2026-10-01' },
    { id: 'b', sortOrder: 1 },
  ];
  const sorted = orderedContactPhotos({ photos });
  assert.deepEqual(sorted.map(p => p.id), ['a', 'b', 'z']);
  assert.deepEqual(photos.map(p => p.id), ['z', 'a', 'b']);
  assert.equal(sorted[0], photos[1]);
});

test('Last strip has only real photos and zero-photo Rolls remain empty', () => {
  assert.deepEqual(contactSheetRows([1, 2, 3, 4, 5, 6, 7], 6), [[1, 2, 3, 4, 5, 6], [7]]);
  assert.deepEqual(contactSheetRows([], 6), []);
  assert.throws(() => contactSheetRows([1], 0), /Invalid/);
  assert.equal(getContactSheetLayout('35mm', 0).rows, 0);
  assert.ok(getContactSheetLayout('35mm', 36).height > getContactSheetLayout('35mm', 12).height);
});

test('iOS capture points and Android bitmap pixels produce the same physical output', () => {
  const layout = getContactSheetLayout('35mm', 36);
  for (const ratio of [1, 2, 3]) {
    const ios = contactSheetCaptureSize(layout, ratio, 'ios');
    const android = contactSheetCaptureSize(layout, ratio, 'android');
    assert.equal(ios.width * ratio, 2400);
    assert.equal(ios.height * ratio, layout.height);
    assert.equal(android.width, 2400);
    assert.equal(android.height, layout.height);
  }
});

test('Non-35mm formats get a simple grid without misleading 35mm perforations', () => {
  assert.equal(getContactSheetLayout('35mm', 12).perforated, true);
  for (const format of ['120', '110', 'other']) assert.equal(getContactSheetLayout(format, 12).perforated, false);
});

function exportRuntime() {
  const state = { captures: [], released: [], saves: [], shares: [], checks: [], requests: [],
    permission: { granted: true, canAskAgain: true }, shareAvailable: true, generationCount: 0 };
  const api = load('services/ContactSheetExportService.ts', {
    'react-native': { Platform: { OS: 'ios' }, PixelRatio: { get: () => 3 } },
    'react-native-view-shot': {
      captureRef: async (view, options) => { state.captures.push({ view, options }); return 'file:///cache/sheet.png'; },
      releaseCapture: uri => state.released.push(uri),
    },
    'expo-media-library': {
      Asset: { create: async uri => state.saves.push(uri) },
      getPermissionsAsync: async (...args) => { state.checks.push(args); return state.permission; },
      requestPermissionsAsync: async (...args) => { state.requests.push(args); return state.permission; },
    },
    'expo-sharing': { isAvailableAsync: async () => state.shareAvailable, shareAsync: async (uri, options) => state.shares.push({ uri, options }) },
  });
  return { state, ...api };
}

test('High resolution capture uses a dedicated canvas and density-aware PNG options', async () => {
  const r = exportRuntime(); const view = {}; const layout = getContactSheetLayout('35mm', 36);
  await r.captureContactSheet(view, layout);
  assert.equal(r.state.captures[0].view, view);
  assert.equal(r.state.captures[0].options.width, 800);
  assert.equal(r.state.captures[0].options.height * 3, layout.height);
  assert.equal(r.state.captures[0].options.format, 'png');
  assert.equal(r.state.captures[0].options.useRenderInContext, true);
});

test('Save and Share reuse one generation, request no read permissions, and clean up on close', async () => {
  const r = exportRuntime();
  const session = r.createContactSheetExportSession(async () => { r.state.generationCount++; return 'file:///cache/sheet.png'; });
  assert.equal(r.state.generationCount, 0, 'opening a preview must not export');
  const images = await Promise.all([session.getImage(), session.getImage()]);
  assert.equal(images[0], images[1]);
  await session.save(); await session.share();
  assert.equal(r.state.generationCount, 1);
  assert.deepEqual(r.state.checks, [[true, ['photo']]]);
  assert.equal(r.state.requests.length, 0);
  assert.deepEqual(r.state.saves, ['file:///cache/sheet.png']);
  assert.equal(r.state.shares[0].uri, r.state.saves[0]);
  session.dispose(); session.dispose(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(r.state.released, ['file:///cache/sheet.png']);
  await assert.rejects(session.getImage(), /closed/);
});

test('Denied permission is requested only on Save, blocks saving, and allows sharing cached output', async () => {
  const r = exportRuntime(); r.state.permission.granted = false;
  const session = r.createContactSheetExportSession(async () => 'file:///cache/sheet.png');
  await assert.rejects(session.save(), error => error.reason === 'permission');
  assert.deepEqual(r.state.requests, [[true, ['photo']]]);
  assert.equal(r.state.saves.length, 0);
  await session.share(); assert.equal(r.state.shares.length, 1);
  r.state.permission.canAskAgain = false;
  await assert.rejects(session.save(), error => error.reason === 'permission');
  assert.equal(r.state.requests.length, 1);
});

test('Failed image generation can be retried; unavailable sharing does not render', async () => {
  const r = exportRuntime(); let attempts = 0;
  const session = r.createContactSheetExportSession(async () => { if (++attempts === 1) throw new Error('Missing image'); return 'file:///cache/sheet.png'; });
  await assert.rejects(session.getImage(), /Missing image/);
  assert.equal(await session.getImage(), 'file:///cache/sheet.png');
  assert.equal(attempts, 2);
  const unused = r.createContactSheetExportSession(async () => { assert.fail('must not generate'); });
  r.state.shareAvailable = false;
  await assert.rejects(unused.share(), error => error.reason === 'sharing');
});

test('Closing during generation releases the completed temporary image', async () => {
  const r = exportRuntime(); let finish;
  const session = r.createContactSheetExportSession(() => new Promise(resolve => finish = resolve));
  const pending = session.getImage(); session.dispose(); finish('file:///cache/pending.png');
  await pending; await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(r.state.released, ['file:///cache/pending.png']);
});

test('Both themes use identical clipped cover frames for preview and export', () => {
  const jsx = (type, props) => ({ type, props });
  const { ContactSheetCanvas } = load('components/ContactSheetCanvas.tsx', {
    react: { useEffect: () => {}, useRef: value => ({ current: value }), useState: value => [value === null ? { width: 2000, height: 3000 } : value, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Image: 'Image', Text: 'Text', View: 'View', Platform: { OS: 'ios' } },
  });
  for (const theme of ['light', 'dark']) {
    const frames = [
      { id: 'portrait', uri: 'file:///portrait.jpg', number: 1 },
      { id: 'landscape', uri: 'file:///landscape.jpg', number: 2 },
      { id: 'copy', uri: 'file:///Documents/photos/r1/copy.heic', number: 3 },
    ];
    const tree = ContactSheetCanvas({ layout: getContactSheetLayout('35mm', 3), rows: [frames],
      header: { left: '', center: 'Contax T2', right: '35mm · Kodak Portra 400' }, width: 320, unavailableLabel: 'Unavailable', theme });
    assert.equal(tree.props.style.backgroundColor, '#000000');
    const images = [];
    function visit(node) {
      if (!node) return;
      if (Array.isArray(node)) return node.forEach(visit);
      if (typeof node.type === 'function') return visit(node.type(node.props));
      if (node.type === 'Image') images.push(node);
      if (node.type === 'View' && node.props.style?.height && node.props.style?.justifyContent === 'center') assert.equal(node.props.style.overflow, 'hidden');
      visit(node.props?.children);
    }
    visit(tree);
    assert.equal(images.length, 3);
    assert.ok(images.every(image => image.props.resizeMode === 'cover'));
    assert.deepEqual(images.map(image => image.props.source.uri), frames.map(frame => frame.uri));
  }
});

const { getContactSheetPhotoTransform } = load('utils/contactSheetPhotoTransform.ts');

test('Effective portrait dimensions rotate clockwise; landscape and square remain unchanged', () => {
  for (const [width, height, rotation] of [[4000, 3000, 0], [3000, 4000, 90], [2000, 2000, 0], [900, 4000, 90], [4000, 900, 0]]) {
    for (const factor of [0.1, 1, 1 / 3]) {
      const fw = 340 * factor, fh = 227 * factor;
      const transform = getContactSheetPhotoTransform(width, height, fw, fh);
      assert.equal(transform.rotation, rotation);
      assert.ok(Math.abs(transform.width / transform.height - width / height) < 1e-10);
      const displayWidth = rotation ? transform.height : transform.width;
      const displayHeight = rotation ? transform.width : transform.height;
      assert.ok(displayWidth >= fw - 1e-8 && displayHeight >= fh - 1e-8, 'no empty edges after rotation');
      assert.ok(Math.abs(transform.offsetX + transform.width / 2 - fw / 2) < 1e-8);
      assert.ok(Math.abs(transform.offsetY + transform.height / 2 - fh / 2) < 1e-8);
    }
  }
  for (const value of [0, -1, NaN, Infinity]) assert.throws(() => getContactSheetPhotoTransform(value, 10, 340, 227), /Invalid/);
});

test('A mixed 36-frame Roll uses matching preview/export crops without changing source records', () => {
  const layout = getContactSheetLayout('35mm', 36);
  const images = Array.from({ length: 36 }, (_, i) => ({ width: i % 3 === 0 ? 4000 : 3000, height: i % 3 === 0 ? 3000 : 4000,
    uri: i % 2 ? 'file:///Documents/photos/copy.heic' : 'file:///picker/reference.jpg' }));
  const original = JSON.stringify(images);
  for (const image of images) {
    const full = getContactSheetPhotoTransform(image.width, image.height, layout.frameWidth, layout.frameHeight);
    const preview = getContactSheetPhotoTransform(image.width, image.height, layout.frameWidth / 8, layout.frameHeight / 8);
    assert.equal(full.rotation, preview.rotation);
    for (const key of ['width', 'height', 'offsetX', 'offsetY']) assert.ok(Math.abs(full[key] / 8 - preview[key]) < 1e-8);
  }
  assert.equal(JSON.stringify(images), original);
});

test('Cached contact-sheet exports revalidate sources before every Save/Share and recover on Retry', async () => {
  const r=exportRuntime(); let available=true, checks=0, generations=0;
  const session=r.createContactSheetExportSession(async ()=>{generations++;return 'file:///cache/sheet.png';}, async ()=>{
    checks++; if (!available) throw new Error('Source unavailable or access revoked');
  });
  await session.share(); assert.equal(generations,1); assert.equal(r.state.shares.length,1);
  available=false;
  await assert.rejects(session.share(),/Source unavailable/);
  await assert.rejects(session.save(),/Source unavailable/);
  assert.equal(r.state.shares.length,1); assert.equal(r.state.saves.length,0); assert.equal(generations,1);
  available=true; await session.save(); assert.equal(r.state.saves.length,1); assert.equal(checks,4);
});

const appearanceAPI = load('utils/contactSheetAppearance.ts');
const { defaultContactSheetAppearance, contactSheetPalette, contactSheetBackgrounds, contactSheetFrameStyles, normalizeContactSheetHex } = appearanceAPI;

test('Preset and custom backgrounds normalize hex and choose contrasting header colors', () => {
  const expected = { black: '#000000', white: '#FFFFFF', cream: '#F4EBDD', gray: '#242424', kraft: '#C4A27A', slate: '#2F3B45', darkroom: '#2A0D0D', custom: '#12ABEF' };
  for (const background of contactSheetBackgrounds) {
    const palette = contactSheetPalette({ ...defaultContactSheetAppearance, background, customColor: '#12abef' });
    assert.equal(palette.background, expected[background]);
  }
  assert.equal(contactSheetPalette({ ...defaultContactSheetAppearance, background: 'white' }).header, '#171717');
  assert.equal(contactSheetPalette().header, '#EFECE5');
  assert.equal(normalizeContactSheetHex(' aabbcc '), '#AABBCC');
  for (const value of ['', '#123', '#12345678', 'orange', '#GG0000']) assert.equal(normalizeContactSheetHex(value), undefined);
});

test('Every frame style has bounded positive geometry and preserve actual photo ordering/counts', () => {
  for (const style of contactSheetFrameStyles) for (const count of [0, 1, 7, 36, 72]) {
    const layout = getContactSheetLayout('35mm', count, style);
    assert.equal(layout.frameStyle, style); assert.equal(layout.vertical, style === 'film-strip-dark');
    assert.ok(layout.frameHeight - layout.borderWidth * 2 > 0);
    const photos = Array.from({ length: count }, (_, i) => ({ id: i, sortOrder: count - i }));
    const ordered = orderedContactPhotos({ photos });
    const rows = contactSheetRows(ordered, layout.columns);
    assert.deepEqual(rows.flat().map(p => p.id), ordered.map(p => p.id));
    assert.equal(rows.flat().length, count);
    assert.ok(layout.stripPadding * 2 + layout.frameWidth * layout.columns + layout.frameGap * (layout.columns - 1) <= layout.width - layout.padding * 2);
    assert.equal(layout.borderWidth, style === 'instant' ? 4 : ['white-border', 'black-border', 'warm-print'].includes(style) ? 6 : 0);
    // Borders and the instant chin stay inside the gaps, so neighbouring frames never overlap.
    assert.ok(layout.borderWidth * 2 <= layout.frameGap);
    if (style === 'instant') assert.ok(layout.frameGap - layout.borderWidth * 2 >= 8, 'instant prints stay visibly separate');
    assert.ok(layout.borderWidth + layout.chin <= layout.stripHeight - layout.photoTop - layout.frameHeight + layout.stripGap);
    assert.equal(layout.perforated, ['film-strip', 'film-strip-dark', 'color-negative', 'bw-negative'].includes(style));
    assert.equal(layout.strip, ['film-strip', 'color-negative', 'bw-negative', 'medium-format'].includes(style));
  }
});

test('Contact-sheet preferences persist separately, validate old/corrupt settings, and do not publish failed writes', () => {
  const kv = new Map([['filmer.rolls.v1', 'REAL_ARCHIVE_UNTOUCHED'], ['filmer.settings.v1', 'OTHER_SETTINGS_UNTOUCHED']]);
  const writes = []; let fail = false;
  const storage = { getItemSync: key => kv.get(key) ?? null, setItemSync: (key, value) => { if (fail) throw Error('Disk full'); writes.push(key); kv.set(key, value); } };
  const createStore = () => load('store/contactSheetPreferences.ts', { 'expo-sqlite/kv-store': storage }).useContactSheetPreferences;
  const store = createStore();
  assert.deepEqual(store.getState().appearance, defaultContactSheetAppearance);
  store.getState().updateAppearance({ background: 'custom', customColor: 'ab89ef', frameStyle: 'film-strip-dark' });
  assert.deepEqual(createStore().getState().appearance, { background: 'custom', customColor: '#AB89EF', frameStyle: 'film-strip-dark' });
  assert.equal(kv.get('filmer.rolls.v1'), 'REAL_ARCHIVE_UNTOUCHED');
  assert.equal(kv.get('filmer.settings.v1'), 'OTHER_SETTINGS_UNTOUCHED');
  assert.deepEqual(writes, ['filog.contactSheet.appearance.v1']);
  const before = store.getState().appearance; fail = true;
  assert.throws(() => store.getState().updateAppearance({ background: 'white' }), /Disk full/);
  assert.equal(store.getState().appearance, before); fail = false;
  for (const raw of ['{bad', JSON.stringify({ schema: 99, appearance: { background: 'white' } }), JSON.stringify({ schema: 1, appearance: { background: 'bad', customColor: '#ZZZZZZ', frameStyle: 'bad' } })]) {
    kv.set('filog.contactSheet.appearance.v1', raw);
    assert.deepEqual(createStore().getState().appearance, defaultContactSheetAppearance);
    assert.equal(kv.get('filog.contactSheet.appearance.v1'), raw, 'reading preferences cannot rewrite stored bytes');
  }
});

function appearanceCanvas(appearance, width) {
  const jsx = (type, props) => ({ type, props });
  const { ContactSheetCanvas } = load('components/ContactSheetCanvas.tsx', {
    react: { useEffect: () => {}, useRef: value => ({ current: value }), useState: value => [value === null ? { width: 2000, height: 3000 } : value, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Image: 'Image', Text: 'Text', View: 'View', Platform: { OS: 'ios' } },
  });
  const layout = getContactSheetLayout('35mm', 7, appearance.frameStyle);
  const rows = contactSheetRows(Array.from({ length: 7 }, (_, i) => ({ id: String(i), uri: `file:///image-${i}.jpg`, number: i + 1 })), layout.columns);
  const tree = ContactSheetCanvas({ appearance, layout, rows, header: { left: '2026', center: 'Camera', right: '35mm' }, width, unavailableLabel: 'Unavailable' });
  const nodes = [];
  function visit(node) {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (typeof node.type === 'function') return visit(node.type(node.props));
    if (node.type) nodes.push(node);
    visit(node.props?.children);
  }
  visit(tree);
  return { tree, nodes, layout };
}

test('Actual canvas styling and scaled geometry match between preview and exported views for every appearance', () => {
  const geometry = new Set(['width', 'height', 'left', 'top', 'right', 'bottom', 'fontSize', 'lineHeight', 'paddingHorizontal', 'paddingTop', 'paddingBottom', 'marginBottom', 'gap', 'borderRadius', 'borderWidth', 'borderLeftWidth', 'borderRightWidth']);
  for (const frameStyle of contactSheetFrameStyles) for (const background of contactSheetBackgrounds) {
    const appearance = { background, customColor: '#5070A0', frameStyle };
    const preview = appearanceCanvas(appearance, 300), exported = appearanceCanvas(appearance, 800);
    assert.equal(preview.tree.props.style.backgroundColor, contactSheetPalette(appearance).background);
    assert.equal(exported.tree.props.style.backgroundColor, preview.tree.props.style.backgroundColor);
    const normalize = (nodes, width) => nodes.map(node => ({ type: node.type, uri: node.props.source?.uri,
      style: Object.fromEntries(Object.entries(node.props.style ?? {}).filter(([key]) => key !== 'transform').map(([key, value]) =>
        [key, typeof value === 'number' && geometry.has(key) ? Math.round(value / width * 2400 * 1e6) / 1e6 : value])) }));
    assert.deepEqual(normalize(preview.nodes, 300), normalize(exported.nodes, 800));
    assert.deepEqual(preview.nodes.filter(node => node.type === 'Image').map(node => node.props.source.uri), Array.from({ length: 7 }, (_, i) => `file:///image-${i}.jpg`));
    assert.equal(preview.nodes.filter(node => node.type === 'Image').length, 7, 'no fake frames in the partial row');
    if (frameStyle === 'film-strip-dark') {
      assert.ok(preview.nodes.some(node => node.props.style?.backgroundColor === '#141414'));
      assert.ok(preview.nodes.some(node => node.type === 'Text' && node.props.style?.color === '#D58B45'));
    }
  }
});

test('Appearance controls select backgrounds and frame styles, expose custom hex input, and lock during capture', () => {
  const jsx = (type, props) => ({ type, props }), patches = [], hex = [];
  const { ContactSheetAppearanceControls } = load('components/ContactSheetAppearanceControls.tsx', {
    './ContactSheetColorSliders': { ContactSheetColorSliders: 'Sliders' },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Pressable: 'Button', View: 'View', Text: 'Text', TextInput: 'Input', ScrollView: 'ScrollView' },
    '../../../constants/theme': { useThemedStyles: () => ({}), useTheme: () => ({}) },
    '../../../i18n/useTranslation': { useTranslation: () => ({ t: key => key }) },
  });
  const nodes = (root, type) => !root || typeof root !== 'object' ? [] : Array.isArray(root) ? root.flatMap(node => nodes(node, type)) : [...(root.type === type ? [root] : []), ...nodes(root.props?.children, type)];
  const props = { appearance: { ...defaultContactSheetAppearance, background: 'custom' }, disabled: false, hexValue: '#5070A0', onHexChange: value => hex.push(value), onChange: value => patches.push(value) };
  const tree = ContactSheetAppearanceControls(props);
  nodes(tree, 'Button').find(node => node.props.accessibilityLabel === 'csWhite').props.onPress();
  nodes(tree, 'Button').find(node => node.props.accessibilityLabel === 'csFilmStripDark').props.onPress();
  nodes(tree, 'Input')[0].props.onChangeText('#AABBCC');
  assert.deepEqual(patches, [{ background: 'white' }, { frameStyle: 'film-strip-dark' }]); assert.deepEqual(hex, ['#AABBCC']);
  assert.ok(nodes(ContactSheetAppearanceControls({ ...props, disabled: true }), 'Button').every(node => node.props.disabled));
  assert.equal(nodes(ContactSheetAppearanceControls({ ...props, hexValue: '#xx' }), 'Text').filter(node => node.props.accessibilityRole === 'alert').length, 1);
});

test('Preview changes invalidate cached exports and capture the same appearance and layout shown on screen', async () => {
  const r = exportRuntime(), values = [], dependencies = [], cleanups = []; let cursor = 0, effects = [];
  const changed = (i, deps) => !dependencies[i] || deps.some((value, index) => !Object.is(value, dependencies[i][index]));
  const react = {
    useState(initial) { const i = cursor++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial; return [values[i], value => { values[i] = typeof value === 'function' ? value(values[i]) : value; }]; },
    useRef(initial) { const i = cursor++; if (!(i in values)) values[i] = { current: initial }; return values[i]; },
    useMemo(fn, deps) { const i = cursor++; if (changed(i, deps)) { values[i] = fn(); dependencies[i] = deps; } return values[i]; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (changed(i, deps)) { dependencies[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); }); } },
  };
  let appearance = { ...defaultContactSheetAppearance };
  const jsx = (type, props) => ({ type, props });
  const { ContactSheetPreview } = load('components/ContactSheetPreview.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Button', ScrollView: 'ScrollView', Modal: 'Modal', SafeAreaView: 'SafeAreaView', KeyboardAvoidingView: 'KeyboardView', Platform: { OS: 'ios' }, Keyboard: { dismiss() {} }, PixelRatio: { get: () => 3 } },
    '../../../constants/theme': { useThemedStyles: () => ({}), useTheme: () => ({}) },
    '../../../i18n/useTranslation': { useTranslation: () => ({ language: 'en', t: key => key }) },
    '../../../components/ui/BackButton': { BackButton: 'Back' }, '../../../components/ui/Toast': { Toast: 'Toast' },
    '../../photos/hooks/useResolvedPhotos': { useResolvedPhotos: photos => ({ items: photos.map(photo => ({ status: 'ready', uri: photo.uri })) }) },
    '../../photos/services/PhotoReferenceService': { resolvePhoto: async photo => ({ status: 'ready', uri: photo.uri }) },
    '../store/contactSheetPreferences': { useContactSheetPreferences: selector => selector({ appearance, updateAppearance: patch => { appearance = { ...appearance, ...patch }; } }) },
    '../services/ContactSheetExportService': r,
    './ContactSheetCanvas': { ContactSheetCanvas: 'Canvas' }, './ContactSheetAppearanceControls': { ContactSheetAppearanceControls: 'Controls' },
  });
  const roll = { format: '35mm', date: '2026-10', cameraName: 'Camera', filmName: 'Film', photos: [{ id: 'p', uri: 'file:///p.jpg', sortOrder: 0 }] };
  const nodes = (root, type) => !root || typeof root !== 'object' ? [] : Array.isArray(root) ? root.flatMap(node => nodes(node, type)) : [...(root.type === type ? [root] : []), ...nodes(root.props?.children, type)];
  function render() { cursor = 0; effects = []; const tree = ContactSheetPreview({ roll, onClose() {} }); effects.forEach(fn => fn()); return tree; }
  const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
  let tree = render();
  const stage = nodes(tree, 'View').find(node => node.props.onLayout);
  assert.equal(stage.props.style[1].backgroundColor, '#000000', 'preview letterboxing uses the sheet background');
  stage.props.onLayout({ nativeEvent: { layout: { width: 320, height: 450 } } });
  tree = render();
  async function saveAndCapture() {
    const save = nodes(tree, 'Button').find(node => nodes(node, 'Text').some(text => text.props.children === 'saveImage'));
    save.props.onPress(); await flush(); tree = render();
    const canvas = nodes(tree, 'Canvas').find(node => node.props.canvasRef);
    assert.ok(canvas, 'Save mounts a fresh dedicated export view');
    const preview = nodes(tree, 'Canvas').find(node => !node.props.canvasRef);
    assert.deepEqual(canvas.props.appearance, preview.props.appearance);
    assert.deepEqual(canvas.props.layout, preview.props.layout);
    canvas.props.canvasRef.current = {};
    canvas.props.onReady(); await flush(); tree = render();
  }
  await saveAndCapture(); assert.equal(r.state.captures.length, 1);
  const appearanceToggle = nodes(tree, 'Button').find(node => nodes(node, 'Text').some(text => text.props.children === 'csCustomize'));
  appearanceToggle.props.onPress(); tree = render();
  nodes(tree, 'Controls')[0].props.onChange({ background: 'cream', frameStyle: 'film-strip-dark' });
  tree = render(); await flush();
  assert.deepEqual(r.state.released, ['file:///cache/sheet.png'], 'old cached design is released on an appearance change');
  await saveAndCapture();
  assert.equal(r.state.captures.length, 2, 'new settings cannot reuse the old image');
  const preview = nodes(tree, 'Canvas').find(node => !node.props.canvasRef);
  assert.equal(preview.props.appearance.background, 'cream'); assert.equal(preview.props.layout.vertical, true);
  // Invalid custom input cannot silently export the previous valid hex color.
  nodes(tree, 'Controls')[0].props.onChange({ background: 'custom' }); tree = render();
  nodes(tree, 'Controls')[0].props.onHexChange('#oops'); tree = render();
  assert.ok(nodes(tree, 'Button').filter(node => nodes(node, 'Text').some(text => ['saveImage', 'share'].includes(text.props.children))).every(node => node.props.disabled));
  cleanups.forEach(fn => fn?.()); await flush();
});


test('All frame styles preserve sheet dimensions and the photo aperture for every format', () => {
  for (const format of ['35mm', '120', '110', 'other']) for (const count of [1, 7, 36, 72]) {
    const baseline = getContactSheetLayout(format, count);
    for (const style of contactSheetFrameStyles) {
      const layout = getContactSheetLayout(format, count, style);
      for (const key of ['width', 'height', 'frameWidth', 'frameHeight', 'photoTop', 'stripHeight', 'frameGap', 'stripPadding']) {
        assert.equal(layout[key], baseline[key], key + ' changed for ' + style);
      }
    }
  }
  const aperture = style => appearanceCanvas({ ...defaultContactSheetAppearance, frameStyle: style }, 600).nodes
    .filter(node => node.type === 'View' && node.props.style?.overflow === 'hidden')
    .map(node => [node.props.style.width, node.props.style.height]);
  for (const style of contactSheetFrameStyles) assert.deepEqual(aperture(style), aperture('none'));
});

test('RGB slider clamps touches and preserves the other two color channels', () => {
  const { colorChannelAt, replaceColorChannel } = load('utils/contactSheetColor.ts');
  assert.equal(colorChannelAt(-20, 100), 0);
  assert.equal(colorChannelAt(50, 100), 128);
  assert.equal(colorChannelAt(300, 100), 255);
  assert.equal(replaceColorChannel('#123456', 1, 256), '#12FF56');
  assert.equal(replaceColorChannel('#123456', 0, -20), '#003456');
  assert.equal(replaceColorChannel('#123456', 2, 127.5), '#123480');
});

test('Color gestures preview locally and commit once on release; disabled sliders cannot start', () => {
  const jsx = (type, props) => ({ type, props }), commits = [];
  const { ContactSheetColorSliders } = load('components/ContactSheetColorSliders.tsx', {
    react: { useState: value => [value, () => {}], useRef: value => ({ current: value }), useEffect: () => {} },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Text: 'Text' },
    '../../../constants/theme': { useTheme: () => ({}) },
    '../../../i18n/useTranslation': { useTranslation: () => ({ t: key => key }) },
  });
  const find = root => !root || typeof root !== 'object' ? [] : Array.isArray(root) ? root.flatMap(find) :
    [...(root.props?.accessibilityRole === 'adjustable' ? [root] : []), ...find(root.props?.children)];
  const props = { color: '#123456', disabled: false, onCommit: value => commits.push(value) };
  const sliders = find(ContactSheetColorSliders(props));
  assert.equal(sliders.length, 3);
  const red = sliders[0].props;
  red.onLayout({ nativeEvent: { layout: { width: 100 } } });
  red.onResponderGrant({ nativeEvent: { locationX: 30 } });
  red.onResponderMove({ nativeEvent: { locationX: 100 } });
  assert.equal(commits.length, 0);
  red.onResponderRelease();
  assert.deepEqual(commits, ['#FF3456']);
  assert.ok(find(ContactSheetColorSliders({ ...props, disabled: true })).every(node => !node.props.onStartShouldSetResponder()));
});


test('Refreshing a contact-sheet URI keeps the native image mounted while measuring its replacement', async () => {
  const jsx = (type, props) => ({ type, props });
  const values = [], deps = []; let cursor = 0, effects = [];
  const react = {
    useState(initial) { const i = cursor++; if (!(i in values)) values[i] = initial;
      return [values[i], value => { values[i] = typeof value === 'function' ? value(values[i]) : value; }]; },
    useRef(initial) { return { current: initial }; },
    useEffect(fn, dependencies) { const i = cursor++;
      if (!deps[i] || dependencies.some((value, index) => value !== deps[i][index])) {
        deps[i] = dependencies; effects.push(fn);
      }
    },
  };
  const measurements = [];
  function NativeImage() {}
  NativeImage.getSize = () => new Promise(resolve => measurements.push(resolve));
  const { ContactSheetCanvas } = load('components/ContactSheetCanvas.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Image: NativeImage, View: 'View', Text: 'Text', Platform: { OS: 'ios' } },
  });
  const layout = getContactSheetLayout('35mm', 1);
  const canvas = ContactSheetCanvas({ layout, rows: [[{ id: 'p', uri: 'old', number: 1 }]],
    header: { left: '', center: '', right: '' }, width: 300, unavailableLabel: '' });
  const find = (root, predicate) => !root || typeof root !== 'object' ? [] : Array.isArray(root) ? root.flatMap(node => find(node, predicate)) :
    [...(predicate(root) ? [root] : []), ...find(root.props?.children, predicate)];
  const frame = find(canvas, node => node.type?.name === 'FilmFrame')[0];
  // Isolate the frame's hook state from the canvas hooks.
  values.length = 0; deps.length = 0;
  function render(uri) {
    cursor = 0; effects = [];
    const tree = frame.type({ ...frame.props, frame: { ...frame.props.frame, uri } });
    effects.forEach(fn => fn());
    return tree;
  }
  render('old'); measurements[0]({ width: 1800, height: 1200 }); await Promise.resolve();
  assert.equal(find(render('old'), node => node.type === NativeImage).length, 1);
  render('new');
  const pending = find(render('new'), node => node.type === NativeImage);
  assert.equal(pending.length, 1, 'URI remeasurement cannot unmount the displayed image');
  assert.equal(pending[0].props.fadeDuration, 0);
  measurements[1]({ width: 1800, height: 1200 }); await Promise.resolve();
  assert.equal(find(render('new'), node => node.type === NativeImage).length, 1);
});

test('Film rebate styles print their own strip colors and real-film edge numbering', () => {
  const rendered = frameStyle => appearanceCanvas({ ...defaultContactSheetAppearance, frameStyle }, 600).nodes;
  const labels = frameStyle => rendered(frameStyle).filter(node => node.type === 'Text' && node.props.style?.position === 'absolute').map(node => node.props.children);
  assert.equal(labels('color-negative')[0], '1 ▸ 1A');
  assert.equal(labels('medium-format')[0], '◂ 1 ▸');
  assert.equal(labels('film-strip')[0], '1');
  for (const [frameStyle, strip] of [['color-negative', '#B4632F'], ['bw-negative', '#1E1D1B'], ['medium-format', '#151515']]) {
    assert.ok(rendered(frameStyle).some(node => node.props.style?.backgroundColor === strip), frameStyle + ' rebate');
  }
  assert.equal(getContactSheetLayout('35mm', 6, 'medium-format').perforated, false, '120 rebates have no sprocket holes');
  assert.equal(getContactSheetLayout('120', 6, 'color-negative').perforated, false, 'only 35mm film is perforated');
});

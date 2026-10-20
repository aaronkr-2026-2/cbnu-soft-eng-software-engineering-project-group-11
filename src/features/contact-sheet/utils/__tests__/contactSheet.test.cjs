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

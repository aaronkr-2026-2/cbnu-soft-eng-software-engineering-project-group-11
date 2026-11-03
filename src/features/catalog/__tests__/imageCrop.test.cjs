const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(native) {
  const filename = path.resolve(__dirname, '../services/ImageCropService.ts');
  const mod = new Module(filename);
  mod.require = name => name === 'expo-modules-core' ? { requireOptionalNativeModule: () => native } : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
  return mod.exports;
}
const near = (actual, expected) => Object.keys(expected).forEach(key => assert.ok(Math.abs(actual[key] - expected[key]) < 1e-6, `${key}: ${actual[key]} ≠ ${expected[key]}`));

test('Centered framing of a wide photo keeps the middle at the cover ratio', () => {
  const { cropFromFraming, coverAspectRatio } = load(null);
  const frame = { frameWidth: 358, frameHeight: 358 / coverAspectRatio };
  const rect = cropFromFraming({ imageWidth: 4000, imageHeight: 2000, ...frame, zoom: 1, offsetX: 0, offsetY: 0 });
  // Height fills the frame; the visible width is height × ratio of a 2:1 photo.
  near(rect, { y: 0, height: 1, width: coverAspectRatio / 2, x: (1 - coverAspectRatio / 2) / 2 });
});

test('Moving and zooming selects the matching part of the photo, clamped inside it', () => {
  const { cropFromFraming } = load(null);
  const base = { imageWidth: 1000, imageHeight: 1000, frameWidth: 200, frameHeight: 100 };
  // Square photo covers the 200pt frame at 0.2 scale; zoom 2 shows 400pt, i.e. half the width.
  near(cropFromFraming({ ...base, zoom: 2, offsetX: 100, offsetY: 0 }), { x: 0, width: 0.5, height: 0.25, y: 0.375 });
  near(cropFromFraming({ ...base, zoom: 2, offsetX: -100, offsetY: 150 }), { x: 0.5, width: 0.5, y: 0, height: 0.25 });
  // An offset beyond the photo edge never produces a rect outside it.
  const outside = cropFromFraming({ ...base, zoom: 1, offsetX: 0, offsetY: 900 });
  assert.ok(outside.y >= 0 && outside.y + outside.height <= 1);
});

test('Cropping falls back to the original image on builds without the native function', async () => {
  const old = load({});
  assert.equal(old.cropAvailable, false);
  assert.equal(await old.cropImage('file:///a.jpg', { x: 0, y: 0, width: 1, height: 1 }), 'file:///a.jpg');
  const calls = [];
  const current = load({ cropImage: async (...args) => { calls.push(args); return 'file:///crop.jpg'; } });
  assert.equal(current.cropAvailable, true);
  assert.equal(await current.cropImage('file:///a.jpg', { x: 0.1, y: 0.2, width: 0.5, height: 0.4 }), 'file:///crop.jpg');
  assert.deepEqual(calls[0], ['file:///a.jpg', 0.1, 0.2, 0.5, 0.4, 1200]);
});

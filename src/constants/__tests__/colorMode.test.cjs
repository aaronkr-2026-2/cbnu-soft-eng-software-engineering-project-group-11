const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const src = path.resolve(__dirname, '../..');

function load(relative, mocks = {}) {
  const filename = path.resolve(src, relative);
  const module = new Module(filename);
  module.filename = filename;
  module.require = name => {
    if (name in mocks) return mocks[name];
    if (!name.startsWith('.')) return require(name);
    return load(path.relative(src, path.resolve(path.dirname(filename), name) + '.ts'), mocks);
  };
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
  return module.exports;
}
const luminance = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

test('System appearance follows the device; explicit choices override it', () => {
  const { resolveColorMode } = load('constants/colorMode.ts');
  assert.equal(resolveColorMode('system', 'dark'), 'dark');
  assert.equal(resolveColorMode('system', 'light'), 'light');
  assert.equal(resolveColorMode('system', null), 'light', 'an unknown system scheme falls back to light');
  assert.equal(resolveColorMode('light', 'dark'), 'light');
  assert.equal(resolveColorMode('dark', 'light'), 'dark');
});

test('New installs follow the system while saved light and dark choices are kept', () => {
  const store = saved => {
    const kv = new Map(saved === undefined ? [] : [['filmer.settings.v1', JSON.stringify(saved)]]);
    const storage = { getItemSync: key => kv.get(key) ?? null, setItemSync: (key, value) => kv.set(key, value) };
    return load('store/app-store.ts', { 'expo-sqlite/kv-store': storage }).useAppStore.getState();
  };
  assert.equal(store(undefined).appearance, 'system');
  assert.equal(store({ language: 'vi' }).appearance, 'system');
  assert.equal(store({ appearance: 'light' }).appearance, 'light');
  assert.equal(store({ appearance: 'dark' }).appearance, 'dark');
  assert.equal(store({ appearance: 'system' }).appearance, 'system');
  assert.equal(store({ appearance: 'sepia' }).appearance, 'system');
});

test('Both palettes keep readable text and visible form fields (WCAG AA)', () => {
  const { colors, darkColors } = load('constants/colors.ts');
  for (const palette of [colors, darkColors]) {
    for (const surface of [palette.background, palette.surface, palette.field]) {
      assert.ok(contrast(palette.text, surface) >= 7, 'body text');
      assert.ok(contrast(palette.secondaryText, surface) >= 4.5, 'secondary text');
      assert.ok(contrast(palette.destructive, surface) >= 4.5, 'error text');
    }
    assert.ok(contrast(palette.fieldBorder, palette.field) >= 3, 'text field outline');
    assert.ok(contrast(palette.placeholder, palette.field) >= 3, 'placeholder');
    assert.ok(contrast(palette.background, palette.accent) >= 7, 'primary button label');
    assert.ok(contrast(palette.background, palette.success) >= 4.5, 'in-date badge label');
    assert.ok(contrast(palette.background, palette.destructive) >= 4.5, 'outdate badge label');
  }
});

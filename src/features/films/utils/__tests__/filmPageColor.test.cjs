const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../filmPageColor.ts'), loaded = {};
new Function('exports', ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(loaded);
const { readablePageColor, fallbackFilmPageColor } = loaded;
const luminance = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);

test('Bright cover colors darken until white text is readable, keeping their hue', () => {
  const red = readablePageColor('#E8402F');
  assert.ok(luminance(red) <= 0.101, red);
  assert.ok(parseInt(red.slice(1, 3), 16) > parseInt(red.slice(3, 5), 16), 'still red');
  assert.ok(luminance(readablePageColor('#FFFFFF')) <= 0.101, 'white becomes a mid gray');
  // White text on a 0.1-luminance page has a contrast ratio of at least 7:1.
  assert.ok((1 + 0.05) / (luminance(readablePageColor('#F6E27A')) + 0.05) >= 7);
});

test('Dark colors are kept and invalid input falls back', () => {
  assert.equal(readablePageColor('#1A2B3C'), '#1A2B3C');
  assert.equal(readablePageColor('red'), fallbackFilmPageColor);
  assert.equal(readablePageColor('#12345'), fallbackFilmPageColor);
});

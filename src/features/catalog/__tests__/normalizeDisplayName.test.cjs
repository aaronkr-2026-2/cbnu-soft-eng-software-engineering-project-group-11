const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../utils/normalizeDisplayName.ts');
const exportsObject = {};
new Function('exports', ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(exportsObject);
const { normalizeDisplayName } = exportsObject;

test('Display names normalize lowercase brands, model codes and accented names idempotently', () => {
  for (const [input, expected] of [
    [' leica ', 'Leica'], ['LEICA', 'Leica'], ['cinestill', 'CineStill'], ['  reflx   lab ', 'Reflx Lab'],
    ['nikon fm2', 'Nikon FM2'], ['canon ae-1', 'Canon AE-1'], ['leica m6', 'Leica M6'],
    ['olympus mju-ii', 'Olympus Mju-II'], ['ilford hp5 plus 400', 'Ilford HP5 Plus 400'],
    ['fujifilm pro 400h', 'Fujifilm Pro 400H'], ['hà nội', 'Hà Nội'], ['서울', '서울'],
    ['35mm', '35mm'], ['40mm', '40mm'], ['C-41', 'C-41'], ['myLab USA', 'myLab USA'],
  ]) {
    assert.equal(normalizeDisplayName(input), expected);
    assert.equal(normalizeDisplayName(expected), expected);
  }
  assert.equal(normalizeDisplayName('vision3 250d', ['Vision3 250D']), 'Vision3 250D');
});

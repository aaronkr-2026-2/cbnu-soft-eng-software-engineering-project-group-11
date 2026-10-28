const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(relative) {
  const filename = path.resolve(__dirname, relative), exports = {};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('exports', 'require', code)(exports, name => { throw new Error('Unexpected dependency: ' + name); });
  return exports;
}
const { indexLetters, indexLetter, letterSections, sectionForLetter, letterAt } = load('../alphabetIndex.ts');

test('Brands index by their first letter, folding accents and grouping digits and symbols under #', () => {
  assert.equal(indexLetters.length, 27);
  assert.equal(indexLetter('Kodak'), 'K');
  assert.equal(indexLetter(' ilford'), 'I');
  assert.equal(indexLetter('Éclair'), 'E');
  assert.equal(indexLetter('35mm Lab'), '#');
  assert.equal(indexLetter(''), '#');
});

test('Each letter points at its first brand section in display order', () => {
  const sections = letterSections(['ADOX', 'Agfa', 'CineStill', 'Foma', 'Fujifilm', 'Kodak', 'Lomography']);
  assert.deepEqual([...sections], [['A', 0], ['C', 2], ['F', 3], ['K', 5], ['L', 6]]);
});

test('A letter without brands jumps to the next brand, or the last one when nothing follows', () => {
  const sections = letterSections(['ADOX', 'Ilford', 'Kodak']);
  assert.equal(sectionForLetter('K', sections), 2);
  assert.equal(sectionForLetter('B', sections), 1, 'B has no brands, so the next brand (Ilford) is shown');
  assert.equal(sectionForLetter('Z', sections), 2, 'nothing after Z, so the closest brand before it');
  assert.equal(sectionForLetter('?', sections), undefined);
  assert.equal(sectionForLetter('A', new Map()), undefined);
});

test('Finger position maps to evenly sized letter slots and clamps outside the strip', () => {
  const height = 27 * 16;
  assert.equal(letterAt(0, height), 'A');
  assert.equal(letterAt(16 * 10 + 8, height), 'K');
  assert.equal(letterAt(height - 1, height), '#');
  assert.equal(letterAt(-40, height), 'A', 'dragging above the strip stays on A');
  assert.equal(letterAt(height + 40, height), '#', 'dragging below the strip stays on #');
  assert.ok(indexLetters.includes(letterAt(5, 0)), 'an unmeasured strip cannot divide by zero');
});

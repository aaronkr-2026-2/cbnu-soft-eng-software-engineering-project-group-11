const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  module._compile(outputText, filename);
};

const { filmExpiryStatus } = require('../rollMonth.ts');
const { validateRollArchive } = require('../../data/validateRollArchive.ts');
const { isRollDraftDirty, isValidRollDraft } = require('../rollDraft.ts');

const today = new Date(2026, 9, 29); // 29 Oct 2026, local time
const roll = { id: 'r1', filmId: 'kodak-portra-400', filmName: 'Kodak Portra 400', cameraId: 'contax-t2', cameraName: 'Contax T2', format: '35mm', date: '2026-09', photos: [] };

test('Film is in date through the end of its expiry month and outdated from the next month', () => {
  assert.equal(filmExpiryStatus('2026-10', today), 'in-date', 'the current month is still in date');
  assert.equal(filmExpiryStatus('2027-03', today), 'in-date');
  assert.equal(filmExpiryStatus('2026-09', today), 'expired');
  assert.equal(filmExpiryStatus('2019-12', today), 'expired');
  assert.equal(filmExpiryStatus('2027-01', new Date(2026, 11, 31)), 'in-date', 'year boundaries compare as months');
});

test('Saved rolls accept an optional YYYY-MM film expiry and reject anything else', () => {
  assert.equal(validateRollArchive([roll]).length, 1, 'expiry stays optional for existing rolls');
  assert.equal(validateRollArchive([{ ...roll, filmExpiry: '2027-03' }])[0].filmExpiry, '2027-03');
  for (const filmExpiry of ['2027-13', '2027-3', '2027-03-01', '', 202703, null]) {
    assert.throws(() => validateRollArchive([{ ...roll, filmExpiry }]), /Invalid saved Roll archive/, String(filmExpiry));
  }
});

test('Editing only the film expiry marks the draft dirty and still validates', () => {
  const draft = { filmId: roll.filmId, cameraId: roll.cameraId, format: roll.format, date: roll.date, lab: '', notes: '' };
  assert.equal(isRollDraftDirty(draft, roll), false);
  assert.equal(isRollDraftDirty({ ...draft, filmExpiry: '2027-03' }, roll), true);
  assert.equal(isValidRollDraft({ ...draft, filmExpiry: '2027-03' }), true);
  assert.equal(isValidRollDraft({ ...draft, filmExpiry: 'soon' }), false);
});

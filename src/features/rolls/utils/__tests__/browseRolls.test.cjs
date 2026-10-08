const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

// Run these pure TypeScript utilities with Node's test runner and the existing compiler.
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  module._compile(outputText, filename);
};

const { groupRolls, sortRollsByDate } = require('../groupRolls.ts');
const { filterRolls } = require('../filterRolls.ts');
const { createRollBrowseContext } = require('../rollBrowse.ts');
const { translations } = require('../../../../i18n/translations.ts');

const modes = ['all', 'date', 'film', 'camera', 'location'];
const films = [
  { id: 'portra', brand: 'Kodak', name: 'Portra 400' },
  { id: 'gold', brand: 'Kodak', name: 'Gold 200' },
  { id: 'same-name', brand: 'Kodak', name: 'Portra 400' },
];
const cameras = [{ id: 'contax', brand: 'Contax', model: 'T2' }, { id: 'leica', brand: 'Leica', model: 'M6' }];
const context = (language = 'en') => createRollBrowseContext(films, cameras, language);
const roll = (id, date, overrides = {}) => Object.freeze({
  id, date, filmId: 'portra', filmName: 'Old film name', cameraId: 'contax', cameraName: 'Old camera name',
  format: '35mm', photos: [], ...overrides,
});
const location = (fields = {}) => ({ latitude: 37.56, longitude: 126.97, ...fields });
const rolls = Object.freeze([
  roll('old', '2025-12', { filmId: 'gold', cameraId: 'leica' }),
  roll('sept', '2026-09', { location: location({ name: 'Seoul', address: 'Jongno, South Korea' }) }),
  roll('oct', '2026-10', { location: location({ name: 'Seoul', address: 'Gangnam, South Korea' }) }),
  roll('same-month', '2026-10', { location: location({ name: 'Busan' }) }),
]);

test('All sorts months descending without mutating or cloning Rolls', () => {
  const groups = groupRolls(rolls, 'all', context());
  assert.equal(groups.length, 1);
  assert.equal(groups[0].title, 'Recently');
  assert.deepEqual(groups[0].rolls.map(r => r.id), ['oct', 'same-month', 'sept', 'old']);
  assert.equal(groups[0].rolls[0], rolls[2]);
  assert.equal(rolls[0].id, 'old');
});

test('Date groups full month/year across years, newest first', () => {
  const groups = groupRolls(rolls, 'date', context());
  assert.deepEqual(groups.map(g => g.title), ['October 2026', 'September 2026', 'December 2025']);
  assert.deepEqual(groups.map(g => g.rolls.length), [2, 1, 1]);
});

test('Date excludes missing, invalid and exact-day dates; All keeps them last', () => {
  const input = [roll('empty', ''), roll('bad-month', '2026-13'), roll('day', '2026-10-06'), roll('valid', '2026-10')];
  assert.deepEqual(groupRolls(input, 'date', context()).flatMap(g => g.rolls.map(r => r.id)), ['valid']);
  assert.equal(sortRollsByDate(input)[0].id, 'valid');
  assert.equal(groupRolls(input, 'all', context())[0].rolls.length, 4);
});

test('Film and Camera resolve catalog names and group by IDs', () => {
  const filmGroups = groupRolls(rolls, 'film', context());
  assert.deepEqual(filmGroups.map(g => [g.title, g.rolls.length]), [['Kodak Portra 400', 3], ['Kodak Gold 200', 1]]);
  const cameraGroups = groupRolls(rolls, 'camera', context());
  assert.deepEqual(cameraGroups.map(g => [g.title, g.rolls.length]), [['Contax T2', 3], ['Leica M6', 1]]);
  assert.equal(groupRolls([roll('a', '2026-10'), roll('b', '2026-10', { filmId: 'same-name' })], 'film', context()).length, 2);
});

test('Missing catalog entries retain existing Roll name fallbacks', () => {
  const input = [roll('custom', '2026-10', { filmId: 'missing-film', cameraId: 'missing-camera' })];
  assert.equal(groupRolls(input, 'film', context())[0].title, 'Old film name');
  assert.equal(groupRolls(input, 'camera', context())[0].title, 'Old camera name');
});

test('Location prefers trimmed saved names, then full addresses, then unknown', () => {
  const input = [
    roll('named', '2026-10', { location: location({ name: ' Seoul ', address: 'Different address' }) }),
    roll('same-name', '2026-09', { location: location({ name: 'seoul' }) }),
    roll('address', '2026-08', { location: location({ name: ' ', address: 'Jongno, Seoul' }) }),
    roll('unknown', '2026-07', { location: location() }), roll('none', '2026-06'),
    roll('literal', '2026-05', { location: location({ name: 'No Location' }) }),
  ];
  for (const language of ['en', 'vi', 'ko']) {
    const groups = groupRolls(input, 'location', context(language));
    assert.equal(groups[0].title, 'Seoul');
    assert.equal(groups[0].rolls.length, 2);
    assert.equal(groups[1].title, 'Jongno, Seoul');
    assert.equal(groups[2].title, translations[language].unknownLocation);
    assert.equal(groups[3].title, translations[language].noLocation);
    assert.notEqual(groups[3].key, groups[4].key);
  }
});

test('Every mode contains each matching Roll exactly once', () => {
  for (const mode of modes) {
    const grouped = groupRolls(rolls, mode, context()).flatMap(g => g.rolls);
    assert.equal(grouped.length, rolls.length);
    assert.equal(new Set(grouped.map(r => r.id)).size, rolls.length);
    assert.ok(grouped.every(r => rolls.includes(r)));
  }
});

test('One search utility matches catalog film/camera names within the selected mode', () => {
  assert.equal(filterRolls(rolls, ' PORTRA ', 'film', context()).length, 3);
  assert.equal(filterRolls(rolls, 'Contax', 'camera', context()).length, 3);
  assert.equal(filterRolls(rolls, 'Contax', 'film', context()).length, 0);
  assert.equal(filterRolls(rolls, 'Portra', 'camera', context()).length, 0);
  assert.equal(filterRolls(rolls, 'Old film name', 'film', context()).length, 0);
});

test('Location search includes saved addresses even when a name is present', () => {
  assert.deepEqual(filterRolls(rolls, 'Seoul', 'location', context()).map(r => r.id), ['sept', 'oct']);
  assert.deepEqual(filterRolls(rolls, 'gangnam', 'location', context()).map(r => r.id), ['oct']);
  assert.deepEqual(filterRolls(rolls, 'Jongno', 'all', context()).map(r => r.id), ['sept']);
  assert.equal(filterRolls(rolls, 'No Location', 'location', context()).length, 1);
});

test('All and Date support archive search, numeric months and localized month headings', () => {
  assert.equal(filterRolls(rolls, 'Contax', 'all', context()).length, 3);
  assert.equal(filterRolls(rolls, 'Portra', 'date', context()).length, 3);
  assert.equal(filterRolls(rolls, '2026-10', 'date', context()).length, 2);
  for (const language of ['en', 'vi', 'ko']) {
    const heading = groupRolls(rolls, 'date', context(language))[0].title;
    assert.equal(filterRolls(rolls, heading, 'date', context(language)).length, 2);
    assert.equal(groupRolls(rolls, 'all', context(language))[0].title, translations[language].recently);
  }
});

test('Filtered section counts reflect results and blank search preserves source', () => {
  const result = filterRolls(rolls, 'Gangnam', 'location', context());
  assert.equal(groupRolls(result, 'location', context())[0].rolls.length, 1);
  assert.equal(filterRolls(rolls, '  ', 'all', context()), rolls);
});

test('Every mode has a clean empty result and all three locales have feedback strings', () => {
  for (const mode of modes) assert.deepEqual(groupRolls([], mode, context()), []);
  for (const language of ['en', 'vi', 'ko']) {
    for (const key of ['all', 'recently', 'date', 'film', 'camera', 'location', 'noLocation', 'unknownLocation',
      'noRollsYet', 'noDatedRolls', 'noFilmRolls', 'noCameraRolls', 'noLocationRolls', 'rollCountOne', 'rollCountOther']) {
      assert.ok(translations[language][key]);
    }
  }
});

test('Home film grouping and search use per-Roll overrides without changing catalog names', () => {
 const custom = roll('custom', '2026-10', { filmOverride: { brand:'My Fuji', name:'C200 @ 400',iso:400,type:'color',format:'35mm' } });
 const normal = roll('normal','2026-10');
 const ctx = context();
 assert.equal(filterRolls([custom,normal],'My Fuji','film',ctx)[0],custom);
 const groups=groupRolls([custom,normal],'film',ctx);
 assert.equal(groups.length,2);assert.equal(groups[0].title,'My Fuji C200 @ 400');
 assert.equal(ctx.filmNames.get('portra'),'Kodak Portra 400');
});

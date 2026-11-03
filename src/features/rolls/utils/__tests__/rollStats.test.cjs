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

const { computeRollStats } = require('../rollStats.ts');
const { createRollBrowseContext } = require('../rollBrowse.ts');

const films = [
  { id: 'portra', brand: 'Kodak', name: 'Portra 400', type: 'color' },
  { id: 'hp5', brand: 'Ilford', name: 'HP5 Plus', type: 'black-and-white', legacyIds: ['ilford-hp5'] },
];
const cameras = [{ id: 'contax', brand: 'Contax', model: 'T2' }, { id: 'fm2', brand: 'Nikon', model: 'FM2' }];
const context = createRollBrowseContext(films, cameras, 'en');
const photos = count => Array.from({ length: count }, (_, sortOrder) => ({ id: 'p' + sortOrder, sortOrder }));
const roll = (id, date, overrides = {}) => ({
  id, date, filmId: 'portra', filmName: 'Saved name', cameraId: 'contax', cameraName: 'Saved camera',
  format: '35mm', photos: [], ...overrides,
});

test('Counts rolls, photos and this year including legacy exact-day dates', () => {
  const stats = computeRollStats([
    roll('a', '2026-10', { photos: photos(3) }),
    roll('b', '2026-01-15', { photos: photos(2) }),
    roll('c', '2025-12'),
  ], films, context, 2026);
  assert.equal(stats.rollCount, 3);
  assert.equal(stats.photoCount, 5);
  assert.equal(stats.thisYearCount, 2);
  assert.deepEqual(stats.years.map(year => [year.label, year.count]), [['2026', 2], ['2025', 1]]);
});

test('Ranks films and cameras by current catalog names, merging overrides and legacy IDs', () => {
  const stats = computeRollStats([
    roll('a', '2026-10', { filmId: 'hp5', cameraId: 'fm2' }),
    roll('b', '2026-09', { filmId: 'ilford-hp5', cameraId: 'fm2' }),
    roll('c', '2026-08', { filmId: 'custom-x', filmOverride: { brand: 'Ilford', name: 'HP5 Plus', iso: 400, type: 'black-and-white', format: '35mm' } }),
    roll('d', '2026-07'),
  ], films, context, 2026);
  assert.deepEqual(stats.films.map(film => [film.label, film.count]), [['Ilford HP5 Plus', 3], ['Kodak Portra 400', 1]]);
  assert.deepEqual(stats.cameras.map(camera => [camera.label, camera.count]), [['Contax T2', 2], ['Nikon FM2', 2]]);
  assert.deepEqual(stats.types.map(type => [type.key, type.count]), [['color', 1], ['black-and-white', 3]]);
});

test('Ties sort alphabetically, lists are limited and unknown film types are skipped', () => {
  const stats = computeRollStats([
    roll('a', '2026-10', { filmId: 'missing', filmName: 'Zeta' }),
    roll('b', '2026-10', { filmId: 'missing-2', filmName: 'Alpha' }),
    roll('c', '2026-10'),
  ], films, context, 2026, 2);
  assert.deepEqual(stats.films.map(film => film.label), ['Alpha', 'Kodak Portra 400']);
  assert.deepEqual(stats.types.map(type => type.key), ['color']);
});

test('Empty archive has zero totals and empty sections', () => {
  const stats = computeRollStats([], films, context, 2026);
  assert.deepEqual([stats.rollCount, stats.photoCount, stats.thisYearCount], [0, 0, 0]);
  assert.deepEqual([stats.years, stats.films, stats.cameras, stats.types], [[], [], [], []]);
});

const { activityYears, rollShare } = require('../rollStats.ts');

test('One roll retains missing reference photo records and current-year definition', () => {
  const stats = computeRollStats([roll('a', '2025-12-31', { photos: [{ id: 'missing', assetId: 'deleted-asset' }] })], films, context, 2026);
  assert.deepEqual([stats.rollCount, stats.photoCount, stats.thisYearCount], [1, 1, 0]);
  assert.equal(rollShare(stats.cameras[0].count, stats.rollCount), 100);
  assert.equal(rollShare(stats.thisYearCount, stats.rollCount), 0);
});

test('Shares avoid division by zero and use all rolls rather than ranked totals', () => {
  assert.equal(rollShare(0, 0), 0);
  assert.equal(rollShare(2, 3), 67);
  const entries = Array.from({ length: 7 }, (_, i) => roll(String(i), '2026-01', { cameraId: String(i), cameraName: `Camera ${i}`, filmId: `film-${i}`, filmName: `Film ${i}` }));
  const stats = computeRollStats(entries, films, context, 2026);
  assert.equal(stats.films.length, 5);
  assert.equal(stats.cameras.length, 5);
  assert.deepEqual(stats.cameras.map(item => item.label), ['Camera 0', 'Camera 1', 'Camera 2', 'Camera 3', 'Camera 4']);
  assert.equal(rollShare(stats.cameras[0].count, stats.rollCount), 14);
  assert.deepEqual(computeRollStats([...entries].reverse(), films, context, 2026).films, stats.films);
});

test('Activity is chronological with explicit missing years, without mutating statistics', () => {
  const years = [{ key: '2026', label: '2026', count: 2 }, { key: '2024', label: '2024', count: 1 }, { key: '2020', label: '2020', count: 1 }];
  assert.deepEqual(activityYears(years).map(item => [item.label, item.count]), [['2020', 1], ['2021–2023', 0], ['2024', 1], ['2025', 0], ['2026', 2]]);
  assert.equal(years[0].key, '2026');
  assert.deepEqual(activityYears([]), []);
  assert.deepEqual(activityYears([years[0]]), [years[0]]);
});

test('Identically named cameras break ranking ties by persistent ID', () => {
  const entries = [roll('a', '2026-01', { cameraId: 'z', cameraName: 'Same' }), roll('b', '2026-01', { cameraId: 'a', cameraName: 'Same' })];
  const ranked = computeRollStats(entries, films, context, 2026).cameras;
  assert.deepEqual(ranked.map(item => item.key), ['a', 'z']);
  assert.deepEqual(computeRollStats([...entries].reverse(), films, context, 2026).cameras, ranked);
});

const { favoriteRolls } = require('../rollStats.ts');
test('Favorite drilldowns match counts for overrides, legacy film IDs and exact camera IDs', () => {
  const entries = [
    roll('a', '2026-01', { filmId: 'hp5', cameraId: 'fm2' }),
    roll('b', '2026-03', { filmId: 'ilford-hp5' }),
    roll('c', '2026-02', { filmId: 'custom', filmOverride: { brand: 'Ilford', name: 'HP5 Plus', iso: 400, type: 'black-and-white', format: '35mm' } }),
    roll('d', '2026-04'),
  ];
  const stats = computeRollStats(entries, films, context, 2026);
  for (const item of stats.films) assert.equal(favoriteRolls(entries, context, 'film', item.key).length, item.count);
  for (const item of stats.cameras) assert.equal(favoriteRolls(entries, context, 'camera', item.key).length, item.count);
  assert.deepEqual(favoriteRolls(entries, context, 'film', stats.films[0].key).map(item => item.id), ['b', 'c', 'a']);
  assert.deepEqual(favoriteRolls(entries, context, 'camera', 'missing'), []);
  assert.deepEqual(favoriteRolls([], context, 'film', 'missing'), []);
});

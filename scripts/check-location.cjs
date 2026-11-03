const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let permissionCalls = 0;
let positionCalls = 0;
let granted = false;
let addresses = [];
let reverseFails = false;
const native = {
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: async () => { permissionCalls++; return { granted }; },
  getCurrentPositionAsync: async () => { positionCalls++; return { coords: { latitude: 36.625, longitude: 127.45 } }; },
  reverseGeocodeAsync: async () => { if (reverseFails) throw Error('offline'); return addresses; },
  geocodeAsync: async () => [{ latitude: 36.625, longitude: 127.45 }, { latitude: NaN, longitude: 0 }],
};
const moduleObject = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/location/services/locationService.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { module: moduleObject, exports: moduleObject.exports, require: () => native });
const { locationService, locationLabel, isValidLocation } = moduleObject.exports;
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
(async () => {
  assert.equal(permissionCalls, 0, 'no permission requested at startup');
  assert.equal((await locationService.getCurrentLocation()).status, 'denied');
  assert.equal(positionCalls, 0, 'denial must not read coordinates');
  const results = await locationService.search(' Cheongju ');
  assert.equal(results.length, 1); assert.equal(results[0].name, 'Cheongju');
  assert.equal(permissionCalls, 1, 'search must not request device permission');
  const point = { latitude: 36.625, longitude: 127.45 };
  assert.equal(await locationService.reverseGeocode(point), point, 'missing address preserves coordinate');
  reverseFails = true; assert.equal(await locationService.reverseGeocode(point), point);
  reverseFails = false;
  addresses = [{ city: 'Cheongju', region: 'Chungcheongbuk-do', country: 'South Korea' }];
  const resolved = await locationService.reverseGeocode(point);
  assert.equal(resolved.name, 'Cheongju'); assert.ok(resolved.address.includes('South Korea'));
  granted = true; assert.equal((await locationService.getCurrentLocation()).status, 'granted'); assert.equal(positionCalls, 1);
  assert.equal(isValidLocation(undefined), false); assert.equal(isValidLocation('legacy location'), false);
  assert.equal(isValidLocation({ latitude: 91, longitude: 0 }), false);
  assert.equal(locationLabel(point), '36.6250, 127.4500');
  const { useNewRollDraftStore } = require('../src/features/rolls/store/newRollDraftStore.ts');
  const { useRollStore } = require('../src/features/rolls/store/rollStore.ts');
  const draft = useNewRollDraftStore.getState();
  assert.equal(draft.draft.location, undefined);
  draft.update({ location: resolved });
  const roll = useRollStore.getState().createRoll({ ...useNewRollDraftStore.getState().draft, cameraId: 'contax-t2', cameraName: 'Contax T2', filmId: 'kodak-portra-400', filmName: 'Kodak Portra 400' });
  assert.equal(roll.location.latitude, point.latitude); assert.equal(roll.location.address, resolved.address);
  draft.reset(); assert.equal(useNewRollDraftStore.getState().draft.location, undefined);
  assert.equal(useRollStore.getState().rolls.find((item) => item.id === roll.id).location, resolved);
  console.log('PASS: no startup permission, denial, permission-independent native search calls, coordinate validation, geocoding failure/empty fallback, address resolution, draft → Roll → reopen, draft reset.');
})().catch((error) => { console.error(error); process.exitCode = 1; });

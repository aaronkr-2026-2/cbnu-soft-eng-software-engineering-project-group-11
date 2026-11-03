// Run with node scripts/check-roll-flow.cjs. Native gesture integration still needs device testing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
};
const { useNewRollDraftStore } = require('../src/features/rolls/store/newRollDraftStore.ts');
const { useRollStore } = require('../src/features/rolls/store/rollStore.ts');
const { useFilmStore } = require('../src/features/films/store/filmStore.ts');
const { useCameraStore } = require('../src/features/cameras/store/cameraStore.ts');
const { translations } = require('../src/i18n/translations.ts');
const { formatRollMonth } = require('../src/features/rolls/utils/rollMonth.ts');
const originalCount = useRollStore.getState().rolls.length;
const film = useFilmStore.getState().addCustomFilm({ brand: 'Cinestill', name: '800T', iso: 800, type: 'color', format: '35mm' });
const camera = useCameraStore.getState().addCustomCamera({ brand: 'Mamiya', model: 'RZ67 Pro II', format: '120' });
useNewRollDraftStore.getState().update({ filmId: film.id, cameraId: camera.id, format: '120', frameCount: 10, date: '2026-09', lab: 'Oddne', notes: 'Test roll' });
useNewRollDraftStore.getState().update({ filmId: 'kodak-portra-400' });
assert.equal(useNewRollDraftStore.getState().draft.lab, 'Oddne');
assert.equal(useNewRollDraftStore.getState().draft.frameCount, 10);
assert.equal(useRollStore.getState().rolls.length, originalCount, 'draft must not create a Roll');
const draft = useNewRollDraftStore.getState().draft;
const roll = useRollStore.getState().createRoll({ ...draft, cameraName: 'Mamiya RZ67 Pro II', filmName: 'Kodak Portra 400' });
assert.equal(roll.lab, 'Oddne'); assert.equal(roll.cameraId, camera.id); assert.equal(roll.frameCount, 10);
useNewRollDraftStore.getState().reset();
assert.equal(useNewRollDraftStore.getState().draft.filmId, undefined);
assert.equal(useNewRollDraftStore.getState().draft.lab, '');
useRollStore.getState().addPhotosToRoll(roll.id, 'ABCDEF'.split('').map((id, sortOrder) => ({ id, provider: 'apple-photos', assetId: id, thumbnailUri: `file:///${id}.jpg`, sortOrder })));
const before = useRollStore.getState().rolls.find((item) => item.id === roll.id);
const ids = before.photos.map((photo) => photo.id);
const reordered = [ids[0], ids[4], ids[1], ids[2], ids[3], ids[5]];
useRollStore.getState().reorderPhotos(roll.id, reordered);
const saved = useRollStore.getState().rolls.find((item) => item.id === roll.id);
assert.deepEqual(saved.photos.map((photo) => photo.assetId), ['A', 'E', 'B', 'C', 'D', 'F']);
assert.deepEqual(saved.photos.map((photo) => photo.sortOrder), [0, 1, 2, 3, 4, 5]);
assert.deepEqual(before.photos.map((photo) => photo.assetId), ['A', 'B', 'C', 'D', 'E', 'F'], 'do not mutate old state');
useRollStore.getState().reorderPhotos(roll.id, [...reordered.slice(1), reordered[1]]);
assert.equal(useRollStore.getState().rolls.find((item) => item.id === roll.id), saved, 'reject missing/duplicate references');
for (const language of ['vi', 'ko']) {
  assert.deepEqual(Object.keys(translations[language]).sort(), Object.keys(translations.en).sort());
  assert.notEqual(formatRollMonth('2026-09', language), formatRollMonth('2026-09', 'en'));
}
console.log('PASS: custom catalog records, draft isolation/preservation/reset, Lab, 120/10 frames, A E B C D F reorder, stable references, normalization, invalid reorder rejection, translation coverage, localized month.');

// Exercise responder priority without a native renderer: tap, long press, scroll cancellation.
const vm = require('node:vm');
const dragSource = fs.readFileSync('src/features/photos/components/ReorderablePhotoGrid.tsx', 'utf8') + '\nexport { DragTile };';
const dragModule = { exports: {} };
let timer;
const runtime = {
  module: dragModule, exports: dragModule.exports,
  setTimeout: (callback) => { timer = callback; return 1; }, clearTimeout: () => { timer = undefined; },
  require: (name) => {
    if (name === 'react') return { useRef: (current) => ({ current }), useState: (value) => [value, () => {}], useEffect: () => {} };
    if (name === 'react/jsx-runtime') return require('react/jsx-runtime');
    if (name === 'react-native') return { View: 'View', Image: 'Image', Text: 'Text', StyleSheet: { create: (value) => value } };
    if (name.includes('constants/theme')) return { useThemedStyles: () => ({}), spacing: { sm: 8 } };
    if (name.includes('useTranslation')) return { useTranslation: () => ({ t: (key) => key }) };
    throw Error(name);
  },
};
vm.runInNewContext(ts.transpileModule(dragSource, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, runtime);
function tile() {
  const calls = [];
  const element = dragModule.exports.DragTile({ photo: { id: 'E' }, size: 100, active: false, target: false, dx: 0, dy: 0,
    onTap: () => calls.push('tap'), onStart: () => calls.push('start'), onMove: () => calls.push('move'), onEnd: (cancelled) => calls.push(cancelled ? 'cancel' : 'drop'), onAccessibleMove: () => {},
  });
  return { handlers: element.props, calls };
}
const event = (x, y) => ({ nativeEvent: { pageX: x, pageY: y } });
let trial = tile(); trial.handlers.onResponderGrant(event(0, 0)); trial.handlers.onResponderRelease(); assert.deepEqual(trial.calls, ['tap']);
trial = tile(); trial.handlers.onResponderGrant(event(0, 0)); timer(); assert.equal(trial.handlers.onResponderTerminationRequest(), false); trial.handlers.onResponderMove(event(0, -108)); trial.handlers.onResponderRelease(); assert.deepEqual(trial.calls, ['start', 'move', 'drop']);
trial = tile(); trial.handlers.onResponderGrant(event(0, 0)); trial.handlers.onResponderMove(event(0, 30)); assert.equal(timer, undefined); trial.handlers.onResponderRelease(); assert.deepEqual(trial.calls, []);
trial = tile(); trial.handlers.onResponderGrant(event(0, 0)); timer(); trial.handlers.onResponderTerminate(); assert.deepEqual(trial.calls, ['start', 'cancel']);
console.log('PASS: tap opens, long press/drag never taps, scrolling cancels long press, interrupted drag cancels.');

// Editing must be isolated from both saved data and an unfinished New Roll.
const draftStore = useNewRollDraftStore.getState();
draftStore.update({ lab: 'Unfinished new roll' });
draftStore.beginEdit(saved);
assert.equal(useNewRollDraftStore.getState().editDraft.filmId, saved.filmId);
draftStore.updateEdit({ lab: 'Changed lab', notes: 'Edited note', frameCount: 12 });
assert.equal(useRollStore.getState().rolls.find((item) => item.id === saved.id).lab, 'Oddne');
draftStore.endEdit();
assert.equal(useNewRollDraftStore.getState().editDraft, null);
assert.equal(useNewRollDraftStore.getState().draft.lab, 'Unfinished new roll');
draftStore.beginEdit(saved);
draftStore.updateEdit({ lab: '  New lab  ', notes: '', location: undefined });
const edited = useNewRollDraftStore.getState().editDraft;
const countBeforeEdit = useRollStore.getState().rolls.length;
useRollStore.getState().updateRoll(saved.id, { ...edited, filmName: saved.filmName, cameraName: saved.cameraName });
const updated = useRollStore.getState().rolls.find((item) => item.id === saved.id);
assert.equal(useRollStore.getState().rolls.length, countBeforeEdit);
assert.equal(updated.id, saved.id);
assert.equal(updated.photos, saved.photos, 'editing must preserve latest photos and order');
assert.equal(updated.lab, 'New lab');
assert.equal(updated.notes, undefined);
assert.equal(updated.location, undefined);
assert.equal(useNewRollDraftStore.getState().draft.lab, 'Unfinished new roll');
console.log('PASS: edit prefill, cancel isolation, New Roll draft preserved, save in place, photo references/order preserved, optional fields cleared.');

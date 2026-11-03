const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(relative, mocks = {}) {
  const filename = path.resolve(__dirname, relative), exports = {};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('exports', 'require', code)(exports, name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('.')) return load(path.relative(__dirname, path.resolve(path.dirname(filename), name + '.ts')), mocks);
    throw new Error('Unexpected dependency: ' + name);
  });
  return exports;
}
const { buildFilmCoverPrompt } = load('../filmCoverPrompt.ts');
const input = { brand: ' Kodak ', name: 'Portra 400', iso: '400', format: '120', type: 'color', process: 'C-41' };

test('Cover prompt requires exact product data and text-only front-face artwork at the existing ratio', () => {
  const prompt = buildFilmCoverPrompt(input);
  assert.match(prompt, /"brand": "Kodak"/); assert.match(prompt, /"format": "120"/);
  assert.match(prompt, /"iso": 400/); assert.match(prompt, /"process": "C-41"/);
  for (const requirement of ['1230 x 1000', '492 x 400', '1.23:1', 'FRONT PRINTED FACE', 'edge to edge', 'Do not ask me to upload', 'web search is available', 'do not claim the file is exact', 'Do not invent frame count', 'Do not translate labels']) assert.ok(prompt.includes(requirement), requirement);
  assert.match(prompt, /No 3D box/); assert.match(prompt, /brand wordmark/);
  assert.doesNotMatch(prompt, /REFERENCE REQUIRED|request it|attach a clear|ask for a clearer reference/);
  assert.match(prompt, /omit uncertain fine print rather than fabricate it/);
  assert.match(buildFilmCoverPrompt({ ...input, format: 'other', process: '' }), /"process": "not specified"/);
});

test('Missing identity cannot yield a plausible but invented film prompt; user text stays JSON data', () => {
  for (const patch of [{ brand: ' ' }, { name: '' }, { iso: 'bad' }, { iso: '0' }, { iso: '-1' }, { iso: 'Infinity' }, { format: undefined }]) assert.throws(() => buildFilmCoverPrompt({ ...input, ...patch }));
  const name = 'Example "Film"\nEdition';
  assert.ok(buildFilmCoverPrompt({ ...input, name }).includes(JSON.stringify(name.replace(/\s+/g, ' '))));
});

test('Clipboard bridge writes only on request and supports missing/failed old native builds', async () => {
  const writes = [];
  const clipboard = bridge => load('../../services/FilmPromptClipboard.ts', { 'expo-modules-core': { requireOptionalNativeModule: () => bridge } });
  const api = clipboard({ copyText: async value => writes.push(value) });
  assert.equal(writes.length, 0);
  assert.equal(await api.copyFilmPrompt('prompt'), true); assert.deepEqual(writes, ['prompt']);
  assert.equal(await clipboard(null).copyFilmPrompt('prompt'), false);
  assert.equal(await clipboard({}).copyFilmPrompt('prompt'), false);
  assert.equal(await clipboard({ copyText: async () => { throw Error('unavailable'); } }).copyFilmPrompt('prompt'), false);
});

function component(copyResult) {
  const state = [], alerts = [], copied = []; let cursor;
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: { useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Button', StyleSheet: { create: x => x } , Alert: { alert: (...args) => alerts.push(args) } },
    '../../../constants/theme': { useThemedStyles: () => ({}) },
    '../../../i18n/useTranslation': { useTranslation: () => ({ t: key => key }) },
    '../../../components/ui/SelectionChip': { SelectionChip: 'Chip' },
    '../utils/filmCoverPrompt': { buildFilmCoverPrompt },
    '../services/FilmPromptClipboard': { copyFilmPrompt: async text => { copied.push(text); return copyResult; } },
  };
  const { FilmCoverPrompt } = load('../../components/FilmCoverPrompt.tsx', mocks);
  return { alerts, copied, render(props) { cursor = 0; return FilmCoverPrompt(props); } };
}
function nodes(root, type) {
  if (!root || typeof root !== 'object') return [];
  if (Array.isArray(root)) return root.flatMap(node => nodes(node, type));
  return [...(root.type === type ? [root] : []), ...nodes(root.props?.children, type)];
}
const props = { ...input, formats: ['35mm', '120'] };
test('Copy uses current unsaved fields and one selected format without submitting or uploading', async () => {
  const r = component(true);
  let tree = r.render({ ...props, iso: '' });
  assert.equal(nodes(tree, 'Button')[0].props.disabled, true);
  tree = r.render(props); nodes(tree, 'Chip')[1].props.onPress();
  tree = r.render({ ...props, name: 'Updated film' });
  await nodes(tree, 'Button')[0].props.onPress();
  // The UI intentionally launches the async handler without awaiting it.
  await new Promise(resolve => setImmediate(resolve));
  assert.match(r.copied[0], /"productName": "Updated Film"/); assert.match(r.copied[0], /"format": "120"/);
  assert.equal(r.alerts[0][0], 'filmPromptCopied');
});
test('Older native builds expose selectable prompt text instead of claiming a successful copy', async () => {
  const r = component(false);
  nodes(r.render(props), 'Button')[0].props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  const tree = r.render(props);
  assert.equal(r.alerts[0][0], 'filmPromptManualTitle');
  assert.ok(nodes(tree, 'Text').some(node => node.props.selectable && node.props.children.includes('1230 x 1000')));
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(filename) {
  const exports = {};
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(exports, name => load(path.resolve(path.dirname(filename), name + '.ts')));
  return exports;
}
const { buildCameraCoverPrompt } = load(path.resolve(__dirname, '../cameraCoverPrompt.ts'));
test('Camera prompt uses normalized identity, matching cover ratio and complete front-view geometry without an upload requirement', () => {
  const prompt = buildCameraCoverPrompt({ brand: 'leica', model: 'm6', format: '35mm' });
  assert.match(prompt, /"brand": "Leica"/); assert.match(prompt, /"model": "M6"/);
  for (const rule of ['1230 x 1000', '1.23:1', 'FRONT VIEW', '85%', 'Do not ask me to upload', 'Do not substitute', 'Omit uncertain fine lettering', 'do not claim exact dimensions']) assert.ok(prompt.includes(rule), rule);
  for (const data of [{ brand: '', model: 'm6', format: '35mm' }, { brand: 'leica', model: ' ', format: '35mm' }, { brand: 'leica', model: 'm6', format: 'digital' }]) assert.throws(() => buildCameraCoverPrompt(data));
});

test('Camera cover action validates fields, copies current normalized model and falls back to selectable text', async () => {
  for (const result of [true, false]) {
    let cursor = 0; const state = [], copied = [], alerts = [];
    const jsx = (type, props) => ({ type, props });
    const mocks = {
      react: { useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; } },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'react-native': { View: 'View', Text: 'Text', Pressable: 'Button', StyleSheet: { create: value => value }, Alert: { alert: (...args) => alerts.push(args) } },
      '../../../constants/theme': { useThemedStyles: () => ({}) },
      '../../../i18n/useTranslation': { useTranslation: () => ({ t: key => key }) },
      '../../films/services/FilmPromptClipboard': { copyFilmPrompt: async text => { copied.push(text); return result; } },
      '../utils/cameraCoverPrompt': { buildCameraCoverPrompt },
    };
    const exports = {}, filename = path.resolve(__dirname, '../../components/CameraCoverPrompt.tsx');
    new Function('exports', 'require', ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)(exports, name => mocks[name]);
    const render = props => { cursor = 0; return exports.CameraCoverPrompt(props); };
    const nodes = (root, type) => !root || typeof root !== 'object' ? [] : Array.isArray(root) ? root.flatMap(node => nodes(node, type)) : [...(root.type === type ? [root] : []), ...nodes(root.props?.children, type)];
    assert.equal(nodes(render({ brand: '', model: '', format: '35mm' }), 'Button')[0].props.disabled, true);
    const props = { brand: 'leica', model: 'm6', format: '35mm' };
    nodes(render(props), 'Button')[0].props.onPress();
    await new Promise(resolve => setImmediate(resolve));
    assert.match(copied[0], /"brand": "Leica"/); assert.match(copied[0], /"model": "M6"/);
    assert.equal(alerts[0][0], result ? 'filmPromptCopied' : 'filmPromptManualTitle');
    if (!result) assert.ok(nodes(render(props), 'Text').some(node => node.props.selectable && node.props.children.includes('FRONT VIEW')));
  }
});

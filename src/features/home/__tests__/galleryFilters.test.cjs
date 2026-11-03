const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

test('Rapid filter changes preserve gallery and shared Roll keys across groups without an empty render', () => {
  const rolls = [{ id: 'one' }, { id: 'two' }];
  const groupsByMode = new Map();
  const groupsFor = browseMode => {
    if (!groupsByMode.has(browseMode)) groupsByMode.set(browseMode, browseMode === 'all' ? [{ key: 'all', title: 'Recent', rolls }] : rolls.map(roll => ({ key: `${browseMode}:${roll.id}`, title: roll.id, rolls: [roll] })));
    return groupsByMode.get(browseMode);
  };
  let mode = 'all', query = '', memo, dependencies, cursor;
  const scrolls = [];
  const listRef = { current: { scrollToOffset: options => scrolls.push(options) } };
  let layoutMode;
  const jsx = (type, props, key) => ({ type, props, key });
  const mocks = {
    react: {
      useRef: () => listRef,
      useLayoutEffect(fn, deps) { if (layoutMode !== deps[0]) { layoutMode = deps[0]; fn(); } },
      useCallback: fn => fn,
      useState() {
        const index = cursor++;
        return index === 0 ? [mode, value => { mode = value; }] : index === 1 ? [query, value => { query = value; }] : [null, () => {}];
      },
      useMemo(fn, deps) {
        if (!dependencies || deps.some((value, i) => value !== dependencies[i])) { memo = fn(); dependencies = deps; }
        return memo;
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { FlatList: 'FlatList', ScrollView: 'ScrollView', View: 'View', Text: 'Text', Pressable: 'Pressable' },
    'expo-router': { useRouter: () => ({ push() {} }), useFocusEffect() {} },
    '../src/store/app-store': { useAppStore: () => () => {}, homeTourSteps: [] },
    '../src/i18n/useTranslation': { useTranslation: () => ({ t: key => key, language: 'en' }) },
    '../src/constants/theme': { useThemedStyles: () => ({ rollList: { gap: 16 } }) },
    '../src/features/rolls/hooks/useRolls': { useRolls: ({ browseMode }) => ({
      groups: groupsFor(browseMode),
      totalCount: 2, photoCount: 36,
    }) },
  };
  const filename = path.resolve(__dirname, '../../../../app/index.tsx');
  const mod = new Module(filename);
  mod.require = name => mocks[name] ?? new Proxy({}, { get: (_target, key) => key });
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  function render() { cursor = 0; return mod.exports.default().props.children[1]; }
  const initial = render();
  assert.equal(initial.type, 'FlatList');
  assert.equal(initial.key, undefined, 'filter must not key the gallery container');
  let previousKeys = initial.props.data.filter(row => row.kind === 'roll').map(initial.props.keyExtractor);
  for (const next of ['date', 'film', 'camera', 'location', 'all', 'film', 'all']) {
    mode = next;
    const list = render();
    assert.equal(list.type, initial.type); assert.equal(list.key, initial.key);
    const keys = list.props.data.filter(row => row.kind === 'roll').map(list.props.keyExtractor);
    assert.deepEqual(keys, previousKeys, 'Roll cell identity must not depend on its group');
    assert.equal(new Set(list.props.data.map(list.props.keyExtractor)).size, list.props.data.length);
    assert.equal(list.props.data.filter(row => row.kind === 'roll').length, 2);
    previousKeys = keys;
  }
  assert.equal(scrolls.length, 8, 'each filter change resets offset without remounting');
  assert.ok(scrolls.every(options => options.offset === 0 && options.animated === false));
  const stable = render().props.data;
  assert.equal(render().props.data, stable, 'derived rows should reuse a stable groups input');
});

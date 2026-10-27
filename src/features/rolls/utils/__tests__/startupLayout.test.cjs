const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual JSX callbacks, with React's state updater deferred past event release.
function callback(attribute) {
  const filename = path.resolve(__dirname, '../../../../../app/rolls/[id].tsx');
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(source) === attribute && node.initializer && ts.isJsxExpression(node.initializer)) {
      const candidate = node.initializer.expression;
      if (candidate?.getText(source).includes('setViewport')) expression = candidate.getText(source);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(expression, `${attribute} must update the viewport`);
  const queued = [], context = { module: { exports: {} }, setViewport: update => queued.push(update) };
  vm.runInNewContext(ts.transpileModule(`module.exports = (${expression});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return { invoke: context.module.exports, queued };
}

test('Roll Detail snapshots layout before a deferred state reducer runs after event release', () => {
  const { invoke, queued } = callback('onLayout');
  const event = { nativeEvent: { layout: { width: 390, height: 844 } } };
  invoke(event);
  event.nativeEvent = null;
  assert.equal(queued.length, 1);
  const next = queued[0]({ top: 120, height: 0 });
  assert.equal(next.height, 844);
  assert.equal(next.top, 120);
});

test('Roll Detail snapshots scroll offset and preserves the latest viewport height', () => {
  const { invoke, queued } = callback('onScroll');
  const event = { nativeEvent: { contentOffset: { y: 240 } } };
  invoke(event); event.nativeEvent = null;
  const next = queued[0]({ top: 0, height: 844 });
  assert.equal(next.top, 240); assert.equal(next.height, 844);
});

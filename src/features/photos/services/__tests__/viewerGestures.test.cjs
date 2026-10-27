const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Run the actual Viewer gesture declarations with deterministic shared values.
// Native recognizer scheduling and frame smoothness still require an iPhone.
function runtime() {
  const filename = path.resolve(__dirname, '../../components/PhotoViewerModal.tsx');
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const viewer = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'Viewer');
  const declarations = viewer.body.statements.filter(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => ['pan', 'pinch'].includes(d.name.getText(source))));
  assert.equal(declarations.length, 2);
  const s = {};
  for (const name of ['stageW','stageH','fitW','fitH','indexSV','count','stripX','scale','tx','ty','dismissX','dismissY','sheet','sheetH','sheetOpenSV','exit','closing','mode','pinching','rebase','startX','startY','startScale','pinchStartX','pinchStartY','startSheet','originX','originY']) s[name] = { value: 0 };
  Object.assign(s.stageW, { value: 400 }); Object.assign(s.stageH, { value: 800 });
  s.fitW.value = 400; s.fitH.value = 600; s.scale.value = 1; s.count.value = 3; s.sheetH.value = 420;
  const cancelled = [], animations = [], pages = [];
  // Chainable recorder with callback fields exposed separately.
  function recognizer() {
    const handlers = {};
    const chain = new Proxy(handlers, { get: (target, key) => (...args) => { target[key] = args[0]; return chain; } });
    return { chain, handlers };
  }
  const pan = recognizer(), pinch = recognizer();
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const context = {
    ...s, Gesture: { Pan: () => pan.chain, Pinch: () => pinch.chain },
    NONE: 0, PAGE: 1, ZOOM_PAN: 2, DISMISS: 3, SHEET: 4,
    maxScale: 5, pageGap: 20, dismissDistance: 100, dismissVelocity: 800, sheetDistance: 60, sheetVelocity: 500,
    settleSpring: {}, clamp,
    rubberBand: (v, a, b) => v < a ? a - (a - v) / 3 : v > b ? b + (v - b) / 3 : v,
    boundX: scale => Math.max(0, (s.fitW.value * scale - s.stageW.value) / 2),
    boundY: scale => Math.max(0, (s.fitH.value * scale - s.stageH.value) / 2),
    pageOffset: i => -i * 420, settlePage: velocity => pages.push(velocity), settleSheet: () => {},
    cancelAnimation: value => cancelled.push(Object.keys(s).find(key => s[key] === value)),
    withTiming: value => { animations.push('timing'); return value; },
    withSpring: value => { animations.push('spring'); return value; },
    withDecay: () => { animations.push('decay'); return 999; },
    scheduleOnRN: () => {}, onClose: () => {},
  };
  vm.runInNewContext(ts.transpileModule(declarations.map(node => node.getText(source)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return { s, pan: pan.handlers, pinch: pinch.handlers, cancelled, animations, pages };
}
const drag = (extra = {}) => ({ translationX: 0, translationY: 0, velocityX: 300, velocityY: 200, numberOfPointers: 1, ...extra });

test('Pinch cancels live animation and takes over a pan without sharing its anchor', () => {
  const r = runtime(); r.s.scale.value = 2; r.s.tx.value = 30;
  r.pan.onStart(drag({ translationX: 20 }));
  r.pinch.onStart({ focalX: 250, focalY: 400 });
  assert.ok(['scale', 'tx', 'ty', 'stripX', 'dismissX', 'dismissY'].every(key => r.cancelled.includes(key)));
  // A simultaneous pan activation must not recapture anchors or launch inertia.
  r.s.tx.value = 35;
  r.pan.onStart(drag());
  r.pinch.onUpdate({ scale: 1.5, focalX: 260, focalY: 400 });
  assert.equal(r.s.scale.value, 3);
  assert.equal(r.s.tx.value, 30, 'focal transform uses the original pinch anchor');
  const transform = [r.s.tx.value, r.s.ty.value, r.s.scale.value];
  r.pan.onUpdate(drag({ translationX: 120, numberOfPointers: 2 }));
  assert.deepEqual([r.s.tx.value, r.s.ty.value, r.s.scale.value], transform);
  r.pan.onEnd(drag());
  assert.equal(r.animations.length, 0); assert.equal(r.pages.length, 0);
});

test('Pinch can take ownership after two fingers initially classify as paging', () => {
  const r = runtime();
  r.pan.onStart(drag({ translationX: 12, numberOfPointers: 2 }));
  r.pan.onUpdate(drag({ translationX: 40, numberOfPointers: 2 }));
  assert.equal(r.s.stripX.value, 0);
  r.pinch.onStart({ focalX: 200, focalY: 400 });
  r.pinch.onUpdate({ scale: 2, focalX: 200, focalY: 400 });
  assert.equal(r.s.scale.value, 2); assert.equal(r.s.pinching.value, true);
});

test('Pinch finalize (including cancellation) releases ownership and finger lift cannot start decay', () => {
  const r = runtime();
  r.pinch.onStart({ focalX: 200, focalY: 400 });
  r.pinch.onUpdate({ scale: 2, focalX: 230, focalY: 400 });
  r.pinch.onFinalize();
  assert.equal(r.s.pinching.value, false); assert.equal(r.s.rebase.value, true);
  const before = r.animations.length;
  r.pan.onEnd(drag());
  assert.equal(r.animations.length, before); assert.equal(r.pages.length, 0);
});

test('One-finger continuation rebases without a jump and cancels pinch settling first', () => {
  const r = runtime();
  r.pinch.onStart({ focalX: 200, focalY: 400 });
  r.pinch.onUpdate({ scale: 2, focalX: 230, focalY: 400 });
  r.pinch.onFinalize();
  r.pan.onUpdate(drag({ translationX: 90, translationY: 20 }));
  assert.equal(r.s.tx.value, 30); assert.equal(r.s.ty.value, 0);
  assert.equal(r.s.rebase.value, false);
  assert.deepEqual(r.cancelled.slice(-3), ['tx', 'ty', 'scale']);
  r.pan.onUpdate(drag({ translationX: 100, translationY: 25 }));
  assert.equal(r.s.tx.value, 40); assert.equal(r.s.ty.value, 5);
});

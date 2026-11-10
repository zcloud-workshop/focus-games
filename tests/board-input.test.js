import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindBoardButtons, trackInputs } from '../src/engines/board-input.js';
import { definition, mount } from '../src/games/number-mirror.js';
import { definition as mergeDefinition, mount as mountMerge } from '../src/games/number-merge.js';

const makeEvent = (type, fields) => {
  const event = new Event(type, { cancelable: true });
  for (const [key, value] of Object.entries(fields)) Object.defineProperty(event, key, { value });
  return event;
};

test('棋盘按钮区分输入方式, 拒绝右键并忽略兼容点击', () => {
  const root = new EventTarget();
  const controller = new AbortController();
  const button = {};
  const target = { closest: () => button };
  const calls = [];
  const inputs = trackInputs();
  bindBoardButtons(root, 'button', (_, input, at) => { calls.push([input, at]); inputs.add(input); }, controller.signal, () => 999);
  root.dispatchEvent(makeEvent('pointerdown', { target, button: 2, pointerType: 'mouse', timeStamp: 10 }));
  root.dispatchEvent(makeEvent('pointerdown', { target, button: 0, pointerType: 'touch', timeStamp: 20 }));
  root.dispatchEvent(makeEvent('click', { target, detail: 1, timeStamp: 21 }));
  root.dispatchEvent(makeEvent('click', { target, detail: 0, timeStamp: 30 }));
  assert.deepEqual(calls, [['touch', 20], ['keyboard', 30]]);
  assert.equal(inputs.value, 'mixed');
  controller.abort();
  root.dispatchEvent(makeEvent('click', { target, detail: 0, timeStamp: 40 }));
  assert.equal(calls.length, 2);
});

test('数字合并滑动拒绝右键与不匹配的 pointerId', () => {
  const root = new EventTarget();
  root.innerHTML = '';
  root.setPointerCapture = () => {};
  const documentTarget = new EventTarget();
  const originalDocument = globalThis.document;
  globalThis.document = documentTarget;
  const target = { closest: (selector) => selector === '.play-grid' ? {} : null };
  const clock = { performance: { now: () => 0 } };
  try {
    const mode = mergeDefinition.modes[0];
    const cleanup = mountMerge({ root, mode, preset: mode.presets[0], settings: {}, random: () => 0, clock, onFinish: () => {} });
    const initial = root.innerHTML;
    root.dispatchEvent(makeEvent('pointerdown', { target, button: 2, pointerId: 1, pointerType: 'mouse', clientX: 10, clientY: 10 }));
    root.dispatchEvent(makeEvent('pointerup', { target, pointerId: 1, clientX: 110, clientY: 10, timeStamp: 100 }));
    assert.equal(root.innerHTML, initial);
    root.dispatchEvent(makeEvent('pointerdown', { target, button: 0, pointerId: 2, pointerType: 'mouse', clientX: 10, clientY: 10 }));
    root.dispatchEvent(makeEvent('pointerup', { target, pointerId: 3, clientX: 110, clientY: 10, timeStamp: 200 }));
    assert.equal(root.innerHTML, initial);
    root.dispatchEvent(makeEvent('pointerup', { target, pointerId: 2, clientX: 110, clientY: 10, timeStamp: 300 }));
    assert.match(root.innerHTML, /得分 <b>4<\/b>/);
    cleanup();
  } finally {
    globalThis.document = originalDocument;
  }
});

test('限时题以输入事件时间判断截止, 而非处理时钟', () => {
  const root = new EventTarget();
  root.innerHTML = '';
  root.querySelector = () => ({ textContent: '' });
  const documentTarget = new EventTarget();
  const originalDocument = globalThis.document;
  globalThis.document = documentTarget;
  let now = 0;
  const clock = { performance: { now: () => now }, setTimeout: () => 1, clearTimeout: () => {} };
  const button = { dataset: { answer: 'yes' } };
  const target = { closest: () => button };
  try {
    const mode = definition.modes[0];
    const cleanup = mount({ root, mode, preset: mode.presets[0], settings: {}, random: () => 0, clock, onFinish: () => {} });
    now = 120100;
    root.dispatchEvent(makeEvent('pointerdown', { target, button: 0, pointerType: 'touch', timeStamp: 119999 }));
    assert.match(root.innerHTML, /得分 1/);
    root.dispatchEvent(makeEvent('pointerdown', { target, button: 0, pointerType: 'touch', timeStamp: 120000 }));
    assert.match(root.innerHTML, /得分 1/);
    cleanup();
  } finally {
    globalThis.document = originalDocument;
  }
});

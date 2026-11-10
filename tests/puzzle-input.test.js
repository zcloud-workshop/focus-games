import { test } from 'node:test';
import assert from 'node:assert/strict';
import { definition, mount } from '../src/games/puzzle.js';

test('拼图拒绝右键, 长拖动连续交换并按事件时间记录混合输入', () => {
  const context = Object.fromEntries(['fillRect', 'beginPath', 'arc', 'fill', 'moveTo', 'lineTo', 'closePath', 'clearRect', 'drawImage', 'strokeRect'].map((name) => [name, () => {}]));
  class Canvas extends EventTarget {
    getContext() { return context; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 300, height: 300 }; }
    setPointerCapture() {}
  }
  const canvas = new Canvas();
  const preview = new EventTarget();
  preview.setPointerCapture = () => {};
  const file = new EventTarget();
  const status = { textContent: '' };
  const error = { textContent: '' };
  const root = {
    innerHTML: '',
    querySelector(selector) { return { canvas, '[data-preview]': preview, '[data-file]': file, '[data-status]': status, '[data-error]': error }[selector]; },
  };
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: () => new Canvas() };
  const event = (type, fields) => {
    const result = new Event(type);
    for (const [key, value] of Object.entries(fields)) Object.defineProperty(result, key, { value });
    return result;
  };
  const send = (type, fields) => canvas.dispatchEvent(event(type, fields));
  let result;
  try {
    const mode = definition.modes[0];
    const preset = mode.presets[0];
    mount({ root, mode, preset, settings: preset.settings, random: () => 0, clock: { performance: { now: () => 9000 } }, onFinish: (value) => { result = value; } });
    send('pointerdown', { button: 2, pointerId: 1, pointerType: 'mouse', clientX: 250, clientY: 150, timeStamp: 100 });
    send('pointermove', { pointerId: 1, clientX: 50, clientY: 150, timeStamp: 200 });
    assert.equal(status.textContent, '交换 0 次');
    send('pointerdown', { button: 0, pointerId: 2, pointerType: 'touch', clientX: 250, clientY: 150, timeStamp: 800 });
    send('pointermove', { pointerId: 2, clientX: 50, clientY: 150, timeStamp: 1000 });
    assert.equal(status.textContent, '交换 2 次');
    send('pointerup', { pointerId: 2 });
    send('pointerdown', { button: 0, pointerId: 3, pointerType: 'mouse', clientX: 150, clientY: 250, timeStamp: 2800 });
    send('pointermove', { pointerId: 3, clientX: 150, clientY: 50, timeStamp: 3000 });
    assert.equal(result.duration, 2);
    assert.equal(result.input, 'mixed');
    assert.equal(result.metrics.moves, 4);
    assert.equal(result.settings.image, 'default');
  } finally {
    globalThis.document = originalDocument;
  }
});

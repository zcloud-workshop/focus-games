import test from 'node:test';
import assert from 'node:assert/strict';
import { createInputTracker } from '../src/engines/input.js';
function tracker() {
  const handlers = {};
  const root = {};
  const get = createInputTracker({ listen: (_, type, handler) => { handlers[type] = handler; } }, root);
  const target = { closest: () => ({ disabled: false }), matches: () => true };
  return { get, send: (type, event = {}) => handlers[type]({ type, target, key: 'x', ...event }) };
}
test('单一指针、触屏、键盘和实际混合输入分开', () => {
  for (const [pointerType, expected] of [['mouse', 'pointer'], ['touch', 'touch']]) {
    const input = tracker(); input.send('pointerdown', { pointerType }); assert.equal(input.get(), expected);
  }
  const input = tracker(); input.send('keydown'); input.send('input'); assert.equal(input.get(), 'keyboard');
  input.send('pointerdown', { pointerType: 'mouse' }); assert.equal(input.get(), 'mixed');
});
test('输入法或无法判定的输入明确标记 unknown', () => {
  const input = tracker(); input.send('pointerdown', { pointerType: 'touch' }); input.send('input'); assert.equal(input.get(), 'unknown');
  const ime = tracker(); ime.send('compositionstart'); assert.equal(ime.get(), 'unknown');
  assert.equal(tracker().get(), 'unknown');
});

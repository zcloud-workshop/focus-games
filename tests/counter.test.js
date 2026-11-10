import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCounter } from '../src/engines/counter.js';

test('首击启动且计数, 截止边界与自动重复不会加分', () => {
  const counter = createCounter(1000);
  assert.equal(counter.remaining(5000), 1000);
  assert.equal(counter.press(5000), true);
  assert.equal(counter.press(5001, true), false);
  assert.equal(counter.press(5999), true);
  assert.equal(counter.press(6000), false);
  assert.equal(counter.press(4999), false);
  assert.deepEqual(counter.result(), { count: 2, cps: 2, repeats: 1 });
  assert.equal(counter.remaining(9000), 0);
});

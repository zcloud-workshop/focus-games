import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoxScene } from '../src/games/count-boxes.js';

test('箱子场景由受支撑的堆叠构成, 总数始终等于各列高度之和', () => {
  let state = 42;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
  for (let level = 1; level <= 40; level++) {
    const { heights, count } = createBoxScene(level, random);
    assert.equal(heights.length, 9);
    assert.equal(heights.reduce((a, b) => a + b, 0), count);
    assert.equal(count, Math.min(27, level + 2));
    assert.ok(heights.every((height) => height >= 0 && height <= 3));
  }
});

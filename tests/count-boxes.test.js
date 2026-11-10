import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boxProjection, createBoxScene } from '../src/games/count-boxes.js';

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

test('每堆箱子投影分开, 箱数可从可见投影唯一还原', () => {
  for (let pattern = 0; pattern < 4 ** 9; pattern++) {
    let value = pattern;
    const heights = Array.from({ length: 9 }, () => { const height = value % 4; value = Math.floor(value / 4); return height; });
    const projection = boxProjection(heights);
    const seen = new Set(projection.map(({ x, y }) => `${x},${y}`));
    assert.equal(seen.size, projection.length);
    assert.deepEqual(heights.map((_, stack) => projection.filter(({ x }) => x === 4 + stack * 32).length), heights);
  }
});

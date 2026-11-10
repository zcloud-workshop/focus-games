import test from 'node:test';
import assert from 'node:assert/strict';
import { randomDigits, uniquePositions, rotatePosition, makePath } from '../src/engines/sequence.js';
function seeded(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

test('固定种子产生同一数字和不重复格子', () => {
  assert.equal(randomDigits(8, seeded(3)), randomDigits(8, seeded(3)));
  const cells = uniquePositions(5, 20, seeded(5));
  assert.equal(new Set(cells).size, 20);
  assert.deepEqual(cells, uniquePositions(5, 20, seeded(5)));
});
test('旋转 90、180、270 度与四次旋转坐标正确', () => {
  assert.equal(rotatePosition(0, 5, 1), 4);
  assert.equal(rotatePosition(0, 5, 2), 24);
  assert.equal(rotatePosition(0, 5, 3), 20);
  for (let i = 0; i < 25; i++) assert.equal(rotatePosition(i, 5, 4), i);
});
test('路径每步在棋盘内且终点由指令推导', () => {
  const path = makePath(4, 100, seeded(7));
  let row = Math.floor(path.start / 4), column = path.start % 4;
  for (const step of path.steps) {
    if (step === '上') row--; if (step === '下') row++; if (step === '左') column--; if (step === '右') column++;
    assert.ok(row >= 0 && row < 4 && column >= 0 && column < 4);
  }
  assert.equal(path.end, row * 4 + column);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { targetCells, sameCells } from '../src/games/color-block-imprint.js';
test('旋转后的目标集合不受点击顺序影响, 遗漏和误点不能通过', () => {
  const target = targetCells([0, 6, 24], 1);
  assert.deepEqual(target, [4, 8, 20]);
  assert.equal(sameCells([20, 4, 8], target), true);
  assert.equal(sameCells([20, 4], target), false);
  assert.equal(sameCells([20, 4, 7], target), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mirrorGrid } from '../src/engines/transforms.js';

test('镜像逐行左右翻转, 两次镜像还原', () => {
  const cells = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(mirrorGrid(cells, 3), [3, 2, 1, 6, 5, 4]);
  assert.deepEqual(mirrorGrid(mirrorGrid(cells, 3), 3), cells);
});

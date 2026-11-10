import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mirrorGrid, reflectShape, rotateShape, rotationsMatch } from '../src/engines/transforms.js';
import { numberMirrorTrial } from '../src/games/number-mirror.js';

test('镜像逐行左右翻转, 两次镜像还原', () => {
  const cells = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(mirrorGrid(cells, 3), [3, 2, 1, 6, 5, 4]);
  assert.deepEqual(mirrorGrid(mirrorGrid(cells, 3), 3), cells);
});

test('数字镜像题可由固定随机流复现且避开轴对称数字', () => {
  const values = [0.61, 0.51, 0.1];
  assert.deepEqual(numberMirrorTrial(() => values.shift()), { digit: '5', angle: 180, mirrored: true });
});

test('非对称形状的旋转不改变手性, 镜像不等价于旋转', () => {
  const shape = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 2]];
  for (let turns = 0; turns < 4; turns++) {
    assert.equal(rotationsMatch(shape, rotateShape(shape, turns)), true);
    assert.equal(rotationsMatch(shape, rotateShape(reflectShape(shape), turns)), false);
  }
  assert.equal(rotationsMatch(shape, reflectShape(reflectShape(shape))), true);
});

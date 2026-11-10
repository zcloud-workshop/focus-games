import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mirrorGrid, reflectShape, rotateShape, rotationQuestion, rotationShape, rotationsMatch, unfoldHole } from '../src/engines/transforms.js';
import { numberMirrorTrial } from '../src/games/number-mirror.js';
import { foldingQuestion } from '../src/games/paper-folding.js';

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

test('心理旋转每题恰有一个旋转而非镜像选项', () => {
  const shapes = [
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
    [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [0, 2], [2, 3]],
  ];
  for (const shape of shapes) {
    const question = rotationQuestion(shape, () => 0.42);
    assert.equal(new Set(question.choices.map(JSON.stringify)).size, 4);
    assert.deepEqual(question.choices.map((choice) => rotationsMatch(shape, choice)), question.choices.map((_, i) => i === question.answer));
  }
});

test('随机生成的旋转图形具备不同手性与四种不同朝向', () => {
  let state = 42;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
  for (const [size, count] of [[3, 5], [3, 7], [4, 8]]) {
    for (let i = 0; i < 10; i++) {
      const shape = rotationShape(size, count, random);
      assert.equal(shape.length, count);
      assert.equal(new Set([0, 1, 2, 3].map((turns) => JSON.stringify(rotateShape(shape, turns)))).size, 4);
      assert.equal(rotationsMatch(shape, reflectShape(shape)), false);
    }
  }
});

test('折纸按折叠逆序展开, 题目选项唯一', () => {
  const folds = [{ axis: 'x', line: 4 }, { axis: 'y', line: 4 }, { axis: 'x', line: 2 }];
  assert.deepEqual(unfoldHole([0, 1], folds), [[0, 1], [3, 1], [4, 1], [7, 1], [0, 6], [3, 6], [4, 6], [7, 6]]);
  for (const count of [1, 2, 3]) {
    const question = foldingQuestion(count, () => 0.37);
    assert.equal(new Set(question.choices.map(JSON.stringify)).size, 4);
    assert.deepEqual(question.choices[question.answer], unfoldHole(question.hole, folds.slice(0, count)));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { extendSequence, answerSequence } from '../src/games/sequence.js';
test('序列逐步延长且倒序产生相反答案', () => {
  const original = [1, 4, 2];
  assert.deepEqual(extendSequence(original, 3, () => 0.8), [1, 4, 2, 7]);
  assert.deepEqual(answerSequence(original, true), [2, 4, 1]);
  assert.deepEqual(original, [1, 4, 2]);
});

test('挑战每轮独立生成, 相邻位置不同', async () => {
  const { makeChallengeSequence } = await import('../src/games/sequence.js');
  const values = makeChallengeSequence(20, () => 0);
  assert.equal(values.length, 20);
  assert.ok(values.every((value, index) => index === 0 || value !== values[index - 1]));
});

test('跳跃路径按等级增加位置和步数, 起点不算作落点', async () => {
  const { pathLevel, pathPoints, makeLeapRoute } = await import('../src/games/sequence.js');
  assert.deepEqual(pathLevel(1), { pads: 4, jumps: 2 });
  assert.deepEqual(pathLevel(20), { pads: 10, jumps: 9 });
  assert.equal(pathPoints(1, 4999), 170);
  assert.equal(pathPoints(1, 5000), 145);
  const route = makeLeapRoute([1, 3, 5, 7], 4, () => 0);
  assert.equal(route.length, 5);
  assert.ok(route.every((value, index) => index === 0 || value !== route[index - 1]));
});

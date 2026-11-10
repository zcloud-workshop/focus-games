import test from 'node:test';
import assert from 'node:assert/strict';
import { extendSequence, answerSequence } from '../src/games/sequence.js';
test('序列逐步延长且倒序产生相反答案', () => {
  const original = [1, 4, 2];
  assert.deepEqual(extendSequence(original, 3, () => 0.8), [1, 4, 2, 7]);
  assert.deepEqual(answerSequence(original, true), [2, 4, 1]);
  assert.deepEqual(original, [1, 4, 2]);
});

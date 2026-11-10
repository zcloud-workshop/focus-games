import test from 'node:test';
import assert from 'node:assert/strict';
import { makePositionRound } from '../src/games/numbers.js';
test('符号和位置一一对应, 数字与字母顺序清晰', () => {
  const random = () => 0.42;
  const digits = makePositionRound(3, 9, false, random);
  const letters = makePositionRound(3, 9, true, random);
  assert.equal(new Set(digits.map((item) => item.position)).size, 9);
  assert.deepEqual(digits.map((item) => item.label), ['1','2','3','4','5','6','7','8','9']);
  assert.deepEqual(letters.map((item) => item.label), ['A','B','C','D','E','F','G','H','I']);
});

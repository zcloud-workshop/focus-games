import test from 'node:test';
import assert from 'node:assert/strict';
import { levelSettings } from '../src/games/dynamic-visual-acuity-test.js';
test('位数递增且闪现时长不低于底限', () => {
  assert.deepEqual(levelSettings(1), { length: 4, duration: 1000 });
  assert.equal(levelSettings(4).length, 5);
  assert.equal(levelSettings(100).duration, 200);
});

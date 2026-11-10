import test from 'node:test';
import assert from 'node:assert/strict';
import { pictureChoices } from '../src/games/nback.js';
test('图形回溯提供四个唯一选项且恰含一个正确答案', () => {
  const choices = pictureChoices('○', () => 0.27);
  assert.equal(choices.length, 4);
  assert.equal(new Set(choices).size, 4);
  assert.equal(choices.filter((value) => value === '○').length, 1);
});

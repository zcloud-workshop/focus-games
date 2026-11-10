import test from 'node:test';
import assert from 'node:assert/strict';
import { freshDigits, spanAnswer, practiceSheets } from '../src/games/digit-span.js';
test('同长度重试换题, 倒序保留前导零', () => {
  assert.equal(freshDigits(3, '000', () => 0), '001');
  assert.equal(spanAnswer('001', true), '100');
  assert.equal(spanAnswer('100', true), '001');
});
test('练习题与答案使用同一次生成的数字', () => {
  const [questions, answers] = practiceSheets(() => 0);
  assert.match(questions, /000/);
  assert.match(answers, /000 → 000/);
  assert.doesNotMatch(questions, /→/);
});

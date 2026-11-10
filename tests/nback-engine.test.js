import test from 'node:test';
import assert from 'node:assert/strict';
import { makeChannel, scoreChannel, correctCount, jointCorrectCount } from '../src/engines/nback.js';
function seeded(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
test('固定种子可复现, 目标比例两端不会意外匹配', () => {
  const config = { values: ['A', 'B', 'C'], n: 2, count: 20 };
  const matches = makeChannel({ ...config, matchRate: 1, random: seeded(7) });
  const nonmatches = makeChannel({ ...config, matchRate: 0, random: seeded(7) });
  assert.deepEqual(matches, makeChannel({ ...config, matchRate: 1, random: seeded(7) }));
  for (let i = 2; i < matches.length; i++) { assert.equal(matches[i], matches[i - 2]); assert.notEqual(nonmatches[i], nonmatches[i - 2]); }
});
test('预热不计分, 区分命中漏报误报正确拒绝及漏答', () => {
  const result = scoreChannel(['A', 'A', 'B', 'B', 'C', 'C'], 1, [true, true, true, false, false, null]);
  assert.deepEqual(result, { hit: 1, miss: 2, falseAlarm: 1, correctRejection: 1, omitted: 1 });
  assert.equal(correctCount(result), 2);
  assert.equal(scoreChannel(['A','B'], 1, [null, null], true).correctRejection, 1);
});

test('目标漏答计漏报与漏答, 非目标漏答不计正确拒绝', () => {
  const result = scoreChannel(['A', 'A', 'B'], 1, [null, null, null]);
  assert.deepEqual(result, { hit: 0, miss: 1, falseAlarm: 0, correctRejection: 0, omitted: 2 });
  assert.equal(correctCount(result), 0);
});

test('双通道逐题必须两项均正确才能计一次正确', () => {
  const visual = ['A', 'A', 'B'];
  const sounds = ['X', 'Y', 'Y'];
  const responses = [[null, true, false], [null, false, false]];
  assert.equal(jointCorrectCount(visual, sounds, 1, responses, true, true, 2), 1);
});

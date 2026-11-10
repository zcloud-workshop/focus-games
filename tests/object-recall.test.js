import test from 'node:test';
import assert from 'node:assert/strict';
import { makeObjects, scoreRecall } from '../src/games/object-recall.js';

function seeded(seed) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('物品样本固定种子可复现且 12 项不重复', () => {
  const first = makeObjects(seeded(42));
  assert.deepEqual(first, makeObjects(seeded(42)));
  assert.equal(first.length, 12);
  assert.equal(new Set(first.map((item) => item.name)).size, 12);
});

test('自由回忆不计重复, 支持别名并忽略空白及错误', () => {
  const selected = [{ name: '书', aliases: ['书本'] }, { name: '杯子', aliases: ['杯'] }];
  assert.deepEqual(scoreRecall(selected, [' 书本 ', '书', '杯', '杯子', '', '错误']), ['书', '杯子']);
  assert.deepEqual(scoreRecall(selected, ['', '错误']), []);
});

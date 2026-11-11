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

test('来源支持去空格后的部分名称, 每个物品最多计一次', () => {
  const selected = [{ name: '相机', aliases: [] }, { name: '杯子', aliases: [] }];
  assert.deepEqual(scoreRecall(selected, ['相 机', '相', '杯']), ['相机', '杯子']);
});

test('共享单字的一条输入只计一件物品', () => {
  const selected = [{ name: '杯子', aliases: ['杯'] }, { name: '瓶子', aliases: ['瓶'] }, { name: '手机', aliases: [] }, { name: '相机', aliases: ['照相机'] }];
  assert.equal(scoreRecall(selected, ['子']).length, 1);
  assert.equal(scoreRecall(selected, ['机']).length, 1);
  assert.equal(scoreRecall(selected, ['杯', '瓶']).length, 2);
});

test('整词优先分配, 部分词不抢占整词命中', () => {
  const selected = [{ name: '杯子', aliases: ['杯'] }, { name: '瓶子', aliases: ['瓶'] }, { name: '手机', aliases: [] }, { name: '相机', aliases: ['照相机'] }];
  assert.deepEqual(scoreRecall(selected, ['机', '手机']).sort(), ['手机', '相机']);
  assert.equal(scoreRecall(selected, ['手机', '机']).length, 2);
  assert.equal(scoreRecall(selected, ['照相机']).length, 1);
});

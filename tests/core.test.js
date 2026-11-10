import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffle, localDate, summarize, bestRecord, readSaved, nbackSequence } from '../src/core.js';

const record = (game, value, level = 0, date = new Date(2026, 10, 10, 12)) => ({ game, value, level, duration: 30, at: date.toISOString() });

test('洗牌保留所有数字, 不改变原数组', () => {
  const original = Array.from({ length: 25 }, (_, i) => i + 1);
  const result = shuffle(original);
  assert.deepEqual([...result].sort((a, b) => a - b), original);
  assert.notEqual(result, original);
  assert.deepEqual(original, Array.from({ length: 25 }, (_, i) => i + 1));
});

test('个人最佳按游戏和难度隔离, 计时取最小值', () => {
  const records = [record('schulte', 10), record('schulte', 4, 1), record('schulte', 8), record('reaction', 200)];
  assert.equal(bestRecord(records, 'schulte', 0).value, 8);
  assert.equal(bestRecord(records, 'schulte', 1).value, 4);
  assert.equal(bestRecord(records, 'schulte', 2), null);
});

test('准确率和记忆长度取最大值', () => {
  assert.equal(bestRecord([record('stroop', 70), record('stroop', 95)], 'stroop', 0).value, 95);
  assert.equal(bestRecord([record('sequence', 0), record('sequence', 5)], 'sequence', 0).value, 5);
});

test('统计本地日期, 正确累计今日时长和连续天数', () => {
  const now = new Date(2026, 10, 10, 23, 45);
  const records = [record('schulte', 8), record('stroop', 90), record('color', 90, 0, new Date(2026, 10, 9, 23, 59)), record('sequence', 4, 0, new Date(2026, 10, 8, 0, 1))];
  const stats = summarize(records, now);
  assert.equal(stats.today, 2);
  assert.equal(stats.seconds, 60);
  assert.equal(stats.streak, 3);
  assert.equal(stats.week.length, 7);
  assert.equal(stats.week.at(-1).count, 2);
  assert.equal(stats.completed.has('stroop'), true);
  assert.equal(localDate(now), '2026-11-10');
});

test('今天尚未训练时保留截至昨天的连续天数, 中断后归零', () => {
  const records = [record('schulte', 8, 0, new Date(2026, 10, 9)), record('stroop', 90, 0, new Date(2026, 10, 8))];
  assert.equal(summarize(records, new Date(2026, 10, 10)).streak, 2);
  assert.equal(summarize(records, new Date(2026, 10, 11)).streak, 0);
});

test('连续日期可以跨越月末和年末', () => {
  const records = [record('schulte', 8, 0, new Date(2027, 0, 1)), record('schulte', 8, 0, new Date(2026, 11, 31))];
  assert.equal(summarize(records, new Date(2027, 0, 1)).streak, 2);
});

test('读取时过滤无效记录和无效收藏, 保留有效数据', () => {
  const valid = record('schulte', 8);
  const data = { records: [null, valid, { ...valid, level: 8 }, { ...valid, value: -1 }, { ...valid, at: 'invalid' }], favorites: ['schulte', 'missing'] };
  assert.deepEqual(readSaved({ getItem: () => JSON.stringify(data) }), { records: [valid], favorites: ['schulte'] });
});

test('存储损坏或不可用时可继续打开网站', () => {
  assert.deepEqual(readSaved({ getItem: () => '{broken' }), { records: [], favorites: [] });
  assert.deepEqual(readSaved({ getItem: () => { throw new Error('unavailable'); } }), { records: [], favorites: [] });
});

test('本地训练记录保留最新 500 条', () => {
  const data = { records: Array.from({ length: 510 }, (_, i) => record('reaction', i)) };
  const { records } = readSaved({ getItem: () => JSON.stringify(data) });
  assert.equal(records.length, 500);
  assert.equal(records[0].value, 10);
});

test('N-Back 为每种难度生成 20 个可计分比较和预热字母', () => {
  for (const n of [1, 2, 3]) {
    const matching = nbackSequence(n, 20, () => 0);
    const different = nbackSequence(n, 20, () => 0.9);
    assert.equal(matching.length, 20 + n);
    assert.equal(different.length, 20 + n);
    for (let i = n; i < matching.length; i++) assert.equal(matching[i], matching[i - n]);
    for (let i = n; i < different.length; i++) assert.notEqual(different[i], different[i - n]);
  }
});

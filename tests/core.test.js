import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffle, localDate, summarize, nbackSequence } from '../src/core.js';

const record = (game, value, level = 0, date = new Date(2026, 10, 10, 12)) => ({ game, value, level, duration: 30, at: date.toISOString() });

test('洗牌保留所有数字, 不改变原数组', () => {
  const original = Array.from({ length: 25 }, (_, i) => i + 1);
  const result = shuffle(original);
  assert.deepEqual([...result].sort((a, b) => a - b), original);
  assert.notEqual(result, original);
  assert.deepEqual(original, Array.from({ length: 25 }, (_, i) => i + 1));
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

test('练习与工具不改变训练次数、时长和连续天数', () => {
  const now = new Date(2026, 10, 10, 12);
  const stats = summarize([{ ...record('pomodoro', 25), kind: 'tool', duration: 1500 }, { ...record('sequence', 3), scored: false }], now);
  assert.equal(stats.today, 0);
  assert.equal(stats.seconds, 0);
  assert.equal(stats.streak, 0);
  assert.equal(stats.completed.size, 0);
});

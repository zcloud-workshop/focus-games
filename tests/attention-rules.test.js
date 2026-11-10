import test from 'node:test';
import assert from 'node:assert/strict';
import { choiceTrial, choiceMetrics } from '../src/engines/choices.js';
import { inhibitionSummary } from '../src/engines/inhibition.js';
import { pvtMetrics } from '../src/games/pvt.js';
import { makeCard, matchCard } from '../src/games/card-sorting.js';

function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; }; }

test('数字比较不出现相等选项, 答案与数字大小一致', () => {
  const random = seeded(20);
  for (let i = 0; i < 1000; i++) {
    const trial = choiceTrial('number-comparison', {}, random);
    assert.notEqual(trial.options[0], trial.options[1]);
    assert.equal(trial.answer, Number(trial.options[1]) > Number(trial.options[0]) ? 1 : 0);
  }
});

test('四则运算候选唯一且除法可整除', () => {
  const random = seeded(8);
  for (const variant of ['single', 'two-digit', 'multiply']) {
    for (let i = 0; i < 300; i++) {
      const trial = choiceTrial('math', { variant }, random);
      assert.equal(new Set(trial.options).size, 4);
      const [, a, operator, b] = trial.stimulus.match(/^(\d+) ([+−×÷]) (\d+)$/);
      const expected = operator === '+' ? Number(a) + Number(b) : operator === '−' ? Number(a) - Number(b) : operator === '×' ? Number(a) * Number(b) : Number(a) / Number(b);
      assert.ok(Number.isInteger(expected));
      assert.equal(Number(trial.options[trial.answer]), expected);
    }
  }
});

test('干扰试次只把正确反应计入组均值', () => {
  const metrics = choiceMetrics([{ group: 'conflict', correct: true, responseMs: 400 }, { group: 'conflict', correct: false, responseMs: 10 }, { group: 'congruent', correct: true, responseMs: 300 }]);
  assert.equal(metrics.groups.conflict.meanMs, 400);
  assert.equal(metrics.groups.congruent.meanMs, 300);
  assert.equal(metrics.errors, 1);
});

test('抑制任务分别统计漏按与误按', () => {
  const result = inhibitionSummary([{ stop: false, correct: false, response: null }, { stop: false, correct: true, response: 'press' }, { stop: true, correct: false, response: 'press' }, { stop: true, correct: true, response: null }]);
  assert.deepEqual(result, { goCorrect: 1, goTotal: 2, stopCorrect: 1, stopTotal: 2, omissions: 1, falseAlarms: 1 });
});

test('警觉统计排除抢按并计算中位数与走神', () => {
  const result = pvtMetrics([{ valid: false, responseMs: 50 }, { valid: true, responseMs: 200 }, { valid: true, responseMs: 600 }], 500);
  assert.equal(result.early, 1);
  assert.equal(result.medianMs, 400);
  assert.equal(result.lapses, 1);
  assert.equal(result.fastest10Ms, 200);
  assert.equal(result.slowest10Ms, 600);
});

test('分类卡各规则恰有一个匹配选项', () => {
  const random = seeded(1);
  for (let n = 0; n < 100; n++) {
    const card = makeCard(random);
    for (const rule of ['color', 'shape', 'count']) assert.equal([0, 1, 2, 3].filter((index) => matchCard(card, rule, index)).length, 1);
  }
});

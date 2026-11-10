import test from 'node:test';
import assert from 'node:assert/strict';
import { choiceTrial, choiceMetrics, flankerSchedule } from '../src/engines/choices.js';
import { inhibitionSummary, inhibitionUnlock } from '../src/engines/inhibition.js';
import { pvtMetrics } from '../src/games/pvt.js';
import { makeCard, matchCard } from '../src/games/card-sorting.js';
import { definition as stopDefinition } from '../src/games/stop-signal.js';

function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; }; }

test('数字比较不出现相等选项, 答案与数字大小一致', () => {
  const random = seeded(20);
  for (let i = 0; i < 1000; i++) {
    const trial = choiceTrial('number-comparison', {}, random);
    assert.notEqual(trial.options[0], trial.options[1]);
    assert.ok(trial.options.every((option) => Number(option) >= 10 && Number(option) <= 99));
    assert.ok(Math.abs(Number(trial.options[0]) - Number(trial.options[1])) >= 2);
    assert.equal(trial.answer, Number(trial.options[1]) > Number(trial.options[0]) ? 1 : 0);
  }
});

test('侧翼练习及正式试次按类型与方向平衡', () => {
  const trials = flankerSchedule(seeded(42));
  const practice = trials.slice(0, 4);
  const formal = trials.slice(4);
  assert.equal(practice.filter((trial) => trial.group === 'congruent').length, 2);
  for (const [group, count] of [['congruent', 16], ['conflict', 16], ['neutral', 8]]) {
    const groupTrials = formal.filter((trial) => trial.group === group);
    assert.equal(groupTrials.length, count);
    assert.equal(groupTrials.filter((trial) => trial.direction === 0).length, count / 2);
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

test('色词反向模式答案取字义, 而正向模式取显示颜色', () => {
  const options = { colors: 3, variant: 'word' };
  const reverse = choiceTrial('stroop', options, seeded(42));
  const ink = choiceTrial('stroop', { ...options, variant: 'ink' }, seeded(42));
  const word = reverse.stimulus.match(/>([^<]+)<\/span>/)[1];
  assert.equal(reverse.options[reverse.answer], `${word}色`);
  assert.equal(reverse.stimulus, ink.stimulus);
  if (reverse.group === 'conflict') assert.notEqual(reverse.answer, ink.answer);
});

test('线索有效与无效比例两端按规则生成', () => {
  const valid = choiceTrial('posner-cue', { validRate: 100 }, seeded(2));
  const invalid = choiceTrial('posner-cue', { validRate: 0 }, seeded(2));
  assert.equal(valid.group, 'valid');
  assert.equal(invalid.group, 'invalid');
  assert.notEqual(valid.cue, invalid.cue);
});

test('规则切换比例两端分别保持与切换上一规则', () => {
  const same = choiceTrial('task-switching', { order: 'random', switchRate: 0 }, seeded(2), 1, '0');
  const switched = choiceTrial('task-switching', { order: 'random', switchRate: 100 }, seeded(2), 1, '0');
  assert.equal(same.group, '0');
  assert.equal(switched.group, '1');
});

test('抑制任务分别统计漏按与误按', () => {
  const result = inhibitionSummary([{ stop: false, correct: false, response: null }, { stop: false, correct: true, response: 'press' }, { stop: true, correct: false, response: 'press' }, { stop: true, correct: true, response: null }]);
  assert.deepEqual(result, { goCorrect: 1, goTotal: 2, stopCorrect: 1, stopTotal: 2, omissions: 1, falseAlarms: 1 });
});

test('响应抑制只在对应预设达到门槛时解锁下一档', () => {
  assert.deepEqual(inhibitionUnlock('gonogo', { id: 'beginner' }, { stopTotal: 20, stopCorrect: 16 }), []);
  assert.deepEqual(inhibitionUnlock('gonogo', { id: 'beginner' }, { stopTotal: 20, stopCorrect: 17 }), ['gonogo|signals|standard']);
  assert.deepEqual(inhibitionUnlock('gonogo', { id: 'standard' }, { stopTotal: 10, stopCorrect: 9 }), ['gonogo|signals|fast']);
  assert.deepEqual(inhibitionUnlock('stop-signal', { id: 'beginner' }, { stopTotal: 5, stopCorrect: 4 }), ['stop-signal|stop|standard']);
  assert.deepEqual(inhibitionUnlock('stop-signal', { id: 'standard' }, { stopTotal: 4, stopCorrect: 3 }), ['stop-signal|stop|fast']);
  assert.deepEqual(inhibitionUnlock('sart', { id: 'beginner' }, { stopTotal: 10, stopCorrect: 10 }), []);
});

test('停止信号的延迟范围必须先于响应窗结束', () => {
  const validate = stopDefinition.modes[0].validateSettings;
  assert.equal(validate({ delayMin: 150, delayMax: 400, window: 1200 }), '');
  assert.ok(validate({ delayMin: 400, delayMax: 150, window: 1200 }));
  assert.ok(validate({ delayMin: 150, delayMax: 1200, window: 1200 }));
});

test('警觉统计排除抢按并计算中位数与走神', () => {
  const result = pvtMetrics([{ valid: false, responseMs: 50 }, { valid: true, responseMs: 200 }, { valid: true, responseMs: 600 }], 500);
  assert.equal(result.early, 1);
  assert.equal(result.medianMs, 400);
  assert.equal(result.lapses, 1);
  assert.equal(result.fastest10Ms, 200);
  assert.equal(result.slowest10Ms, 600);
  assert.equal(pvtMetrics([{ valid: true, responseMs: 500 }], 500).lapses, 1);
});

test('分类卡各规则恰有一个匹配选项', () => {
  const random = seeded(1);
  for (let n = 0; n < 100; n++) {
    const card = makeCard(random);
    for (const rule of ['color', 'shape', 'count']) assert.equal([0, 1, 2, 3].filter((index) => matchCard(card, rule, index)).length, 1);
  }
});

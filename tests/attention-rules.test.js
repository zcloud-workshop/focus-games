import test from 'node:test';
import assert from 'node:assert/strict';
import { choiceTrial, choiceMetrics, flankerSchedule, numberChallenge } from '../src/engines/choices.js';
import { inhibitionSummary, inhibitionUnlock, mountInhibition } from '../src/engines/inhibition.js';
import { pvtMetrics } from '../src/games/pvt.js';
import { makeCard, matchCard, nextCardRule } from '../src/games/card-sorting.js';
import { highestNumberLevel } from '../src/games/number-comparison.js';
import { reactionUnlock } from '../src/games/reaction.js';
import { breathUnlock } from '../src/games/breath.js';

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

test('数字比较按等级验证次数与正确率, 已解锁等级可恢复', () => {
  assert.equal(numberChallenge(1, 25, 22).achieved, false);
  assert.equal(numberChallenge(1, 25, 23).achieved, true);
  assert.equal(numberChallenge(2, 28, 26).targetAttempts, 28);
  assert.equal(numberChallenge(2, 28, 26).achieved, false);
  assert.equal(numberChallenge(2, 28, 27).achieved, true);
  assert.equal(highestNumberLevel({ unlocks: { 'number-comparison|level|3': {}, other: {} } }), 3);
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
  assert.deepEqual(inhibitionUnlock('sart', { id: 'slow' }, { stopTotal: 25, stopCorrect: 22 }), ['sart|digits|standard']);
  assert.deepEqual(inhibitionUnlock('sart', { id: 'standard' }, { stopTotal: 25, stopCorrect: 23 }), ['sart|digits|fast']);
  assert.deepEqual(inhibitionUnlock('sart', { id: 'beginner' }, { stopTotal: 10, stopCorrect: 10 }), []);
});

test('倒计时输入被忽略, 响应立即归属当前试次且重复按键不重复结算', () => {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  const frames = new Map();
  const clock = {
    performance: { now: () => now },
    setTimeout(fn, delay) { const id = ++nextId; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { const id = ++nextId; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    advance(ms) { now += ms; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); } },
    paint() { const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn(now)); },
  };
  const previousDocument = globalThis.document;
  globalThis.document = new EventTarget();
  const root = new EventTarget();
  root.innerHTML = '';
  const outcomes = [];
  const key = () => {
    const event = new Event('keydown', { cancelable: true });
    Object.defineProperties(event, { code: { value: 'Space' }, repeat: { value: false }, timeStamp: { value: now } });
    globalThis.document.dispatchEvent(event);
  };
  try {
    const preset = { id: 'beginner', settings: { count: 1, stopRate: 100, window: 1500, interval: 400 } };
    const stop = mountInhibition({ root, mode: { id: 'signals', ruleVersion: 3 }, preset, settings: preset.settings, onFinish: (result) => outcomes.push(result), random: () => 0, clock, kind: 'gonogo' });
    key();
    clock.advance(3000); clock.paint(); clock.advance(100);
    key(); key();
    clock.advance(400);
    assert.equal(outcomes.length, 1);
    assert.equal(outcomes[0].trials.length, 1);
    assert.equal(outcomes[0].metrics.falseAlarms, 1);
    assert.equal(outcomes[0].input, 'keyboard');
    stop();
  } finally { globalThis.document = previousDocument; }
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

test('分类规则切换到随机的其他规则', () => {
  for (let index = 0; index < 3; index++) {
    const next = [nextCardRule(index, () => 0), nextCardRule(index, () => 0.99)];
    assert.equal(new Set(next).size, 2);
    assert.ok(next.every((value) => value !== index));
  }
});

test('反应解锁严格小于阈值, 中级呼吸完成同时解锁两种模式', () => {
  assert.equal(reactionUnlock('beginner', 300), null);
  assert.equal(reactionUnlock('beginner', 299), 'reaction|staged|intermediate');
  assert.equal(reactionUnlock('intermediate', 250), null);
  assert.equal(reactionUnlock('intermediate', 249), 'reaction|staged|advanced');
  assert.deepEqual(breathUnlock('intermediate', 2), []);
  assert.deepEqual(breathUnlock('intermediate', 3), ['breath|staged|advanced', 'breath|staged|box']);
  assert.deepEqual(breathUnlock('advanced', 3), []);
});

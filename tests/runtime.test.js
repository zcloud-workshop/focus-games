import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, inputTime } from '../src/engines/runtime.js';
import { meanValidResponses, presentOnFrame } from '../src/engines/trials.js';
import { breathPhase } from '../src/games/breath.js';

function fakeClock() {
  let time = 0;
  let next = 0;
  const timers = new Map();
  const frames = new Map();
  return {
    performance: { now: () => time },
    setTimeout: (fn) => { timers.set(++next, fn); return next; },
    clearTimeout: (id) => timers.delete(id),
    requestAnimationFrame: (fn) => { frames.set(++next, fn); return next; },
    cancelAnimationFrame: (id) => frames.delete(id),
    advance: (value) => { time = value; },
    paint: () => { const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn(time)); },
    fire: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach((fn) => fn()); },
  };
}

test('结束只提交一次并取消尚未触发的计时和帧', () => {
  const clock = fakeClock();
  const outcomes = [];
  const runtime = createRuntime({ clock, onFinish: (result) => outcomes.push(result) });
  let called = 0;
  runtime.later(() => called++, 10);
  runtime.frame(() => called++);
  clock.advance(1500);
  runtime.finish({ value: 1 });
  runtime.finish({ value: 2 });
  clock.fire(); clock.paint();
  assert.deepEqual(outcomes, [{ value: 1, duration: 1.5 }]);
  assert.equal(called, 0);
});

test('呈现与响应时间使用帧和输入事件时间, 无有效样本不造零', () => {
  const clock = fakeClock();
  const runtime = createRuntime({ clock, onFinish: () => {} });
  const order = [];
  presentOnFrame(runtime, () => order.push('draw'), (at) => order.push(at));
  clock.advance(120);
  clock.paint();
  assert.deepEqual(order, ['draw', 120]);
  assert.equal(inputTime({ timeStamp: 320 }, runtime.now), 320);
  assert.equal(meanValidResponses([{ valid: false, responseMs: 0 }]), null);
  assert.equal(meanValidResponses([{ valid: true, responseMs: 200 }, { valid: true, responseMs: 300 }, { valid: false, responseMs: 1 }]), 250);
  runtime.cleanup();
});

test('呼吸四阶段与周期边界清晰, 无呼后屏息时直接进入下一轮', () => {
  const box = { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 };
  assert.equal(breathPhase(0, box).label, '吸气');
  assert.equal(breathPhase(4, box).label, '屏息');
  assert.equal(breathPhase(8, box).label, '呼气');
  assert.equal(breathPhase(12, box).label, '屏息');
  assert.deepEqual(breathPhase(16, box), { label: '吸气', remaining: 4, progress: 0, cycles: 1 });
  assert.equal(breathPhase(19, { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 }).cycles, 1);
});

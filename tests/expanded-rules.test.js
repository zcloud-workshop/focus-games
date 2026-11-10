import { test } from 'node:test';
import assert from 'node:assert/strict';
import { differentBoard } from '../src/games/difference.js';
import { schulteItems, targetOrder, circularSlots } from '../src/games/schulte.js';
import { changeScene } from '../src/games/change-blindness.js';
import { letterRound } from '../src/games/rsvp.js';
import { timingError } from '../src/games/time.js';
import { nextExposure, decisionPoints, endlessRound } from '../src/games/field-of-view.js';
import { trackingTargets, moveTargets } from '../src/games/mot.js';
import { initialTimer, nextPhase, timerRemaining } from '../src/games/pomodoro.js';
import { angularDelta, gestureStep } from '../src/games/bamboo-cicada.js';
import { createCounter } from '../src/engines/counter.js';

const seeded = (seed = 29) => () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };

test('视觉搜索每题只有一个目标, 数字序列与奇偶过滤正确', () => {
  for (const size of [3,6,10]) {
    const a = differentBoard(size,2,seeded());
    assert.equal(a.cells.filter((c) => c === a.cells[a.target]).length,1);
    assert.deepEqual(a,differentBoard(size,2,seeded()));
    const scene = changeScene(size,seeded());
    assert.equal(scene.base.filter((value,i) => value !== scene.changed[i]).length,1);
  }
  const {cells,labels} = schulteItems('numbers',5,seeded());
  assert.equal(new Set(cells.map((c) => c.index)).size,25);
  assert.equal(labels.at(-1),'25');
  assert.deepEqual(targetOrder(3,'odd'),[0,2,4,6,8]);
  assert.deepEqual(targetOrder(3,'even'),[1,3,5,7]);
  assert.equal(targetOrder(3,'descending')[0],8);
  for (const count of [16,25,36,49,64,81]) {
    const slots = circularSlots(count);
    assert.equal(slots.length,count);
    for (const [i,a] of slots.entries()) for (const b of slots.slice(i+1)) assert.ok(Math.hypot(a.x-b.x,a.y-b.y) > 0.08);
  }
});

test('快速字母流提供六个唯一选项, 时间偏差保留正负号', () => {
  const letters = letterRound({count:20,targets:3},seeded());
  assert.equal(letters.letters.filter((item) => item.target).length,3);
  assert.equal(letters.letters.slice(0,2).some((item) => item.target),false);
  assert.equal(new Set(letters.choices).size,6);
  assert.ok(letters.targets.every((letter) => letters.choices.includes(letter)));
  assert.deepEqual(timingError(9.5,10),{actual:9.5,target:10,signed:-0.5,absolute:0.5});
  assert.equal(nextExposure(120,true),120);
  assert.equal(nextExposure(2200,false),2200);
  assert.equal(nextExposure(1200,true,true),1260);
  assert.equal(decisionPoints(true,1200,1),100);
  assert.equal(decisionPoints(false,1200,3),0);
  assert.equal(decisionPoints(true,120,3),375);
  assert.deepEqual(endlessRound(0),{fieldLevel:1,exposureMs:2000});
  assert.equal(endlessRound(8).fieldLevel,2);
  assert.deepEqual(trackingTargets(8,3,seeded()),trackingTargets(8,3,seeded()));
  assert.equal(trackingTargets(8,3,seeded()).size,3);
});

test('番茄钟用绝对截止时间校正, 跳过不增加完成量, 第四次为长休息', () => {
  let state = initialTimer({focus:25,short:5,long:15,every:4},'session');
  assert.equal(nextPhase(state,false).completedFocus,0);
  assert.equal(nextPhase(state,false).phase,'short');
  state = {...state,running:true,deadline:100000,remaining:20000};
  assert.equal(timerRemaining(state,90000),10000);
  assert.equal(timerRemaining(state,200000),0);
  for (let i = 0; i < 4; i++) {
    state = nextPhase(state,true);
    assert.equal(state.phase,i === 3 ? 'long' : 'short');
    if (i < 3) state = nextPhase(state,true);
  }
  assert.equal(state.completedFocus,4);
  assert.equal(state.remaining,900000);
});

test('竹知了手动整圈跨越角度边界, 小幅抖动不计圈', () => {
  assert.ok(Math.abs(angularDelta(Math.PI - 0.1,-Math.PI + 0.1) - 0.2) < 1e-8);
  let state = {angle:null,at:0,progress:0,turns:0,velocity:0};
  for (let i = 0; i <= 100; i++) state = gestureStep(state,i * Math.PI * 4 / 100,i * 20,0.4);
  assert.ok(state.turns >= 1 && state.turns <= 2);
  let jitter = {angle:null,at:0,progress:0,turns:0,velocity:0};
  for (let i = 0; i < 100; i++) jitter = gestureStep(jitter,i % 2 ? 0.1 : 0,i * 20,0.4);
  assert.equal(jitter.turns,0);
});

test('来源 B 点击计速的首击只启动, 后续点击和边界按实际规则计数', () => {
  const counter = createCounter(3000,false);
  assert.equal(counter.press(1000),true);
  assert.equal(counter.result().count,0);
  counter.press(1001);
  counter.press(4000);
  assert.equal(counter.result().count,1);
  assert.equal(counter.result().cps,1 / 3);
});

test('移动追踪在低帧率仍按实际时间推进并维持可点击目标间距', () => {
  const lone = [{x:0.2,y:0.2,vx:0.3,vy:0.2}];
  const whole = moveTargets(lone,1,220,300)[0];
  let frames = lone;
  for (let i = 0; i < 10; i++) frames = moveTargets(frames,0.1,220,300);
  assert.ok(Math.abs(whole.x - frames[0].x) < 1e-8);
  const random = seeded(4);
  let particles = Array.from({length:12},(_,i) => ({x:(i % 4 + 0.5) / 4,y:(Math.floor(i / 4) + 0.5) / 3,vx:(random() - 0.5) * 0.5,vy:(random() - 0.5) * 0.5}));
  for (let i = 0; i < 300; i++) particles = moveTargets(particles,1 / 60,220,300);
  for (let i = 0; i < particles.length; i++) for (const b of particles.slice(i + 1)) assert.ok(Math.hypot((particles[i].x-b.x)*220,(particles[i].y-b.y)*300) >= 35.8);
});

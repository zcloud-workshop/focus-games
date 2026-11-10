import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rgbToLab, labToRgb, deltaE, colorPair, scatter, trailSequence } from '../src/engines/grid.js';
import { advanceParticle, animate, RINGS, ringRotation } from '../src/engines/animation.js';

test('Lab 转换遵循 D65, 色差使用实际 RGB 的 CIE1976 距离', () => {
  assert.ok(deltaE(rgbToLab([255, 255, 255]), [100, 0, 0]) < 0.01);
  assert.deepEqual(labToRgb(rgbToLab([47, 103, 180])), [47, 103, 180]);
  const pair = colorPair(8, () => 0.5);
  assert.ok(pair.delta > 7.5 && pair.delta < 8.5);
  assert.equal(pair.delta, deltaE(rgbToLab(pair.base), rgbToLab(pair.target)));
});

test('散点不重叠, A/B 连线序列有且只有 25 个目标', () => {
  const points = scatter(25, () => 0.3);
  assert.equal(points.length, 25);
  for (const [i, a] of points.entries()) for (const b of points.slice(i + 1)) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 0.15);
  assert.equal(trailSequence('A').at(-1), '25');
  assert.deepEqual(trailSequence('B').slice(0, 5), ['1', 'A', '2', 'B', '3']);
  assert.equal(trailSequence('B').at(-1), '13');
});

test('动态刺激按时间运动, 反弹后保持边界且三个圆环独立旋转', () => {
  const particle = advanceParticle({ x: 0.9, y: 0.2, vx: 0.4, vy: -0.4 }, 1);
  assert.ok(Math.abs(particle.x - 0.7) < 1e-8);
  assert.ok(Math.abs(particle.y - 0.2) < 1e-8);
  assert.equal(particle.vx, -0.4);
  assert.equal(particle.vy, 0.4);
  assert.notEqual(ringRotation(0,0), ringRotation(0,1));
  assert.equal(RINGS.reduce((sum, ring) => sum + ring.count, 0),42);
  assert.deepEqual(RINGS.map((r) => r.count),[6,12,24]);
  assert.ok(ringRotation(1,1) < ringRotation(1,0));
});

test('连续动画不截断低帧率下的实际经过时间', () => {
  let callback;
  let elapsed;
  const runtime = { now: () => 0, frame: (next) => { callback = next; } };
  animate(runtime,(seconds) => { elapsed = seconds; });
  callback(250);
  assert.equal(elapsed,0.25);
  callback(1250);
  assert.equal(elapsed,1);
});

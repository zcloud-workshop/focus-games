import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boxProjection, createBoxScene, definition, mount } from '../src/games/count-boxes.js';

test('箱子场景由受支撑的堆叠构成, 总数始终等于各列高度之和', () => {
  let state = 42;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
  const ranges = [[3, 4], [4, 6], [5, 7], [7, 9], [3, 4], [20, 23]];
  for (let level = 1; level <= 6; level++) {
    const { heights, count } = createBoxScene(level, random);
    assert.equal(heights.length, 9);
    assert.equal(heights.reduce((a, b) => a + b, 0), count);
    assert.ok(count >= ranges[level - 1][0] && count <= ranges[level - 1][1]);
    assert.ok(heights.every((height) => height >= 0 && height <= 3));
  }
});

test('每堆箱子投影分开, 箱数可从可见投影唯一还原', () => {
  for (let pattern = 0; pattern < 4 ** 9; pattern++) {
    let value = pattern;
    const heights = Array.from({ length: 9 }, () => { const height = value % 4; value = Math.floor(value / 4); return height; });
    const projection = boxProjection(heights);
    const seen = new Set(projection.map(({ x, y }) => `${x},${y}`));
    assert.equal(seen.size, projection.length);
    assert.deepEqual(heights.map((_, stack) => projection.filter(({ x }) => x === 4 + stack * 32).length), heights);
  }
});

test('数箱子六关中答错后继续, 按正确关数结算', () => {
  const root = new EventTarget();
  root.innerHTML = '';
  const scene = { innerHTML: '' };
  const svg = { style: {} };
  const input = { value: '', focus() {} };
  root.querySelector = (selector) => ({ '[data-scene]': scene, '[data-scene] svg': svg, input })[selector];
  let now = 0;
  const frames = [];
  const timers = [];
  const clock = {
    performance: { now: () => now },
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    cancelAnimationFrame() {},
    setTimeout(callback, delay) { timers.push({ callback, delay }); return timers.length; },
    clearTimeout() {},
  };
  let result;
  const mode = definition.modes[0];
  mount({ root, mode, preset: mode.presets[0], settings: {}, random: () => 0, clock, onFinish: (value) => { result = value; } });
  const runFrame = () => frames.shift()(now);
  const runTimer = () => { const timer = timers.shift(); now += timer.delay; timer.callback(); };
  for (let level = 1; level <= 6; level++) {
    runFrame();
    if (level >= 2 && level <= 4) { now += 3000; runFrame(); }
    else { runTimer(); runFrame(); }
    input.value = String(createBoxScene(level, () => 0).count + (level === 1 ? 1 : 0));
    root.dispatchEvent(new Event('submit', { cancelable: true }));
    if (level === 1) assert.equal(result, undefined);
    runTimer();
  }
  assert.equal(result.value, 83);
  assert.equal(result.metrics.correct, 5);
  assert.equal(result.trials.length, 6);
});

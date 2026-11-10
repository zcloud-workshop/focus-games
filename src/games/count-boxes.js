export const definition = {
  id: 'count-boxes',
  modes: [{
    id: 'levels', name: '数箱子', ruleVersion: 2,
    presets: [{ id: 'standard', name: '逐关挑战', settings: {} }],
    score: { unit: '关', lower: false, min: 0 }, hiddenPolicy: 'invalidate',
    inputs: ['keyboard', 'pointer', 'touch', 'mixed'], warning: '本训练会短暂显示图形.',
    rule: '观察一排箱子堆叠, 消失后输入总数.'
  }]
};

export function createBoxScene(level, random = Math.random) {
  const heights = Array(9).fill(0);
  const count = Math.min(27, level + 2);
  for (let i = 0; i < count; i++) {
    const available = heights.flatMap((height, index) => height < 3 ? [index] : []);
    heights[available[Math.floor(random() * available.length)]]++;
  }
  return { heights, count };
}

export function boxProjection(heights) {
  return heights.flatMap((height, stack) => Array.from({ length: height }, (_, z) => ({ x: 4 + stack * 32, y: 75 - z * 20 })));
}

function sceneSvg(heights) {
  const cubes = boxProjection(heights).map(({ x, y }) => `<path d="M ${x} ${y} l 5 -5 20 0 -5 5 Z" fill="#b8d5ed" stroke="#536b7c"/><path d="M ${x} ${y} h 20 v 15 h -20 Z" fill="#81add0" stroke="#536b7c"/><path d="M ${x + 20} ${y} l 5 -5 v 15 l -5 5 Z" fill="#5b8fb7" stroke="#536b7c"/>`);
  return `<svg viewBox="0 0 288 100" style="width:100%;max-width:400px" role="img" aria-label="一排箱子堆叠">${cubes.join('')}</svg>`;
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const started = clock.performance.now();
  let scene;
  let completed = 0;
  let displayedAt;
  let timer;
  let frame;
  let active = true;
  let accepting = false;
  const inputs = trackInputs();
  let lastAt;
  const exposures = [];
  const cleanup = () => { active = false; controller.abort(); clock.clearTimeout(timer); clock.cancelAnimationFrame(frame); };
  const next = () => {
    accepting = false;
    scene = createBoxScene(completed + 1, random);
    root.innerHTML = `<div class="game-status"><span>第 ${completed + 1} 关</span><span>观察箱子</span></div><div style="text-align:center" data-scene></div>`;
    frame = clock.requestAnimationFrame(() => {
      if (!active) return;
      root.querySelector('[data-scene]').innerHTML = sceneSvg(scene.heights);
      displayedAt = clock.performance.now();
      timer = clock.setTimeout(() => { frame = clock.requestAnimationFrame(() => {
        if (!active) return;
        exposures.push(clock.performance.now() - displayedAt);
        accepting = true;
        root.innerHTML = `<div class="game-status"><span>第 ${completed + 1} 关</span><span>输入箱子总数</span></div><form class="number-form"><label>共有多少箱?<input type="number" min="1" max="27" inputmode="numeric" required></label><button class="button primary">确认</button></form>`;
        root.querySelector('input').focus();
      }); }, 2000);
    });
  };
  root.addEventListener('pointerdown', (event) => {
    if (!accepting || event.button !== 0 || !event.target.closest('input, button')) return;
    inputs.add(inputMethod(event));
    lastAt = inputTime(event, () => clock.performance.now());
  }, { signal: controller.signal });
  root.addEventListener('keydown', (event) => {
    if (!accepting || event.repeat) return;
    inputs.add('keyboard');
    lastAt = inputTime(event, () => clock.performance.now());
  }, { signal: controller.signal });
  root.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!accepting || !active) return;
    accepting = false;
    if (Number(root.querySelector('input').value) === scene.count) { completed++; next(); return; }
    const duration = Math.max(0, (lastAt ?? inputTime(event, () => clock.performance.now())) - started) / 1000;
    cleanup();
    onFinish({ value: completed, detail: `完成 ${completed} 关, 本关共有 ${scene.count} 箱`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputs.value, endReason: 'incorrect', scored: true, metrics: { completed }, trials: exposures.map((exposureMs) => ({ exposureMs })) });
  }, { signal: controller.signal });
  next();
  return cleanup;
}
import { inputMethod, inputTime, trackInputs } from '../engines/runtime.js';


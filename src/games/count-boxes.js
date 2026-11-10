export const definition = {
  id: 'count-boxes',
  modes: [{
    id: 'six-level', name: '数箱子', ruleVersion: 3,
    presets: [{ id: 'standard', name: '六关挑战', settings: {} }],
    score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate',
    inputs: ['keyboard', 'pointer', 'touch', 'mixed'], warning: '本训练会短暂显示图形.',
    rule: '观察一排箱子堆叠, 消失后输入总数.'
  }]
};

const levels = [
  { count: [3, 4], observe: [800, 1000] },
  { count: [4, 6], observe: [700, 800], moving: true },
  { count: [5, 7], observe: [600, 800], moving: true },
  { count: [7, 9], observe: [600, 800], moving: true },
  { count: [3, 4], observe: [250, 300] },
  { count: [20, 23], observe: [300, 400] },
];

export function createBoxScene(level, random = Math.random) {
  const heights = Array(9).fill(0);
  const config = levels[level - 1];
  const count = config.count[0] + Math.floor(random() * (config.count[1] - config.count[0] + 1));
  for (let i = 0; i < count; i++) {
    const available = heights.flatMap((height, index) => height < 3 ? [index] : []);
    heights[available[Math.floor(random() * available.length)]]++;
  }
  const observeMs = config.observe[0] + Math.floor(random() * (config.observe[1] - config.observe[0] + 1));
  return { heights, count, observeMs, moving: Boolean(config.moving && random() < 0.5) };
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
  let correct = 0;
  let displayedAt;
  let timer;
  let frame;
  let active = true;
  let accepting = false;
  const inputs = trackInputs();
  let lastAt;
  const trials = [];
  const cleanup = () => { active = false; controller.abort(); clock.clearTimeout(timer); clock.cancelAnimationFrame(frame); };
  const next = () => {
    accepting = false;
    scene = createBoxScene(completed + 1, random);
    root.innerHTML = `<div class="game-status"><span>第 ${completed + 1} / 6 关</span><span>观察箱子</span></div><div style="text-align:center;overflow:hidden" data-scene></div>`;
    frame = clock.requestAnimationFrame(() => {
      if (!active) return;
      root.querySelector('[data-scene]').innerHTML = sceneSvg(scene.heights);
      displayedAt = clock.performance.now();
      const hide = () => {
        if (!active) return;
        scene.exposureMs = clock.performance.now() - displayedAt;
        accepting = true;
        root.innerHTML = `<div class="game-status"><span>第 ${completed + 1} / 6 关</span><span>输入箱子总数</span></div><form class="number-form"><label>共有多少箱?<input type="number" min="1" max="27" inputmode="numeric" required></label><button class="button primary">确认</button></form>`;
        root.querySelector('input').focus();
      };
      if (scene.moving) {
        const animate = () => {
          if (!active) return;
          const progress = Math.min(1, (clock.performance.now() - displayedAt) / 3000);
          root.querySelector('[data-scene] svg').style.transform = `translateX(${(progress * 2 - 1) * 100}%)`;
          if (progress < 1) frame = clock.requestAnimationFrame(animate); else hide();
        };
        frame = clock.requestAnimationFrame(animate);
      } else timer = clock.setTimeout(() => { frame = clock.requestAnimationFrame(hide); }, scene.observeMs);
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
    const answer = Number(root.querySelector('input').value);
    const hit = answer === scene.count;
    if (hit) correct++;
    completed++;
    trials.push({ level: completed, answer, correct: hit, correctAnswer: scene.count, exposureMs: scene.exposureMs, moving: scene.moving, responseAtMs: Math.max(0, (lastAt ?? inputTime(event, () => clock.performance.now())) - started) });
    root.innerHTML = `<div class="game-status"><span>第 ${completed} / 6 关</span><span>${hit ? '正确' : '未答对'}</span></div><p class="stage-note">共有 ${scene.count} 箱</p><div style="text-align:center">${sceneSvg(scene.heights)}</div>`;
    timer = clock.setTimeout(() => {
      if (!active) return;
      if (completed < 6) { next(); return; }
      const duration = Math.max(0, clock.performance.now() - started) / 1000;
      cleanup();
      onFinish({ value: Math.round(correct / 6 * 100), detail: `6 关中答对 ${correct} 关`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputs.value, endReason: 'complete', scored: true, metrics: { correct, completed }, trials });
    }, completed === 6 ? 1000 : 3000);
  }, { signal: controller.signal });
  next();
  return cleanup;
}
import { inputMethod, inputTime, trackInputs } from '../engines/runtime.js';


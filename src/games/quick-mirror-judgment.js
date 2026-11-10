import { reflectShape, rotateShape } from '../engines/transforms.js';

export const definition = {
  id: 'quick-mirror-judgment',
  modes: [{
    id: 'timed', name: '镜像速判', ruleVersion: 2,
    presets: [{ id: 'standard', name: '120 秒', settings: {} }],
    score: { unit: '分', lower: false, min: -1000000 }, hiddenPolicy: 'invalidate',
    inputs: ['pointer', 'keyboard'], rule: '判断两个图形是否互为镜像, 可以在脑中旋转.'
  }]
};

const shapes = [
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]],
  [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]],
];

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const started = clock.performance.now();
  const deadline = started + 120000;
  let answer;
  let left;
  let right;
  let score = 0;
  let correct = 0;
  let wrong = 0;
  let lastInput = 'pointer';
  let timer;
  let active = true;
  const cleanup = () => { active = false; controller.abort(); clock.clearTimeout(timer); };
  const figure = (points) => `<svg viewBox="0 0 3 3" width="120" height="120" aria-hidden="true">${points.map(([x, y]) => `<rect x="${x}" y="${y}" width=".94" height=".94" fill="currentColor"/>`).join('')}</svg>`;
  const next = () => {
    const shape = shapes[Math.floor(random() * shapes.length)];
    left = rotateShape(shape, Math.floor(random() * 4));
    answer = random() < 0.5;
    right = rotateShape(answer ? reflectShape(shape) : shape, Math.floor(random() * 4));
    root.innerHTML = `<div class="game-status"><span>得分 ${score}</span><span data-time></span></div><div style="display:flex;justify-content:center;gap:30px;margin:24px">${figure(left)}${figure(right)}</div><p class="stage-note">两个图形互为镜像吗?</p><div class="answer-options"><button class="answer-button" data-answer="no">否</button><button class="answer-button" data-answer="yes">是</button></div>`;
    root.querySelector('[data-time]').textContent = `${Math.max(0, Math.ceil((deadline - clock.performance.now()) / 1000))} 秒`;
  };
  const tick = () => {
    if (!active) return;
    const remaining = Math.max(0, deadline - clock.performance.now());
    root.querySelector('[data-time]').textContent = `${Math.ceil(remaining / 1000)} 秒`;
    if (!remaining) {
      const duration = (clock.performance.now() - started) / 1000;
      cleanup();
      onFinish({ value: score, detail: `答对 ${correct} 题, 答错 ${wrong} 题`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: lastInput, endReason: 'timeout', scored: true, metrics: { correct, wrong }, trials: [] });
    } else timer = clock.setTimeout(tick, Math.min(100, remaining));
  };
  const respond = (value, input) => {
    if (!active || clock.performance.now() >= deadline) return;
    lastInput = input;
    if (value === answer) { score++; correct++; }
    else { score--; wrong++; }
    next();
  };
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-answer]');
    if (button) respond(button.dataset.answer === 'yes', 'pointer');
  }, { signal: controller.signal });
  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.target.matches('input, textarea, select')) return;
    if (event.code === 'Digit1') respond(false, 'keyboard');
    if (event.code === 'Digit2') respond(true, 'keyboard');
  }, { signal: controller.signal });
  next();
  tick();
  return cleanup;
}

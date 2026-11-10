import { mirrorGrid } from '../engines/transforms.js';
import { bindBoardButtons, trackInputs } from '../engines/board-input.js';

export const definition = {
  id: 'symmetry-blocks',
  modes: [{
    id: 'timed', name: '对称方块', ruleVersion: 2,
    presets: [{ id: 'standard', name: '180 秒', settings: {} }],
    score: { unit: '分', lower: false, min: -1000000 }, hiddenPolicy: 'invalidate',
    inputs: ['pointer', 'touch', 'keyboard', 'mixed'], rule: '在右侧复刻左侧图案的镜像, 提交后判断.'
  }]
};

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const started = clock.performance.now();
  const deadline = started + 180000;
  let source;
  let selected;
  let score = 0;
  let correct = 0;
  let wrong = 0;
  let active = true;
  const inputs = trackInputs();
  let timer;
  const cleanup = () => { active = false; controller.abort(); clock.clearTimeout(timer); };
  const next = () => {
    source = Array.from({ length: 12 }, () => random() < 0.4);
    if (!source.some(Boolean)) source[0] = true;
    selected = Array(12).fill(false);
    draw();
  };
  const draw = () => {
    const cells = source.map((value, index) => `<div style="aspect-ratio:1;background:${value ? '#3275bf' : '#ddd'}" aria-label="左侧第 ${index + 1} 格${value ? '点亮' : '未点亮'}"></div>`).join('');
    const buttons = selected.map((value, index) => `<button data-index="${index}" aria-pressed="${value}" aria-label="右侧第 ${index + 1} 格" style="aspect-ratio:1;background:${value ? '#3275bf' : '#ddd'};border:0"></button>`).join('');
    root.innerHTML = `<div class="game-status"><span>得分 ${score}</span><span data-time></span></div><div style="display:flex;gap:12px"><div class="play-grid" style="--columns:3;flex:1">${cells}</div><div class="play-grid" style="--columns:3;flex:1">${buttons}</div></div><div class="answer-options"><button class="answer-button" data-submit>提交</button></div>`;
    root.querySelector('[data-time]').textContent = `${Math.max(0, Math.ceil((deadline - clock.performance.now()) / 1000))} 秒`;
  };
  const tick = () => {
    if (!active) return;
    const remaining = Math.max(0, deadline - clock.performance.now());
    root.querySelector('[data-time]').textContent = `${Math.ceil(remaining / 1000)} 秒`;
    if (!remaining) {
      const duration = (clock.performance.now() - started) / 1000;
      cleanup();
      onFinish({ value: score, detail: `答对 ${correct} 题, 答错 ${wrong} 题`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputs.value, endReason: 'timeout', scored: true, metrics: { correct, wrong }, trials: [] });
    } else timer = clock.setTimeout(tick, Math.min(100, remaining));
  };
  bindBoardButtons(root, 'button[data-index], button[data-submit]', (button, input, at) => {
    if (!active || at >= deadline) return;
    inputs.add(input);
    if ('index' in button.dataset) { const index = Number(button.dataset.index); selected[index] = !selected[index]; draw(); return; }
    if ('submit' in button.dataset) {
      if (mirrorGrid(source, 3).every((value, index) => value === selected[index])) { score++; correct++; }
      else { score--; wrong++; }
      next();
    }
  }, controller.signal, () => clock.performance.now());
  next();
  tick();
  return cleanup;
}

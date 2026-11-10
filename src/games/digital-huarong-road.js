import { createSliding, moveSliding, solvedSliding } from '../engines/boards.js';

export const definition = {
  id: 'digital-huarong-road',
  modes: [{
    id: 'sliding', name: '数字滑块', ruleVersion: 2,
    presets: [3, 4, 5].map((size) => ({ id: `${size}x${size}`, name: `${size} × ${size}`, settings: { size } })),
    score: { unit: '秒', lower: true, min: 0 }, hiddenPolicy: 'invalidate',
    inputs: ['pointer'], rule: '点击空位旁的数字, 依次排列所有数字.'
  }]
};

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const size = settings.size;
  let board = createSliding(size, random);
  let started = null;
  let moves = 0;
  let active = true;
  const cleanup = () => { active = false; controller.abort(); };
  const draw = () => {
    root.innerHTML = `<div class="game-status"><span>${size} × ${size}</span><span>步数 ${moves}</span></div><div class="play-grid" style="--columns:${size}">${board.map((value, index) => `<button class="play-cell" data-index="${index}" ${value ? '' : 'disabled'} aria-label="${value || '空位'}">${value || ''}</button>`).join('')}</div>`;
  };
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-index]');
    if (!button || !active) return;
    const next = moveSliding(board, Number(button.dataset.index), size);
    if (!next) return;
    if (started === null) started = clock.performance.now();
    board = next;
    moves++;
    draw();
    if (solvedSliding(board)) {
      const duration = (clock.performance.now() - started) / 1000;
      cleanup();
      onFinish({ value: duration, detail: `完成 ${size} × ${size}, 共 ${moves} 步`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: 'pointer', endReason: 'complete', scored: true, metrics: { moves }, trials: [] });
    }
  }, { signal: controller.signal });
  draw();
  return cleanup;
}

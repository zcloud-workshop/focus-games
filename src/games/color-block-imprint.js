import { uniquePositions, rotatePosition } from '../engines/sequence.js';
import { createRuntime } from '../engines/runtime.js';

const config = (id, name) => ({ id, name, ruleVersion: 2, presets: [{ id: 'standard', name: '5 × 5', settings: {} }], score: { unit: '关', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: id === 'rotate' ? '观察亮起的格子, 消失后按指定角度顺时针旋转并复刻.' : '观察同时亮起的格子, 消失后选出相同的位置.' });
export const definition = { id: 'color-block-imprint', modes: [config('normal', '位置复刻'), config('rotate', '旋转复刻')] };
export function targetCells(cells, turns) { return cells.map((cell) => rotatePosition(cell, 5, turns)).sort((a, b) => a - b); }
export function sameCells(a, b) { return a.length === b.length && new Set(a).size === a.length && a.every((value) => b.includes(value)); }
export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  let level = 1, lives = 3, completed = 0, lastSuccessSeconds = 0, phase = 'show', target, selected = new Set();
  const started = runtime.now();
  const show = () => {
    phase = 'show'; selected = new Set();
    const cells = uniquePositions(5, Math.min(25, level + 2), random);
    const turns = mode.id === 'rotate' ? 1 + Math.floor(random() * 3) : 0;
    target = targetCells(cells, turns);
    root.innerHTML = `<div class="game-status"><span>第 ${level} 关 · 剩余 ${lives} 次</span><span>${turns ? `顺时针旋转 ${turns * 90} 度` : '记住亮格'}</span></div><div class="play-grid sequence-grid" style="--columns:5">${Array.from({ length: 25 }, (_, index) => `<button type="button" data-cell="${index}" class="play-cell ${cells.includes(index) ? 'lit' : ''}" aria-label="位置 ${index + 1}"></button>`).join('')}</div><button type="button" class="button primary centered" data-submit disabled>确认</button>`;
    runtime.later(() => { root.querySelectorAll('[data-cell]').forEach((cell) => cell.classList.remove('lit')); root.querySelector('[data-submit]').disabled = false; phase = 'answer'; }, 1800);
  };
  runtime.listen(root, 'click', (event) => {
    const cell = event.target.closest('[data-cell]');
    if (cell && phase === 'answer') { const index = Number(cell.dataset.cell); if (selected.has(index)) selected.delete(index); else selected.add(index); cell.classList.toggle('lit', selected.has(index)); }
    if (!event.target.closest('[data-submit]') || phase !== 'answer') return;
    phase = 'waiting';
    if (sameCells([...selected], target)) {
      completed = level;
      lastSuccessSeconds = (runtime.now() - started) / 1000;
      if (target.length === 25) { phase = 'finished'; runtime.finish({ value: completed, detail: `完成 ${completed} 关`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: 'mixed', endReason: 'completed', scored: true, metrics: { lastSuccessSeconds, lives } }); return; }
      level++;
    } else lives--;
    if (!lives) { phase = 'finished'; runtime.finish({ value: completed, detail: `完成 ${completed} 关`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: 'mixed', endReason: 'mistake', scored: true, metrics: { lastSuccessSeconds, lives } }); return; }
    runtime.later(show, 400);
  });
  show(); return runtime.cleanup;
}

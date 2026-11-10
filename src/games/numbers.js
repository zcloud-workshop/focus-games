import { uniquePositions } from '../engines/sequence.js';
import { createRuntime } from '../engines/runtime.js';

const presets = [3, 4, 5].map((size) => ({ id: `grid-${size}`, name: `${size} × ${size}`, settings: { size, duration: 4000 } }));
const space = (id, name) => ({ id, name, ruleVersion: 2, presets, fields: [{ key: 'duration', label: '记忆时间', type: 'number', default: 4000, min: 1000, max: 15000, step: 500, unit: '毫秒' }], score: { unit: '个', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '记住网格中符号的位置, 隐藏后按顺序点击.' });
export const definition = { id: 'numbers', modes: [space('digits', '数字位置'), space('letters', '字母位置'), { id: 'first-click', name: '首击隐藏', ruleVersion: 2, presets: [{ id: 'standard', name: '4 个起', settings: { size: 5 } }], score: { unit: '关', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '记住数字位置, 点击 1 后其余数字隐藏. 按升序点完, 共 3 次失误机会.' }] };

export function makePositionRound(size, count, letters, random = Math.random) {
  return uniquePositions(size, count, random).map((position, index) => ({ position, label: letters ? String.fromCharCode(65 + index) : String(index + 1) }));
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const firstClick = mode.id === 'first-click';
  let count = firstClick ? 4 : settings.size ** 2, level = 0, lives = 3, round, next = 0, phase = 'show';
  const finish = (value, reason) => runtime.finish({ value, detail: firstClick ? `完成 ${level} 关` : `依序找到 ${next} 个位置`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: 'mixed', endReason: reason, scored: true, metrics: { found: next, completed: level, lives } });
  const show = () => {
    round = makePositionRound(settings.size, count, mode.id === 'letters', random);
    next = 0;
    phase = firstClick ? 'first' : 'show';
    root.innerHTML = `<div class="game-status"><span>${firstClick ? `第 ${level + 1} 关 · 余 ${lives} 次` : '观察位置'}</span><span data-hint>${firstClick ? '先点击 1' : '稍后按顺序点击'}</span></div><div class="play-grid number-grid" style="--columns:${settings.size}">${Array.from({ length: settings.size ** 2 }, (_, index) => `<button type="button" class="play-cell" data-cell="${index}" aria-label="位置 ${index + 1}">${round.find((item) => item.position === index)?.label ?? ''}</button>`).join('')}</div>`;
    if (!firstClick) runtime.later(() => { phase = 'answer'; root.querySelectorAll('[data-cell]').forEach((cell) => { cell.textContent = ''; }); root.querySelector('[data-hint]').textContent = '按顺序找出位置'; }, settings.duration);
  };
  runtime.listen(root, 'click', (event) => {
    const cell = event.target.closest('[data-cell]');
    if (!cell || !['first', 'answer'].includes(phase)) return;
    if (Number(cell.dataset.cell) !== round[next].position) {
      if (!firstClick) { phase = 'finished'; finish(next, 'mistake'); return; }
      lives--;
      if (!lives) { phase = 'finished'; finish(level, 'mistake'); return; }
      show(); return;
    }
    if (phase === 'first') { phase = 'answer'; root.querySelectorAll('[data-cell]').forEach((item) => { item.textContent = ''; }); root.querySelector('[data-hint]').textContent = '继续按顺序点击'; }
    cell.textContent = round[next].label;
    cell.disabled = true;
    next++;
    if (next !== count) return;
    if (!firstClick) { phase = 'finished'; finish(next, 'completed'); return; }
    level++;
    if (count === settings.size ** 2) { phase = 'finished'; finish(level, 'completed'); return; }
    count++; phase = 'waiting'; runtime.later(show, 500);
  });
  show();
  return runtime.cleanup;
}

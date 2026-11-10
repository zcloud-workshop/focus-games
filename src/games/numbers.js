import { createInputTracker } from '../engines/input.js';
import { uniquePositions } from '../engines/sequence.js';
import { createRuntime } from '../engines/runtime.js';
import { presentOnFrame } from '../engines/trials.js';

const medium = 'numbers:medium', hard = 'numbers:hard', letters = 'numbers:letters';
const presets = [[3, 2500], [4, 2000], [5, 1500]].map(([size, duration]) => ({ id: `grid-${size}`, name: `${size} × ${size}`, settings: { size, duration }, ...(size > 3 ? { unlock: { requires: [size === 4 ? medium : hard] } } : {}) }));
const custom = { id: 'custom', name: '自定义', settings: { size: 3, duration: 2500 }, unlock: { requires: [medium] }, fields: [
  { key: 'size', label: '网格边长', type: 'number', min: 3, max: 3, step: 1, maxByUnlock: [{ key: medium, max: 4 }, { key: hard, max: 6 }] },
  { key: 'duration', label: '记忆时间', type: 'number', min: 1500, max: 3000, step: 500, unit: '毫秒', minByUnlock: [{ key: medium, min: 1000 }, { key: hard, min: 500 }] },
] };
const space = (id, name) => ({ id, name, ruleVersion: 3, presets: [...presets, id === 'letters' ? { ...custom, fields: custom.fields.map((field) => field.key === 'size' ? { ...field, maxByUnlock: [{ key: medium, max: 4 }, { key: hard, max: 5 }] } : field) } : custom], ...(id === 'letters' ? { unlock: { requires: [letters] } } : {}), score: { unit: '个', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '记住网格中符号的位置, 隐藏后按顺序点击. 错误只作提示, 直到全部找出.' });
export const definition = { id: 'numbers', modes: [space('digits', '数字位置'), space('letters', '字母位置'), { id: 'first-click', name: '首击隐藏', ruleVersion: 2, presets: [{ id: 'standard', name: '4 个起', settings: { size: 5 } }], score: { unit: '关', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '记住数字位置, 点击 1 后其余数字隐藏. 按升序点完, 共 3 次失误机会.' }] };

export function makePositionRound(size, count, letters, random = Math.random) {
  return uniquePositions(size, count, random).map((position, index) => ({ position, label: letters ? String.fromCharCode(65 + index) : String(index + 1) }));
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const inputKind = createInputTracker(runtime, root);
  const firstClick = mode.id === 'first-click';
  let count = firstClick ? 4 : settings.size ** 2, level = 0, lives = 3, round, roundTrial, next = 0, phase = 'show';
  const trials = [];
  const finish = (value, reason) => runtime.finish({ unlocks: !firstClick && mode.id === 'digits' && preset.id === 'grid-3' ? [medium] : !firstClick && mode.id === 'digits' && preset.id === 'grid-4' ? [hard, letters] : [], value, detail: firstClick ? `完成 ${level} 关` : `依序找到 ${next} 个位置`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputKind(), endReason: reason, scored: true, metrics: { found: next, completed: level, lives }, trials });
  const hide = (callback) => {
    phase = 'hiding';
    presentOnFrame(runtime, () => {
      root.querySelectorAll('[data-cell]').forEach((cell) => { cell.textContent = ''; });
      root.querySelector('[data-hint]').textContent = '按顺序找出位置';
    }, (hiddenAt) => {
      roundTrial.durationMs = hiddenAt - roundTrial.presentedAt;
      callback();
    });
  };
  const show = () => {
    round = makePositionRound(settings.size, count, mode.id === 'letters', random);
    roundTrial = { level: level + 1, positions: round.map((item) => item.position), responses: [] };
    trials.push(roundTrial);
    next = 0;
    phase = 'show';
    presentOnFrame(runtime, () => {
      root.innerHTML = `<div class="game-status"><span>${firstClick ? `第 ${level + 1} 关 · 余 ${lives} 次` : '观察位置'}</span><span data-hint>${firstClick ? '先点击 1' : '稍后按顺序点击'}</span></div><div class="play-grid number-grid" style="--columns:${settings.size}">${Array.from({ length: settings.size ** 2 }, (_, index) => `<button type="button" class="play-cell" data-cell="${index}" aria-label="位置 ${index + 1}">${round.find((item) => item.position === index)?.label ?? ''}</button>`).join('')}</div>`;
    }, (shownAt) => {
      roundTrial.presentedAt = shownAt;
      if (firstClick) phase = 'first';
      else runtime.later(() => hide(() => { phase = 'answer'; }), settings.duration);
    });
  };
  const accept = (cell) => {
    cell.textContent = round[next].label;
    cell.disabled = true;
    next++;
    if (next !== count) return;
    roundTrial.correct = true;
    if (!firstClick) { phase = 'finished'; finish(next, 'completed'); return; }
    level++;
    if (count === settings.size ** 2) { phase = 'finished'; finish(level, 'completed'); return; }
    count++; phase = 'waiting'; runtime.later(show, 500);
  };
  runtime.listen(root, 'click', (event) => {
    const cell = event.target.closest('[data-cell]');
    if (!cell || !['first', 'answer'].includes(phase)) return;
    roundTrial.responses.push(Number(cell.dataset.cell));
    if (Number(cell.dataset.cell) !== round[next].position) {
      roundTrial.correct = false;
      if (!firstClick) {
        cell.classList.add('incorrect');
        runtime.later(() => cell.classList.remove('incorrect'), 300);
        return;
      }
      const fail = () => {
        lives--;
        if (!lives) { phase = 'finished'; finish(level, 'mistake'); return; }
        show();
      };
      if (phase === 'first') hide(fail); else fail();
      return;
    }
    if (phase === 'first') hide(() => { phase = 'answer'; accept(cell); });
    else accept(cell);
  });
  show();
  return runtime.cleanup;
}

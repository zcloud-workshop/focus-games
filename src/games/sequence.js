import { createRuntime } from '../engines/runtime.js';

const score = { unit: '个', lower: false, min: 0 };
const mode = (id, name, presets, extra = {}) => ({ id, name, ruleVersion: 2, presets, score, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard', 'touch'], rule: '观察位置出现的顺序, 然后按要求复现. 每轮增加一步.', ...extra });
export const definition = { id: 'sequence', modes: [
  mode('grid', '方格序列', [{ id: 'slow', name: '3 × 3 慢速', settings: { size: 3, speed: 650, start: 1 } }, { id: 'fast', name: '3 × 3 快速', settings: { size: 3, speed: 350, start: 1 } }, { id: 'large', name: '4 × 4', settings: { size: 4, speed: 450, start: 1 } }], { fields: [{ key: 'size', label: '网格边长', type: 'number', default: 3, min: 2, max: 5, step: 1 }, { key: 'speed', label: '显示时长', type: 'number', default: 650, min: 150, max: 1500, step: 50, unit: '毫秒' }] }),
  mode('buttons', '按钮序列', [{ id: 'standard', name: '标准', settings: { size: 3, speed: 500, start: 1 } }]),
  mode('forward', '正序挑战', [{ id: 'standard', name: '3 步起', settings: { size: 3, speed: 500, start: 3 } }]),
  mode('backward', '倒序挑战', [{ id: 'standard', name: '3 步起', settings: { size: 3, speed: 500, start: 3 } }], { rule: '观察位置亮起的顺序, 按倒序复现.' }),
  mode('practice', '正序练习', [{ id: 'standard', name: '练习', settings: { size: 3, speed: 500, start: 3 } }], { scored: false, fields: [{ key: 'start', label: '起始长度', type: 'number', default: 3, min: 1, max: 12, step: 1 }] }),
  mode('backward-practice', '倒序练习', [{ id: 'standard', name: '练习', settings: { size: 3, speed: 500, start: 3 } }], { scored: false, fields: [{ key: 'start', label: '起始长度', type: 'number', default: 3, min: 1, max: 12, step: 1 }], rule: '观察位置亮起的顺序, 按倒序复现.' }),
  mode('path', '跳跃路径', [{ id: 'standard', name: '路径', settings: { size: 3, speed: 550, start: 1 } }], { rule: '观察标记依次跳到的位置, 然后复现路径.' }),
] };

export function extendSequence(sequence, size, random = Math.random) { return [...sequence, Math.floor(random() * size * size)]; }
export function answerSequence(sequence, reverse) { return reverse ? [...sequence].reverse() : [...sequence]; }

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  let sequence = [];
  for (let i = 0; i < settings.start; i++) sequence = extendSequence(sequence, settings.size, random);
  let phase = 'show', position = 0, completed = 0;
  const reverse = mode.id.startsWith('backward');
  const show = () => {
    phase = 'show';
    root.innerHTML = `<div class="game-status"><span>序列长度 ${sequence.length}</span><span data-hint>观察顺序</span></div><div style="position:relative"><div class="play-grid sequence-grid" style="--columns:${settings.size}">${Array.from({ length: settings.size ** 2 }, (_, i) => `<button class="play-cell" type="button" data-cell="${i}" aria-label="位置 ${i + 1}"${mode.id === 'path' ? ' style="border-radius:50%"' : ''}></button>`).join('')}</div>${mode.id === 'path' ? '<span data-marker aria-hidden="true" style="position:absolute;pointer-events:none;transform:translate(-50%,-50%);font-size:2rem">●</span>' : ''}</div>`;
    const cells = [...root.querySelectorAll('[data-cell]')];
    let cursor = 0;
    let previous = Math.floor(settings.size ** 2 / 2);
    const marker = root.querySelector('[data-marker]');
    const place = (index) => [((index % settings.size) + 0.5) * 100 / settings.size, (Math.floor(index / settings.size) + 0.5) * 100 / settings.size];
    if (marker) { const [x, y] = place(previous); marker.style.left = `${x}%`; marker.style.top = `${y}%`; }
    const next = () => {
      if (cursor === sequence.length) {
        phase = 'answer'; position = 0;
        if (marker) marker.remove();
        root.querySelector('[data-hint]').textContent = reverse ? '按倒序点击' : '按顺序点击';
        return;
      }
      const target = sequence[cursor++];
      const cell = cells[target];
      cell.classList.add('lit');
      if (!marker) {
        runtime.later(() => { cell.classList.remove('lit'); runtime.later(next, 250); }, settings.speed);
        return;
      }
      const [fromX, fromY] = place(previous);
      const [toX, toY] = place(target);
      const started = runtime.now();
      const duration = Math.min(settings.speed, 350);
      const move = (time) => {
        const progress = Math.min(1, Math.max(0, (time - started) / duration));
        marker.style.left = `${fromX + (toX - fromX) * progress}%`;
        marker.style.top = `${fromY + (toY - fromY) * progress}%`;
        if (progress < 1) runtime.frame(move);
        else { previous = target; runtime.later(() => { cell.classList.remove('lit'); runtime.later(next, 250); }, settings.speed - duration); }
      };
      runtime.frame(move);
    };
    runtime.later(next, 500);
  };
  runtime.listen(root, 'click', (event) => {
    const cell = event.target.closest('[data-cell]');
    if (!cell || phase !== 'answer') return;
    const expected = answerSequence(sequence, reverse);
    if (Number(cell.dataset.cell) !== expected[position]) {
      phase = 'finished';
      runtime.finish({ value: completed, detail: `最长完整序列 ${completed} 步`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: 'mixed', endReason: 'mistake', scored: mode.scored !== false, metrics: { completed } });
      return;
    }
    cell.classList.add('correct');
    runtime.later(() => cell.classList.remove('correct'), 200);
    position++;
    if (position === sequence.length) { completed = sequence.length; phase = 'waiting'; sequence = extendSequence(sequence, settings.size, random); runtime.later(show, 600); }
  });
  show();
  return runtime.cleanup;
}

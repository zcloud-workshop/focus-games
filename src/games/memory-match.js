import { shuffle } from '../core.js';
import { createRuntime } from '../engines/runtime.js';

const themes = {
  shapes: ['○', '△', '□', '◇', '⬡', '✕', '＋', '☆', '▽', '▱', '◉', '⊞'],
  letters: [...'ABCDEFGHIJKL'],
  numbers: [...'123456789'].concat(['10', '11', '12']),
  animals: ['猫', '狗', '兔', '熊', '鹿', '羊', '狐', '猴'],
};
const presets = (sizes) => sizes.map(([columns, rows]) => ({ id: `${columns}x${rows}`, name: `${columns} × ${rows}`, settings: { columns, rows } }));
export const definition = {
  id: 'memory-match',
  modes: [
    { id: 'symbols', name: '图形配对', ruleVersion: 2, presets: presets([[4, 4], [5, 4], [6, 4]]), fields: [{ key: 'theme', label: '主题', type: 'select', default: 'shapes', options: [{ value: 'shapes', label: '图形' }, { value: 'letters', label: '字母' }, { value: 'numbers', label: '数字' }] }], score: { unit: '秒', lower: true, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard', 'touch'], rule: '每次翻开两张卡片, 找到全部相同的对子.' },
    { id: 'animals', name: '动物配对', ruleVersion: 2, presets: presets([[3, 2], [4, 2], [4, 3], [4, 4]]), score: { unit: '秒', lower: true, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard', 'touch'], rule: '每次翻开两张动物卡片, 找到全部相同的对子.' },
  ],
};

export function makeBoard(columns, rows, random = Math.random) {
  const pairs = columns * rows / 2;
  return shuffle(Array.from({ length: pairs }, (_, index) => [index, index]).flat(), random);
}

function animal(index) {
  const ears = ['M10 16 6 5l12 6m12 0 12-6-4 11', 'M11 16 5 12l1 12m31-8 6-4-1 12', 'M13 14 11 2l9 10m8 0 9-10-2 12', 'M12 14a6 6 0 1 1 8-6m8 0a6 6 0 1 1 8 6', 'M13 14 8 4m3 6-5-2m29 6 5-10m-3 6 5-2', 'M12 15c-9-8-10 5-3 7m27-7c9-8 10 5 3 7', 'M10 15 5 3l13 8m12 0L43 3l-5 12', 'M10 19a6 6 0 1 0 1 9m27-9a6 6 0 1 1-1 9'][index];
  return `<svg viewBox="0 0 48 48" width="42" height="42" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ears}"/><ellipse cx="24" cy="26" rx="15" ry="13"/><path d="M18 23h.1m12 0h.1M21 30q3 3 6 0"/></svg><span>${themes.animals[index]}</span>`;
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const { columns, rows } = settings;
  const board = makeBoard(columns, rows, random);
  const theme = mode.id === 'animals' ? 'animals' : (settings.theme || 'shapes');
  const matched = new Set();
  let open = [];
  let locked = false;
  let moves = 0;
  root.innerHTML = `<div class="game-status"><span>步数 <b data-moves>0</b></span><span>配对 <b data-pairs>0</b> / ${board.length / 2}</span></div><div class="play-grid" style="--columns:${columns}">${board.map((_, index) => `<button class="play-cell" type="button" data-card="${index}" aria-label="翻开卡片 ${index + 1}">?</button>`).join('')}</div>`;
  const cells = [...root.querySelectorAll('[data-card]')];
  runtime.listen(root, 'click', (event) => {
    const button = event.target.closest('[data-card]');
    if (!button || locked) return;
    const index = Number(button.dataset.card);
    if (matched.has(index) || open.includes(index)) return;
    open.push(index);
    button.innerHTML = theme === 'animals' ? animal(board[index]) : themes[theme][board[index]];
    button.setAttribute('aria-label', `卡片 ${index + 1}: ${themes[theme][board[index]]}`);
    if (open.length < 2) return;
    moves++;
    root.querySelector('[data-moves]').textContent = moves;
    locked = true;
    const pair = [...open];
    runtime.later(() => {
      if (board[pair[0]] === board[pair[1]]) {
        pair.forEach((card) => { matched.add(card); cells[card].disabled = true; });
        root.querySelector('[data-pairs]').textContent = matched.size / 2;
      } else {
        pair.forEach((card) => { cells[card].textContent = '?'; cells[card].setAttribute('aria-label', `翻开卡片 ${card + 1}`); });
      }
      open = [];
      locked = false;
      if (matched.size === board.length) {
        const seconds = (runtime.now() - started) / 1000;
        runtime.finish({ value: seconds, detail: `完成 ${matched.size / 2} 对, 共 ${moves} 步`, mode: mode.id, preset: preset.id, settings: { ...settings, theme }, rules: mode.ruleVersion, input: 'mixed', endReason: 'completed', scored: true, metrics: { moves, pairs: matched.size / 2 } });
      }
    }, 700);
  });
  const started = runtime.now();
  return runtime.cleanup;
}

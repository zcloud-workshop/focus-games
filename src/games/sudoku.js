import { shuffle } from '../core.js';
import { solveSudoku } from '../engines/boards.js';
import { bindBoardButtons, trackInputs } from '../engines/board-input.js';
import { inputTime } from '../engines/runtime.js';

const templates = {
  easy: '020406089450000123009000406030507890000890234891230507040070902600012045012305670',
  normal: '020406089450000103009000406030007890000890004890200007040070900600012045012305000',
  hard: '020406089450000103009000400030007890000800004890200007040070900600012045012305000',
};
const presets = [
  { id: 'easy', name: '简单', settings: { difficulty: 'easy', assisted: false } },
  { id: 'normal', name: '普通', settings: { difficulty: 'normal', assisted: false } },
  { id: 'hard', name: '困难', settings: { difficulty: 'hard', assisted: false } },
];

export const definition = {
  id: 'sudoku',
  modes: [
    { id: 'basic', name: '数独', ruleVersion: 2, presets, score: { unit: '秒', lower: true, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard', 'mixed'], rule: '每行、每列和每宫各填 1-9, 最多错 3 次.' },
    { id: 'notes', name: '数独笔记', ruleVersion: 3, presets, score: { unit: '秒', lower: true, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard', 'mixed'], rule: '每行、每列和每宫各填 1-9, 可用笔记、提示和暂停.' },
  ]
};

export function createSudoku(difficulty, random = Math.random) {
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  const order = () => shuffle([0, 1, 2], random).flatMap((group) => shuffle([0, 1, 2], random).map((index) => group * 3 + index));
  const rows = order();
  const cols = order();
  const original = [...templates[difficulty]].map(Number);
  return rows.flatMap((row) => cols.map((col) => original[row * 9 + col] ? digits[original[row * 9 + col] - 1] : 0));
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const started = clock.performance.now();
  const initial = createSudoku(settings.difficulty, random);
  const solution = solveSudoku(initial, 1)[0];
  let board = [...initial];
  let notes = Array.from({ length: 81 }, () => new Set());
  let selected = null;
  let noteMode = false;
  let errors = 0;
  let hints = 0;
  let pausedAt = null;
  let pausedMs = 0;
  const inputs = trackInputs();
  let active = true;
  const cleanup = () => { active = false; controller.abort(); };
  const draw = () => {
    const selectedValue = selected === null ? 0 : board[selected];
    const cells = board.map((value, index) => {
      const row = Math.floor(index / 9);
      const col = index % 9;
      const bg = selected === index ? '#a9cce8' : value && value === selectedValue ? '#d5e8f7' : 'var(--soft, #eee)';
      const content = value || [...notes[index]].sort().join('');
      return `<button data-cell="${index}" aria-label="第 ${row + 1} 行第 ${col + 1} 列${initial[index] ? '已知' : ''}, ${value || '空'}" style="aspect-ratio:1;min-width:0;padding:0;border:1px solid #aaa;${col % 3 === 0 ? 'border-left:2px solid #555;' : ''}${row % 3 === 0 ? 'border-top:2px solid #555;' : ''}background:${bg};color:${selected === index || value && value === selectedValue ? '#173b57' : 'var(--ink)'};font-weight:${initial[index] ? '600' : '400'};font-size:${value ? 'clamp(14px,4vw,22px)' : '9px'}">${content}</button>`;
    }).join('');
    root.innerHTML = `<div class="game-status"><span>错误 ${errors} / 3</span><span>${pausedAt !== null ? '已暂停' : noteMode ? '笔记' : '填写'}</span></div><div class="play-grid" style="--columns:9;gap:0;max-width:450px">${cells}</div><div class="play-grid" style="--columns:9;gap:2px;margin-top:12px">${Array.from({ length: 9 }, (_, i) => `<button class="answer-button" data-number="${i + 1}" style="padding:6px">${i + 1}</button>`).join('')}</div><div class="answer-options"><button class="answer-button" data-action="erase">擦除</button>${mode.id === 'notes' ? `<button class="answer-button" data-action="notes">${noteMode ? '关闭笔记' : '笔记 (N)'}</button><button class="answer-button" data-action="hint">提示</button><button class="answer-button" data-action="pause">${pausedAt === null ? '暂停' : '继续'}</button>` : ''}</div>`;
  };
  const finish = (completed, at) => {
    const duration = Math.max(0, at - started - pausedMs) / 1000;
    cleanup();
    onFinish({ value: duration, detail: completed ? `完成数独, 错误 ${errors} 次, 提示 ${hints} 次` : '错误达到 3 次', duration, mode: mode.id, preset: preset.id, settings: { ...settings, assisted: hints > 0 }, rules: mode.ruleVersion, input: inputs.value, endReason: completed ? 'complete' : 'mistakes', scored: completed, metrics: { errors, hints }, trials: [] });
  };
  const input = (value, at) => {
    if (selected === null || initial[selected] || !active) return;
    if (value === 0) { if (noteMode) notes[selected].clear(); else board[selected] = 0; draw(); return; }
    if (noteMode) {
      if (notes[selected].has(value)) notes[selected].delete(value); else notes[selected].add(value);
    } else if (value === solution[selected]) {
      board[selected] = value;
      notes[selected].clear();
    } else {
      errors++;
      if (mode.id === 'basic' && errors >= 3) { finish(false, at); return; }
    }
    if (board.every((cell, index) => cell === solution[index])) finish(true, at);
    else draw();
  };
  bindBoardButtons(root, 'button[data-cell], button[data-number], button[data-action]', (button, method, at) => {
    inputs.add(method);
    if (button.dataset.action === 'pause') {
      if (pausedAt === null) pausedAt = at;
      else { pausedMs += Math.max(0, at - pausedAt); pausedAt = null; }
      draw(); return;
    }
    if (pausedAt !== null) return;
    if ('cell' in button.dataset) { selected = Number(button.dataset.cell); draw(); return; }
    if ('number' in button.dataset) { input(Number(button.dataset.number), at); return; }
    const action = button.dataset.action;
    if (action === 'erase') input(0, at);
    if (action === 'notes') { noteMode = !noteMode; draw(); }
    if (action === 'hint') {
      const selectedEmpty = selected !== null && !initial[selected] && !board[selected];
      const empty = board.flatMap((value, index) => value ? [] : [index]);
      const index = selectedEmpty ? selected : empty[Math.floor(random() * empty.length)];
      if (index === undefined) return;
      if (selectedEmpty) errors++;
      selected = index; board[index] = solution[index]; notes[index].clear(); hints++;
      if (board.every((cell, cellIndex) => cell === solution[cellIndex])) finish(true, at); else draw();
    }
  }, controller.signal, () => clock.performance.now());
  document.addEventListener('keydown', (event) => {
    if (pausedAt !== null || event.repeat || event.target.matches('input, textarea, select')) return;
    const at = inputTime(event, () => clock.performance.now());
    if (/^[1-9]$/.test(event.key)) { inputs.add('keyboard'); input(Number(event.key), at); }
    else if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); inputs.add('keyboard'); input(0, at); }
    else if (event.key.toLowerCase() === 'n' && mode.id === 'notes') { inputs.add('keyboard'); noteMode = !noteMode; draw(); }
    else if (mode.id === 'notes' && selected !== null && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); inputs.add('keyboard');
      const row = Math.floor(selected / 9);
      const col = selected % 9;
      selected = event.key === 'ArrowUp' ? Math.max(0, row - 1) * 9 + col : event.key === 'ArrowDown' ? Math.min(8, row + 1) * 9 + col : row * 9 + (event.key === 'ArrowLeft' ? Math.max(0, col - 1) : Math.min(8, col + 1));
      draw();
    }
  }, { signal: controller.signal });
  draw();
  return cleanup;
}

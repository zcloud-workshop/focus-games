import { addMergeTile, canMergeMove, moveMerge } from '../engines/boards.js';
import { bindBoardButtons, trackInputs } from '../engines/board-input.js';
import { inputTime } from '../engines/runtime.js';

export const definition = {
  id: 'number-merge',
  modes: [{
    id: 'classic', name: '数字合并', ruleVersion: 2,
    presets: [{ id: 'standard', name: '4 × 4', settings: {} }],
    score: { unit: '分', lower: false, min: 0 }, hiddenPolicy: 'invalidate',
    inputs: ['keyboard', 'pointer', 'touch', 'mixed'], rule: '滑动或按方向键合并相同数字. 棋盘无法移动时结束.'
  }]
};

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const started = clock.performance.now();
  let board = addMergeTile(addMergeTile(Array(16).fill(0), random), random);
  let score = 0;
  let moves = 0;
  let active = true;
  let startPoint = null;
  const inputs = trackInputs();
  const cleanup = () => { active = false; controller.abort(); };
  const draw = () => {
    root.innerHTML = `<div class="game-status"><span>得分 <b>${score}</b></span><span>步数 ${moves}</span></div><div class="play-grid" style="--columns:4;touch-action:none" aria-label="数字合并棋盘">${board.map((value) => `<div class="play-cell">${value || ''}</div>`).join('')}</div><div class="answer-options">${[['up', '上'], ['left', '左'], ['down', '下'], ['right', '右']].map(([direction, label]) => `<button class="answer-button" data-direction="${direction}">${label}</button>`).join('')}</div>`;
  };
  const move = (direction, input, at) => {
    if (!active) return;
    const result = moveMerge(board, direction);
    if (!result.changed) return;
    inputs.add(input);
    board = addMergeTile(result.board, random);
    score += result.score;
    moves++;
    draw();
    if (!canMergeMove(board)) {
      const duration = Math.max(0, at - started) / 1000;
      cleanup();
      onFinish({ value: score, detail: `最高方块 ${Math.max(...board)}, 共 ${moves} 步`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputs.value, endReason: 'no-moves', scored: true, metrics: { moves, highest: Math.max(...board) }, trials: [] });
    }
  };
  bindBoardButtons(root, 'button[data-direction]', (button, input, at) => move(button.dataset.direction, input, at), controller.signal, () => clock.performance.now());
  root.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || startPoint || !event.target.closest('.play-grid')) return;
    startPoint = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, input: event.pointerType === 'touch' ? 'touch' : 'pointer' };
    root.setPointerCapture(event.pointerId);
  }, { signal: controller.signal });
  root.addEventListener('pointerup', (event) => {
    if (!startPoint || event.pointerId !== startPoint.pointerId) return;
    const dx = event.clientX - startPoint.x;
    const dy = event.clientY - startPoint.y;
    const input = startPoint.input;
    startPoint = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'), input, inputTime(event, () => clock.performance.now()));
  }, { signal: controller.signal });
  root.addEventListener('pointercancel', (event) => { if (startPoint?.pointerId === event.pointerId) startPoint = null; }, { signal: controller.signal });
  document.addEventListener('keydown', (event) => {
    const direction = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[event.code];
    if (!direction || event.repeat || event.target.matches('input, textarea, select')) return;
    event.preventDefault();
    move(direction, 'keyboard', inputTime(event, () => clock.performance.now()));
  }, { signal: controller.signal });
  draw();
  return cleanup;
}

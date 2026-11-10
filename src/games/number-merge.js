import { addMergeTile, canMergeMove, moveMerge } from '../engines/boards.js';

export const definition = {
  id: 'number-merge',
  modes: [{
    id: 'classic', name: '数字合并', ruleVersion: 2,
    presets: [{ id: 'standard', name: '4 × 4', settings: {} }],
    score: { unit: '分', lower: false, min: 0 }, hiddenPolicy: 'invalidate',
    inputs: ['keyboard', 'pointer', 'touch'], rule: '滑动或按方向键合并相同数字. 棋盘无法移动时结束.'
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
  const cleanup = () => { active = false; controller.abort(); };
  const draw = () => {
    root.innerHTML = `<div class="game-status"><span>得分 <b>${score}</b></span><span>步数 ${moves}</span></div><div class="play-grid" style="--columns:4;touch-action:none" aria-label="数字合并棋盘">${board.map((value) => `<div class="play-cell">${value || ''}</div>`).join('')}</div><div class="answer-options">${[['up', '上'], ['left', '左'], ['down', '下'], ['right', '右']].map(([direction, label]) => `<button class="answer-button" data-direction="${direction}">${label}</button>`).join('')}</div>`;
  };
  const move = (direction, input) => {
    if (!active) return;
    const result = moveMerge(board, direction);
    if (!result.changed) return;
    board = addMergeTile(result.board, random);
    score += result.score;
    moves++;
    draw();
    if (!canMergeMove(board)) {
      const duration = (clock.performance.now() - started) / 1000;
      cleanup();
      onFinish({ value: score, detail: `最高方块 ${Math.max(...board)}, 共 ${moves} 步`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input, endReason: 'no-moves', scored: true, metrics: { moves, highest: Math.max(...board) }, trials: [] });
    }
  };
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-direction]');
    if (button) move(button.dataset.direction, 'pointer');
  }, { signal: controller.signal });
  root.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.play-grid')) startPoint = [event.clientX, event.clientY];
  }, { signal: controller.signal });
  root.addEventListener('pointerup', (event) => {
    if (!startPoint) return;
    const dx = event.clientX - startPoint[0];
    const dy = event.clientY - startPoint[1];
    startPoint = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'), 'touch');
  }, { signal: controller.signal });
  document.addEventListener('keydown', (event) => {
    const direction = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[event.code];
    if (!direction || event.repeat || event.target.matches('input, textarea, select')) return;
    event.preventDefault();
    move(direction, 'keyboard');
  }, { signal: controller.signal });
  draw();
  return cleanup;
}

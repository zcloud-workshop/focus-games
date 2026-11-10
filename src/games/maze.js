import { createMaze, moveMaze } from '../engines/boards.js';
import { bindBoardButtons, trackInputs } from '../engines/board-input.js';
import { inputTime } from '../engines/runtime.js';

export const definition = {
  id: 'maze',
  modes: [{
    id: 'levels', name: '逐关迷宫', ruleVersion: 2,
    presets: [{ id: 'standard', name: '每关 60 秒', settings: {} }],
    score: { unit: '关', lower: false, min: 0 }, hiddenPolicy: 'invalidate',
    inputs: ['keyboard', 'pointer', 'touch', 'mixed'], rule: '移动到终点, 每关限时 60 秒.'
  }]
};

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const started = clock.performance.now();
  let deadline = started + 60000;
  let maze;
  let position;
  let completed = 0;
  let active = true;
  let timer;
  let startPoint;
  const inputs = trackInputs();
  const cleanup = () => { active = false; controller.abort(); clock.clearTimeout(timer); };
  const nextLevel = () => {
    maze = createMaze(Math.min(21, 7 + completed * 2), random);
    position = maze.start;
    deadline = clock.performance.now() + 60000;
    draw();
  };
  const draw = () => {
    root.innerHTML = `<div class="game-status"><span>第 ${completed + 1} 关</span><span data-time></span></div><div class="play-grid" style="--columns:${maze.size};gap:1px;touch-action:none" aria-label="迷宫">${maze.cells.map((open, index) => `<div style="aspect-ratio:1;background:${open ? 'var(--surface, #eee)' : '#444'};display:grid;place-items:center">${index === position ? '●' : index === maze.end ? '终' : ''}</div>`).join('')}</div><div class="answer-options">${[['up', '上'], ['left', '左'], ['down', '下'], ['right', '右']].map(([direction, label]) => `<button class="answer-button" data-direction="${direction}">${label}</button>`).join('')}</div>`;
  };
  const tick = () => {
    if (!active) return;
    const remaining = Math.max(0, deadline - clock.performance.now());
    root.querySelector('[data-time]').textContent = `${Math.ceil(remaining / 1000)} 秒`;
    if (!remaining) {
      const duration = (clock.performance.now() - started) / 1000;
      cleanup();
      onFinish({ value: completed, detail: `完成 ${completed} 关`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputs.value, endReason: 'timeout', scored: true, metrics: { completed }, trials: [] });
    } else timer = clock.setTimeout(tick, Math.min(100, remaining));
  };
  const move = (direction, input, at) => {
    if (!active || at >= deadline) return;
    inputs.add(input);
    position = moveMaze(maze, position, direction);
    if (position === maze.end) { completed++; nextLevel(); }
    else draw();
    root.querySelector('[data-time]').textContent = `${Math.ceil((deadline - clock.performance.now()) / 1000)} 秒`;
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
  nextLevel();
  tick();
  return cleanup;
}

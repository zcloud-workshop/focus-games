import { createMaze, moveMaze } from '../engines/boards.js';

export const definition = {
  id: 'maze',
  modes: [{
    id: 'levels', name: '逐关迷宫', ruleVersion: 2,
    presets: [{ id: 'standard', name: '每关 60 秒', settings: {} }],
    score: { unit: '关', lower: false, min: 0 }, hiddenPolicy: 'invalidate',
    inputs: ['keyboard', 'pointer', 'touch'], rule: '移动到终点, 每关限时 60 秒.'
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
      onFinish({ value: completed, detail: `完成 ${completed} 关`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: lastInput, endReason: 'timeout', scored: true, metrics: { completed }, trials: [] });
    } else timer = clock.setTimeout(tick, Math.min(100, remaining));
  };
  let lastInput = 'pointer';
  const move = (direction, input) => {
    if (!active || clock.performance.now() >= deadline) return;
    lastInput = input;
    position = moveMaze(maze, position, direction);
    if (position === maze.end) { completed++; nextLevel(); }
    else draw();
    root.querySelector('[data-time]').textContent = `${Math.ceil((deadline - clock.performance.now()) / 1000)} 秒`;
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
  nextLevel();
  tick();
  return cleanup;
}

import { createLights, solveLights, toggleLights } from '../engines/boards.js';
import { bindBoardButtons, trackInputs } from '../engines/board-input.js';

export const definition = {
  id: 'lights-out',
  modes: [{
    id: 'timed', name: '限时熄灯', ruleVersion: 2,
    presets: [
      { id: 'easy', name: '容易', settings: { min: 3, max: 5 } },
      { id: 'normal', name: '普通', settings: { min: 6, max: 8 } },
      { id: 'hard', name: '困难', settings: { min: 9, max: 15 } },
    ],
    score: { unit: '分', lower: false, min: -1000000 }, hiddenPolicy: 'invalidate',
    inputs: ['pointer', 'touch', 'keyboard', 'mixed'], rule: '点击切换自身和相邻灯光, 3 分钟内尽量完成更多关卡.'
  }]
};

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const started = clock.performance.now();
  const deadline = started + 180000;
  let initial;
  let board;
  let hint = -1;
  let score = 0;
  let levels = 0;
  let steps = 0;
  let hints = 0;
  let timer;
  let active = true;
  const inputs = trackInputs();
  const cleanup = () => { active = false; controller.abort(); clock.clearTimeout(timer); };
  const draw = () => {
    root.innerHTML = `<div class="game-status"><span>得分 ${score}, 完成 ${levels} 关</span><span data-time></span></div><div class="play-grid" style="--columns:5">${board.map((lit, index) => `<button class="play-cell" data-index="${index}" aria-label="第 ${index + 1} 灯${lit ? '亮' : '灭'}${hint === index ? ', 提示' : ''}" style="background:${lit ? '#e2b93b' : '#777'};${hint === index ? 'outline:3px solid #3275bf' : ''}"></button>`).join('')}</div><div class="answer-options"><button class="answer-button" data-action="reset">重置本关</button><button class="answer-button" data-action="hint">提示 (-2 分)</button></div>`;
    root.querySelector('[data-time]').textContent = `${Math.max(0, Math.ceil((deadline - clock.performance.now()) / 1000))} 秒`;
  };
  const next = () => { initial = createLights(settings.min, settings.max, random).board; board = [...initial]; hint = -1; draw(); };
  const tick = () => {
    if (!active) return;
    const remaining = Math.max(0, deadline - clock.performance.now());
    root.querySelector('[data-time]').textContent = `${Math.ceil(remaining / 1000)} 秒`;
    if (!remaining) {
      const duration = (clock.performance.now() - started) / 1000;
      cleanup();
      onFinish({ value: score, detail: `完成 ${levels} 关, 提示 ${hints} 次`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputs.value, endReason: 'timeout', scored: true, metrics: { levels, steps, hints }, trials: [] });
    } else timer = clock.setTimeout(tick, Math.min(100, remaining));
  };
  bindBoardButtons(root, 'button[data-index], button[data-action]', (button, input, at) => {
    if (!active || at >= deadline) return;
    inputs.add(input);
    if ('index' in button.dataset) {
      board = toggleLights(board, Number(button.dataset.index));
      hint = -1;
      steps++;
      if (!board.some(Boolean)) { levels++; score += 10; next(); }
      else draw();
      return;
    }
    const action = button.dataset.action;
    if (action === 'reset') { board = [...initial]; hint = -1; draw(); }
    if (action === 'hint') {
      hint = solveLights(board)[0];
      score -= 2;
      hints++;
      draw();
    }
  }, controller.signal, () => clock.performance.now());
  next();
  tick();
  return cleanup;
}

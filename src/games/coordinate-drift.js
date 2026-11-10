import { createInputTracker } from '../engines/input.js';
import { makePath, uniquePositions, presentTimed } from '../engines/sequence.js';
import { createRuntime } from '../engines/runtime.js';

const mode = (ships) => ({ id: `ships-${ships}`, name: ships === 1 ? '单目标' : '双目标', ruleVersion: 2, presets: [{ id: 'standard', name: '标准', settings: { size: 5, ships } }], score: { unit: '关', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '记住起点, 跟随逐条指令在心中移动, 再按顺序点击终点.' });
export const definition = { id: 'coordinate-drift', modes: [mode(1), mode(2)] };
export function makeRoutes(size, ships, steps, random = Math.random) {
  return uniquePositions(size, ships, random).map((start) => makePath(size, steps, random, start));
}
export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const inputKind = createInputTracker(runtime, root);
  let level = 1, lives = 3, completed = 0, routes, roundTrial, phase = 'show', answerIndex = 0;
  const trials = [];
  const show = () => {
    phase = 'show'; answerIndex = 0;
    routes = makeRoutes(settings.size, settings.ships, level + 2, random);
    roundTrial = { level, routes, commands: [], responses: [] };
    trials.push(roundTrial);
    presentTimed(runtime, () => {
      root.innerHTML = `<div class="game-status"><span>第 ${level} 关 · 剩余 ${lives} 次</span><span data-hint>记住起点</span></div><div class="play-grid" style="--columns:${settings.size}">${Array.from({ length: settings.size ** 2 }, (_, index) => `<button class="play-cell" type="button" data-cell="${index}" aria-label="位置 ${index + 1}">${routes.map((route, i) => route.start === index ? String(i + 1) : '').join('')}</button>`).join('')}</div><p class="stimulus" data-step></p>`;
    }, 2500, () => {
      root.querySelectorAll('[data-cell]').forEach((cell) => { cell.textContent = ''; });
    }, (timing) => {
      roundTrial.startPresentation = timing;
      const commands = routes.flatMap((route, i) => route.steps.map((step) => `${settings.ships > 1 ? `${i + 1} 号 ` : ''}${step}`));
      let index = 0;
      const next = () => {
        if (index === commands.length) { phase = 'answer'; root.querySelector('[data-hint]').textContent = '点击 1 号终点'; return; }
        const command = commands[index++];
        presentTimed(runtime, () => {
          root.querySelector('[data-hint]').textContent = '跟随指令';
          root.querySelector('[data-step]').textContent = command;
        }, 800, () => { root.querySelector('[data-step]').textContent = ''; }, (commandTiming) => {
          roundTrial.commands.push({ command, ...commandTiming });
          next();
        });
      };
      next();
    });
  };
  runtime.listen(root, 'click', (event) => {
    const cell = event.target.closest('[data-cell]');
    if (!cell || phase !== 'answer') return;
    roundTrial.responses.push(Number(cell.dataset.cell));
    if (Number(cell.dataset.cell) !== routes[answerIndex].end) {
      roundTrial.correct = false;
      lives--;
      if (!lives) { phase = 'finished'; runtime.finish({ value: completed, detail: `完成 ${completed} 关`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputKind(), endReason: 'mistake', scored: true, metrics: { lives }, trials }); return; }
      phase = 'waiting'; runtime.later(show, 500); return;
    }
    answerIndex++;
    if (answerIndex < routes.length) { root.querySelector('[data-hint]').textContent = `点击 ${answerIndex + 1} 号终点`; return; }
    roundTrial.correct = true;
    completed = level++; phase = 'waiting'; runtime.later(show, 500);
  });
  show(); return runtime.cleanup;
}

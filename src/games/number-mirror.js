export const definition = {
  id: 'number-mirror',
  modes: [{
    id: 'timed', name: '数字镜像', ruleVersion: 2,
    presets: [{ id: 'standard', name: '120 秒', settings: {} }],
    score: { unit: '分', lower: false, min: -1000000 }, hiddenPolicy: 'invalidate',
    inputs: ['pointer', 'touch', 'keyboard', 'mixed'], rule: '数字可能旋转, 判断它是否左右镜像.'
  }]
};

const digits = ['2', '3', '4', '5', '7'];

export function numberMirrorTrial(random = Math.random) {
  return { digit: digits[Math.floor(random() * digits.length)], angle: Math.floor(random() * 4) * 90, mirrored: random() < 0.5 };
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const started = clock.performance.now();
  const deadline = started + 120000;
  let mirrored;
  let score = 0;
  let correct = 0;
  let wrong = 0;
  const inputs = trackInputs();
  let timer;
  let active = true;
  const cleanup = () => { active = false; controller.abort(); clock.clearTimeout(timer); };
  const next = () => {
    const trial = numberMirrorTrial(random);
    const { digit, angle } = trial;
    mirrored = trial.mirrored;
    root.innerHTML = `<div class="game-status"><span>得分 ${score}</span><span data-time></span></div><div class="stimulus" aria-label="数字图形"><span style="display:inline-block;transform:rotate(${angle}deg)"><span style="display:inline-block;transform:scaleX(${mirrored ? -1 : 1});font-family:Arial,sans-serif">${digit}</span></span></div><p class="stage-note">这个数字是镜像吗?</p><div class="answer-options"><button class="answer-button" data-answer="no">否</button><button class="answer-button" data-answer="yes">是</button></div>`;
    root.querySelector('[data-time]').textContent = `${Math.max(0, Math.ceil((deadline - clock.performance.now()) / 1000))} 秒`;
  };
  const tick = () => {
    if (!active) return;
    const remaining = Math.max(0, deadline - clock.performance.now());
    root.querySelector('[data-time]').textContent = `${Math.ceil(remaining / 1000)} 秒`;
    if (!remaining) {
      const duration = (clock.performance.now() - started) / 1000;
      cleanup();
      onFinish({ value: score, detail: `答对 ${correct} 题, 答错 ${wrong} 题`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputs.value, endReason: 'timeout', scored: true, metrics: { correct, wrong }, trials: [] });
    } else timer = clock.setTimeout(tick, Math.min(100, remaining));
  };
  const respond = (value, input, at) => {
    if (!active || at >= deadline) return;
    inputs.add(input);
    if (value === mirrored) { score++; correct++; }
    else { score--; wrong++; }
    next();
  };
  bindBoardButtons(root, 'button[data-answer]', (button, input, at) => respond(button.dataset.answer === 'yes', input, at), controller.signal, () => clock.performance.now());
  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.target.matches('input, textarea, select')) return;
    if (event.code === 'Digit1') respond(false, 'keyboard', inputTime(event, () => clock.performance.now()));
    if (event.code === 'Digit2') respond(true, 'keyboard', inputTime(event, () => clock.performance.now()));
  }, { signal: controller.signal });
  next();
  tick();
  return cleanup;
}
import { bindBoardButtons, trackInputs } from '../engines/board-input.js';
import { inputTime } from '../engines/runtime.js';


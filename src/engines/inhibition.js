import { createRuntime, inputMethod, inputTime, trackInputs } from './runtime.js';
import { presentOnFrame } from './trials.js';
import { shuffle } from '../core.js';

export function inhibitionSummary(trials) {
  const go = trials.filter((trial) => !trial.stop);
  const stop = trials.filter((trial) => trial.stop);
  return {
    goCorrect: go.filter((trial) => trial.correct).length,
    goTotal: go.length,
    stopCorrect: stop.filter((trial) => trial.correct).length,
    stopTotal: stop.length,
    omissions: go.filter((trial) => trial.response === null).length,
    falseAlarms: stop.filter((trial) => trial.response !== null).length,
  };
}

export function mountInhibition({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis, kind }) {
  const runtime = createRuntime({ onFinish, clock });
  const values = { ...preset.settings, ...settings };
  const trials = [];
  const stopCount = Math.round(values.count * values.stopRate / 100);
  const schedule = shuffle([...Array(stopCount).fill(true), ...Array(values.count - stopCount).fill(false)], random);
  const inputs = trackInputs();
  let current;
  let shownAt;
  let accepted = false;
  let waiting = false;
  const next = () => {
    if (trials.length >= values.count) {
      const metrics = inhibitionSummary(trials);
      const correct = metrics.goCorrect + metrics.stopCorrect;
      const value = kind === 'sart' ? correct / trials.length : metrics.stopCorrect / metrics.stopTotal;
      runtime.finish({ value: Math.round(value * 100), detail: `${trials.length} 次中正确 ${correct} 次`, mode: mode.id, preset: preset.id, settings: values, rules: mode.ruleVersion, input: inputs.value, endReason: 'completed', scored: true, metrics, trials });
      return;
    }
    waiting = true;
    accepted = false;
    const stop = schedule[trials.length];
    const direction = random() < 0.5 ? 'left' : 'right';
    const digit = stop ? 3 : [1, 2, 4, 5, 6, 7, 8, 9][Math.floor(random() * 8)];
    current = { stop, direction, response: null, responseMs: null, signalAt: null, correct: false };
    presentOnFrame(runtime, () => {
      const stimulus = kind === 'sart' ? digit : kind === 'stop-signal' ? (direction === 'left' ? '←' : '→') : (stop ? '×' : '●');
      root.innerHTML = `<div class="game-status"><span>第 ${trials.length + 1} / ${values.count} 次</span><span>${kind === 'sart' ? '3 不按' : kind === 'stop-signal' ? '红框时不按' : '绿色点击 / 红色等待'}</span></div><div class="reaction-area ${kind === 'gonogo' ? `go-area ${stop ? 'nogo' : 'go'}` : ''}" id="inhibition-stimulus"><strong style="font-size:64px">${stimulus}</strong></div><div class="answer-options">${kind === 'stop-signal' ? '<button class="answer-button" data-answer="left">← 左</button><button class="answer-button" data-answer="right">右 →</button>' : '<button class="button primary" data-answer="press">响应</button>'}</div><p class="stage-note">${kind === 'stop-signal' ? '方向键或点击按钮' : '空格键或点击按钮'}</p>`;
    }, (at) => {
      shownAt = at;
      waiting = false;
      if (kind === 'stop-signal' && stop) runtime.later(() => {
        current.signalAt = runtime.now() - shownAt;
        root.querySelector('#inhibition-stimulus').style.boxShadow = 'inset 0 0 0 5px #c44343';
      }, values.delayMin + random() * (values.delayMax - values.delayMin));
      runtime.later(() => {
        current.correct = current.stop ? current.response === null : kind === 'stop-signal' ? current.response === current.direction : current.response !== null;
        trials.push(current);
        waiting = true;
        root.innerHTML = '<div class="stimulus fixation">+</div>';
        runtime.later(next, values.interval);
      }, values.window);
    });
  };
  const answer = (value, event, input) => {
    if (waiting || accepted) return;
    accepted = true;
    current.response = value;
    current.responseMs = Math.max(0, inputTime(event, runtime.now) - shownAt);
    inputs.add(input);
  };
  runtime.listen(root, 'pointerdown', (event) => {
    const button = event.target.closest('[data-answer]');
    if (!button || event.button !== 0) return;
    event.preventDefault();
    answer(button.dataset.answer, event, inputMethod(event));
  });
  runtime.listen(document, 'keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const value = kind === 'stop-signal' ? ({ ArrowLeft: 'left', ArrowRight: 'right' })[event.code] : event.code === 'Space' ? 'press' : null;
    if (!value) return;
    event.preventDefault();
    answer(value, event, inputMethod(event));
  });
  next();
  return runtime.cleanup;
}

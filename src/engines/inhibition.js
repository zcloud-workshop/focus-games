import { createRuntime, inputMethod, inputTime, trackInputs } from './runtime.js';
import { presentOnFrame } from './trials.js';

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

export function inhibitionUnlock(kind, preset, metrics) {
  if (!metrics.stopTotal) return [];
  const percent = metrics.stopCorrect / metrics.stopTotal * 100;
  if (kind === 'gonogo' && preset.id === 'beginner' && percent >= 85) return ['gonogo|signals|standard'];
  if (kind === 'gonogo' && preset.id === 'standard' && percent >= 90) return ['gonogo|signals|fast'];
  if (kind === 'stop-signal' && preset.id === 'beginner' && percent >= 80) return ['stop-signal|stop|standard'];
  if (kind === 'stop-signal' && preset.id === 'standard' && percent >= 75) return ['stop-signal|stop|fast'];
  if (kind === 'sart' && preset.id === 'slow' && percent >= 88) return ['sart|digits|standard'];
  if (kind === 'sart' && preset.id === 'standard' && percent >= 92) return ['sart|digits|fast'];
  return [];
}

export function mountInhibition({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis, kind }) {
  const runtime = createRuntime({ onFinish, clock });
  const values = { ...preset.settings, ...settings };
  const trials = [];
  const inputs = trackInputs();
  let current;
  let shownAt;
  let accepted = false;
  let waiting = true;
  let endTimer;
  let signalTimer;
  const conclude = () => {
    if (waiting) return;
    waiting = true;
    runtime.cancel(endTimer);
    runtime.cancel(signalTimer);
    current.correct = current.stop ? current.response === null : kind === 'stop-signal' ? current.response === current.direction : current.response !== null;
    trials.push(current);
    if (current.response !== null) {
      root.innerHTML = `<div class="stimulus">${current.correct ? '正确' : '错误'}</div>`;
      runtime.later(() => {
        if (values.responseInterval) {
          root.innerHTML = '<div class="stimulus fixation">+</div>';
          runtime.later(next, values.responseInterval);
        } else next();
      }, values.feedback ?? 400);
    } else {
      root.innerHTML = '<div class="stimulus fixation">+</div>';
      runtime.later(next, values.interval);
    }
  };
  const next = () => {
    if (trials.length >= values.count) {
      const metrics = inhibitionSummary(trials);
      const correct = metrics.goCorrect + metrics.stopCorrect;
      const value = metrics.stopTotal ? metrics.stopCorrect / metrics.stopTotal : null;
      runtime.finish({ value: value === null ? null : Math.round(value * 100), detail: `${trials.length} 次中正确 ${correct} 次`, mode: mode.id, preset: preset.id, settings: values, rules: mode.ruleVersion, input: inputs.value, endReason: 'completed', scored: value !== null, metrics, trials, unlocks: inhibitionUnlock(kind, preset, metrics) });
      return;
    }
    waiting = true;
    accepted = false;
    const stop = random() < values.stopRate / 100;
    const direction = random() < 0.5 ? 'left' : 'right';
    const digit = stop ? 3 : [1, 2, 4, 5, 6, 7, 8, 9][Math.floor(random() * 8)];
    current = { stop, direction, response: null, responseMs: null, signalAt: null, correct: false };
    presentOnFrame(runtime, () => {
      const stimulus = kind === 'sart' ? digit : kind === 'stop-signal' ? (direction === 'left' ? '←' : '→') : (stop ? '×' : '●');
      root.innerHTML = `<div class="game-status"><span>第 ${trials.length + 1} / ${values.count} 次</span><span>${kind === 'sart' ? '3 不按' : kind === 'stop-signal' ? '红框时不按' : '绿色点击 / 红色等待'}</span></div><div class="reaction-area ${kind === 'gonogo' ? `go-area ${stop ? 'nogo' : 'go'}` : ''}" id="inhibition-stimulus"><strong style="font-size:64px">${stimulus}</strong></div><div class="answer-options">${kind === 'stop-signal' ? '<button class="answer-button" data-answer="left">← 左</button><button class="answer-button" data-answer="right">右 →</button>' : '<button class="button primary" data-answer="press">响应</button>'}</div><p class="stage-note">${kind === 'stop-signal' ? '方向键或点击按钮' : '空格键或点击按钮'}</p>`;
    }, (at) => {
      shownAt = at;
      waiting = false;
      if (kind === 'stop-signal' && stop) signalTimer = runtime.later(() => {
        current.signalAt = runtime.now() - shownAt;
        root.querySelector('#inhibition-stimulus').style.boxShadow = 'inset 0 0 0 5px #c44343';
      }, values.delayMin + random() * ((values.delayMax ?? values.delayMin + 250) - values.delayMin));
      endTimer = runtime.later(conclude, values.window);
    });
  };
  const answer = (value, event, input) => {
    if (waiting || accepted) return;
    const at = inputTime(event, runtime.now);
    if (at >= shownAt + values.window) { conclude(); return; }
    accepted = true;
    current.response = value;
    current.responseMs = Math.max(0, at - shownAt);
    inputs.add(input);
    conclude();
  };
  runtime.listen(root, 'pointerdown', (event) => {
    const button = event.target.closest('[data-answer]');
    const stimulus = kind !== 'stop-signal' && event.target.closest('#inhibition-stimulus');
    if ((!button && !stimulus) || event.button !== 0) return;
    event.preventDefault();
    answer(button ? button.dataset.answer : 'press', event, inputMethod(event));
  });
  runtime.listen(document, 'keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const value = kind === 'stop-signal' ? ({ ArrowLeft: 'left', ArrowRight: 'right' })[event.code] : event.code === 'Space' ? 'press' : null;
    if (!value) return;
    event.preventDefault();
    answer(value, event, inputMethod(event));
  });
  if (kind === 'gonogo' || kind === 'stop-signal') {
    root.innerHTML = '<div class="stimulus">准备</div>';
    runtime.later(next, 3000);
  } else next();
  return runtime.cleanup;
}

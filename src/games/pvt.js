import { createRuntime, inputTime } from '../engines/runtime.js';
import { meanValidResponses, presentOnFrame } from '../engines/trials.js';

export const definition = { id: 'pvt', modes: [{ id: 'vigilance', name: '持续警觉', ruleVersion: 2, presets: [
  { id: 'brief', name: '3 分钟', settings: { duration: 180, minWait: 1000, maxWait: 4000, lapse: 355 } },
  { id: 'full', name: '10 分钟', settings: { duration: 600, minWait: 2000, maxWait: 10000, lapse: 500 } },
], score: { unit: 'ms', lower: true, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard'], rule: '等待数字出现后立即点击或按空格. 持续到计时结束.' }] };

export function pvtMetrics(trials, lapse) {
  const valid = trials.filter((trial) => trial.valid).map((trial) => trial.responseMs).sort((a, b) => a - b);
  const count = Math.max(1, Math.ceil(valid.length / 10));
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return { valid: valid.length, early: trials.filter((trial) => !trial.valid).length, lapses: valid.filter((value) => value > lapse).length, medianMs: valid.length ? (valid[Math.floor((valid.length - 1) / 2)] + valid[Math.floor(valid.length / 2)]) / 2 : null, fastest10Ms: valid.length ? mean(valid.slice(0, count)) : null, slowest10Ms: valid.length ? mean(valid.slice(-count)) : null };
}

export function mount({ root, mode = definition.modes[0], preset = mode.presets[0], settings = preset.settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const values = { ...preset.settings, ...settings };
  const trials = [];
  const inputs = new Set();
  const start = runtime.now();
  let phase = 'waiting';
  let shownAt;
  let timer;
  const end = () => {
    phase = 'finished';
    const average = meanValidResponses(trials);
    runtime.finish({ value: average, detail: average === null ? '没有有效反应样本' : `有效反应 ${trials.filter((trial) => trial.valid).length} 次`, mode: mode.id, preset: preset.id, settings: values, rules: mode.ruleVersion, input: inputs.size === 1 ? [...inputs][0] : inputs.size ? 'mixed' : 'any', endReason: 'timeout', scored: average !== null, metrics: pvtMetrics(trials, values.lapse), trials });
  };
  const draw = (label) => {
    root.innerHTML = `<div class="game-status"><span>持续警觉</span><span>剩余 ${Math.max(0, Math.ceil(values.duration - (runtime.now() - start) / 1000))} 秒</span></div><button type="button" class="reaction-area" data-pvt><strong>${label}</strong><span>点击此处或按空格</span></button>`;
  };
  const update = () => {
    if (phase !== 'ready') return;
    const label = root.querySelector('[data-pvt] strong');
    if (label) label.textContent = `${Math.round(runtime.now() - shownAt)} ms`;
    runtime.frame(update);
  };
  const wait = () => {
    phase = 'waiting'; draw('等待信号');
    timer = runtime.later(() => presentOnFrame(runtime, () => { phase = 'ready'; draw('0 ms'); }, (at) => { shownAt = at; runtime.frame(update); }), values.minWait + random() * (values.maxWait - values.minWait));
  };
  const respond = (event, input) => {
    if (phase !== 'waiting' && phase !== 'ready') return;
    inputs.add(input);
    const at = inputTime(event, runtime.now);
    if (at >= start + values.duration * 1000) { end(); return; }
    const responseMs = phase === 'ready' ? Math.max(0, at - shownAt) : null;
    const valid = responseMs !== null && responseMs >= 100;
    runtime.cancel(timer);
    trials.push({ valid, responseMs, input, elapsedMs: at - start });
    phase = 'feedback';
    draw(valid ? `${Math.round(responseMs)} ms` : '抢按');
    runtime.later(wait, 1000);
  };
  runtime.listen(root, 'pointerdown', (event) => { if (event.button !== 0 || !event.target.closest('[data-pvt]')) return; event.preventDefault(); respond(event, event.pointerType === 'touch' ? 'touch' : 'pointer'); });
  runtime.listen(document, 'keydown', (event) => { if (event.code !== 'Space' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return; event.preventDefault(); respond(event, 'keyboard'); });
  runtime.later(end, values.duration * 1000);
  wait();
  return runtime.cleanup;
}

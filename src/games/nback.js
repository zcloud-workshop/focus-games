import { createInputTracker } from '../engines/input.js';
import { shuffle } from '../core.js';
import { makeChannel } from '../engines/nback.js';
import { createRuntime } from '../engines/runtime.js';
import { presentOnFrame } from '../engines/trials.js';

const presets = (count, maximum) => Array.from({ length: maximum }, (_, index) => ({ id: `n-${index + 1}`, name: `${index + 1}-Back`, settings: { n: index + 1, count } }));
export const definition = { id: 'nback', modes: [
  { id: 'letters', name: '字母判断', ruleVersion: 3, presets: [presets(30, 3)[1], presets(30, 3)[0], presets(30, 3)[2], { id: 'custom', name: '自定义', settings: { n: 2, count: 30 }, fields: [{ key: 'n', label: '回溯步数', type: 'number', min: 1, max: 5, step: 1 }, { key: 'count', label: '总刺激数', type: 'number', min: 20, max: 60, step: 10 }] }], score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard', 'touch'], rule: '判断当前字母与 N 步前是否相同.' },
  { id: 'pictures', name: '图形回溯', ruleVersion: 2, presets: presets(20, 8), score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard', 'touch'], rule: '选择 N 步前看到的图形.' },
] };
const symbols = ['○','△','□','◇','⬡','✕','＋','☆','▽','▱','◉','⊞'];
export function pictureChoices(target, random = Math.random) { return shuffle([target, ...shuffle(symbols.filter((item) => item !== target), random).slice(0, 3)], random); }
export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  if (mode.id === 'letters') return mountLetters({ root, mode, preset, settings, onFinish, random, clock });
  const runtime = createRuntime({ onFinish, clock });
  const inputKind = createInputTracker(runtime, root);
  const pictures = mode.id === 'pictures';
  const sequence = makeChannel({ values: pictures ? symbols : [...'BCDFGHJKLMPRST'], n: settings.n, count: settings.count, random });
  let index = 0, correct = 0, choices = [], active = true;
  const show = () => {
    const warmup = index < settings.n;
    const target = warmup ? '' : sequence[index - settings.n];
    choices = !warmup && pictures ? pictureChoices(target, random) : [];
    root.innerHTML = `<div class="game-status"><span>${warmup ? `观察 ${index + 1} / ${settings.n}` : `第 ${index - settings.n + 1} / ${settings.count} 题`}</span><span>${settings.n}-Back</span></div><div class="stimulus">${sequence[index]}</div><p class="stage-note">${warmup ? '先记住这一项' : pictures ? '选择之前的图形' : '与之前相同吗?'}</p><div class="answer-options">${warmup ? '<button class="answer-button" type="button" data-answer="next">下一个</button>' : pictures ? choices.map((value, i) => `<button class="answer-button" type="button" data-answer="${i}">${value}</button>`).join('') : '<button class="answer-button" type="button" data-answer="same">相同</button><button class="answer-button" type="button" data-answer="different">不同</button>'}</div>`;
  };
  runtime.listen(root, 'click', (event) => {
    const button = event.target.closest('[data-answer]');
    if (!button || !active) return;
    const value = button.dataset.answer;
    if (index >= settings.n) {
      const target = sequence[index - settings.n];
      if (pictures ? choices[Number(value)] === target : (value === 'same') === (sequence[index] === target)) correct++;
    }
    index++;
    if (index === sequence.length) { active = false; runtime.finish({ value: correct / settings.count * 100, detail: `${settings.count} 题答对 ${correct} 题`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputKind(), endReason: 'completed', scored: true, metrics: { correct, total: settings.count } }); }
    else show();
  });
  show(); return runtime.cleanup;
}

function mountLetters({ root, mode, preset, settings, onFinish, random, clock }) {
  const runtime = createRuntime({ onFinish, clock });
  const inputKind = createInputTracker(runtime, root);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const sequence = Array.from({ length: settings.count }, () => alphabet[Math.floor(random() * alphabet.length)]);
  const trials = [];
  let index = -1, phase = 'waiting';
  const show = () => {
    const next = index + 1;
    phase = 'transition';
    presentOnFrame(runtime, () => {
      if (next === sequence.length) { root.innerHTML = ''; return; }
      const warmup = next < settings.n;
      root.innerHTML = `<div class="game-status"><span>${next + 1} / ${settings.count}</span><span>${settings.n}-Back</span></div><div class="stimulus">${sequence[next]}</div><p class="stage-note">${warmup ? '先记住字母' : '与之前的字母相同吗?'}</p><div class="answer-options"><button class="answer-button" type="button" data-answer="same" ${warmup ? 'disabled' : ''}>相同</button><button class="answer-button" type="button" data-answer="different" ${warmup ? 'disabled' : ''}>不同</button></div>`;
    }, (timestamp) => {
      if (index >= 0) trials[index].durationMs = timestamp - trials[index].presentedAt;
      index = next;
      if (index === sequence.length) {
        const answered = trials.filter((trial) => trial.response != null);
        const correct = answered.filter((trial) => trial.correct).length;
        const value = answered.length ? Math.round(correct / answered.length * 100) : null;
        phase = 'finished';
        runtime.finish({ value, detail: answered.length ? `${answered.length} 题作答, 答对 ${correct} 题` : '没有有效作答, 本轮不计分', mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputKind(), endReason: 'completed', scored: answered.length > 0, metrics: { correct, answered: answered.length, omitted: trials.length - settings.n - answered.length }, trials });
        return;
      }
      trials.push({ stimulus: sequence[index], presentedAt: timestamp, warmup: index < settings.n, target: index < settings.n ? null : sequence[index] === sequence[index - settings.n], response: null });
      phase = 'trial';
      runtime.later(show, 2000);
    });
  };
  runtime.listen(root, 'click', (event) => {
    const button = event.target.closest('[data-answer]');
    if (!button || button.disabled || phase !== 'trial' || index < settings.n || trials[index].response != null) return;
    const trial = trials[index];
    trial.response = button.dataset.answer === 'same';
    trial.correct = trial.response === trial.target;
    trial.responseMs = Math.max(0, event.timeStamp - trial.presentedAt);
    root.querySelectorAll('[data-answer]').forEach((item) => { item.disabled = true; });
  });
  show();
  return runtime.cleanup;
}

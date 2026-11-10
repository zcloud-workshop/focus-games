import { createInputTracker } from '../engines/input.js';
import { shuffle } from '../core.js';
import { makeChannel } from '../engines/nback.js';
import { createRuntime } from '../engines/runtime.js';

const presets = (count, maximum) => Array.from({ length: maximum }, (_, index) => ({ id: `n-${index + 1}`, name: `${index + 1}-Back`, settings: { n: index + 1, count } }));
export const definition = { id: 'nback', modes: [
  { id: 'letters', name: '字母判断', ruleVersion: 2, presets: presets(30, 3), fields: [{ key: 'n', label: '回溯步数', type: 'number', default: 1, min: 1, max: 5, step: 1 }, { key: 'count', label: '题数', type: 'number', default: 30, min: 20, max: 60, step: 10 }], score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard', 'touch'], rule: '判断当前字母与 N 步前是否相同.' },
  { id: 'pictures', name: '图形回溯', ruleVersion: 2, presets: presets(20, 8), score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard', 'touch'], rule: '选择 N 步前看到的图形.' },
] };
const symbols = ['○','△','□','◇','⬡','✕','＋','☆','▽','▱','◉','⊞'];
export function pictureChoices(target, random = Math.random) { return shuffle([target, ...shuffle(symbols.filter((item) => item !== target), random).slice(0, 3)], random); }
export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
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

import { createRuntime, inputMethod, inputTime, trackInputs } from '../engines/runtime.js';
import { presentOnFrame } from '../engines/trials.js';

const colors = ['#c44343', '#3275bf', '#27805e', '#b86b14'];
const shapes = ['●', '▲', '■', '◆'];
const rules = ['color', 'shape', 'count'];

export function makeCard(random = Math.random) {
  return Object.fromEntries(rules.map((key) => [key, Math.floor(random() * 4)]));
}
export function matchCard(card, rule, option) { return card[rule] === option; }

export const definition = { id: 'card-sorting', modes: [{ id: 'hidden-rule', name: '发现分类规则', ruleVersion: 3, presets: [30, 40, 60].map((count) => ({ id: String(count), name: `${count} 题`, settings: { count, streak: 5 } })).concat({ id: 'custom', name: '自定义', settings: { count: 40, streak: 5 }, fields: [{ key: 'count', label: '题数', type: 'number', default: 40, min: 10, max: 100, step: 1 }] }), score: { unit: '组', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '根据对错反馈发现卡片的匹配规则. 规则会在练习中改变.' }] };

export function mount({ root, mode = definition.modes[0], preset = mode.presets[0], settings = preset.settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const values = { ...preset.settings, ...settings };
  const trials = [];
  const inputs = trackInputs();
  let current;
  let ruleIndex = 0;
  let previousRule = null;
  let streak = 0;
  let categories = 0;
  let accepting = false;
  let shownAt;
  const cardText = (card) => `<span style="color:${colors[card.color]}">${shapes[card.shape].repeat(card.count + 1)}</span>`;
  const show = () => {
    if (trials.length === values.count) {
      const correct = trials.filter((trial) => trial.correct).length;
      runtime.finish({ value: categories, detail: `${trials.length} 题中答对 ${correct} 题, 完成 ${categories} 组分类`, mode: mode.id, preset: preset.id, settings: values, rules: mode.ruleVersion, input: inputs.value, endReason: 'completed', scored: true, metrics: { correct, errors: trials.length - correct, categories, perseverativeErrors: trials.filter((trial) => trial.perseverative).length }, trials });
      return;
    }
    current = makeCard(random);
    presentOnFrame(runtime, () => {
      root.innerHTML = `<div class="game-status"><span>第 ${trials.length + 1} / ${values.count} 题</span><span>根据反馈发现规则</span></div><div class="stimulus">${cardText(current)}</div><div class="answer-options">${colors.map((color, i) => `<button class="answer-button" data-card="${i}"><span style="color:${color}">${shapes[i].repeat(i + 1)}</span></button>`).join('')}</div><p class="stage-note">选择一张匹配的卡片</p>`;
    }, (at) => { shownAt = at; accepting = true; });
  };
  const answer = (index, event, input) => {
    if (!accepting) return;
    accepting = false;
    inputs.add(input);
    const correct = matchCard(current, rules[ruleIndex], index);
    trials.push({ correct, responseMs: Math.max(0, inputTime(event, runtime.now) - shownAt), perseverative: !correct && previousRule !== null && matchCard(current, previousRule, index) });
    streak = correct ? streak + 1 : 0;
    if (streak >= values.streak) { categories++; streak = 0; previousRule = rules[ruleIndex]; ruleIndex = (ruleIndex + 1) % rules.length; }
    root.querySelector('.stage-note').textContent = correct ? '正确' : '不匹配';
    runtime.later(show, 500);
  };
  runtime.listen(root, 'pointerdown', (event) => { const button = event.target.closest('[data-card]'); if (!button || event.button !== 0) return; event.preventDefault(); answer(Number(button.dataset.card), event, inputMethod(event)); });
  runtime.listen(document, 'keydown', (event) => { if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return; const index = Number(event.code.replace('Digit', '')) - 1; if (index < 0 || index > 3 || !Number.isInteger(index)) return; event.preventDefault(); answer(index, event, inputMethod(event)); });
  show();
  return runtime.cleanup;
}

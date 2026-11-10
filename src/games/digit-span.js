import { createInputTracker } from '../engines/input.js';
import { randomDigits, presentTimed } from '../engines/sequence.js';
import { printSheets } from '../engines/print.js';
import { createRuntime } from '../engines/runtime.js';

const standard = (start, duration = 1000, gap = 250) => ({ id: `start-${start}`, name: `${start} 位起`, settings: { start, duration, gap } });
const spanMode = (id, name, presets, extra = {}) => ({ id, name, ruleVersion: 2, presets, score: { unit: '位', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['keyboard', 'touch'], rule: '逐个观察数字, 在消失后输入完整序列.', ...extra });
export const definition = { id: 'digit-span', modes: [
  spanMode('standard', '数字广度', [standard(3), standard(5), standard(7)], { fields: [{ key: 'start', label: '起始位数', type: 'number', default: 3, min: 1, max: 12, step: 1 }, { key: 'duration', label: '每位时长', type: 'number', default: 1000, min: 300, max: 2000, step: 100, unit: '毫秒' }] }),
  spanMode('forward', '正背', [standard(3, 700, 300)], { ruleVersion: 3 }),
  spanMode('backward', '倒背', [standard(3, 700, 300)], { ruleVersion: 3, rule: '逐个观察数字, 然后按倒序输入.' }),
  spanMode('example-forward', '正背例题', [standard(3, 700, 300)], { ruleVersion: 3, scored: false }),
  spanMode('example-backward', '倒背例题', [standard(3, 700, 300)], { ruleVersion: 3, scored: false, rule: '逐个观察数字, 然后按倒序输入.' }),
] };

export function freshDigits(length, previous, random = Math.random) {
  const digits = randomDigits(length, random);
  return digits === previous ? digits.slice(0, -1) + ((Number(digits.at(-1)) + 1) % 10) : digits;
}
export function spanAnswer(digits, backward) { return backward ? [...digits].reverse().join('') : digits; }
export function practiceSheets(random = Math.random) {
  const rows = Array.from({ length: 6 }, (_, index) => [index + 3, randomDigits(index + 3, random), randomDigits(index + 3, random)]);
  const table = (answer) => `<table><thead><tr><th>位数</th><th>正背</th><th>倒背</th></tr></thead><tbody>${rows.map(([length, forward, backward]) => `<tr><td>${length}</td><td>${forward}${answer ? ` → ${forward}` : ''}</td><td>${backward}${answer ? ` → ${spanAnswer(backward, true)}` : ''}</td></tr>`).join('')}</tbody></table>`;
  return [table(false), table(true)];
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const inputKind = createInputTracker(runtime, root);
  let length = settings.start, previous = '', digits = '', failures = 0, best = 0, phase = 'show', roundTrial;
  const trials = [];
  const backward = mode.id.includes('backward');
  const example = mode.scored === false;
  const header = () => `<div class="game-status"><span>${length} 位 · ${backward ? '倒背' : '正背'}</span><button class="text-button" type="button" data-print>打印练习表</button></div>`;
  const show = () => {
    phase = 'show';
    digits = example ? '418' : freshDigits(length, previous, random);
    previous = digits;
    roundTrial = { length, attempt: failures + 1, digits: [] };
    trials.push(roundTrial);
    root.innerHTML = header() + '<div class="stimulus" data-digit>·</div><p class="stage-note">观察数字</p>';
    let index = 0;
    const next = () => {
      if (index === digits.length) { answer(); return; }
      const value = digits[index++];
      presentTimed(runtime, () => { root.querySelector('[data-digit]').textContent = value; }, settings.duration, () => { root.querySelector('[data-digit]').textContent = '·'; }, (timing) => {
        roundTrial.digits.push({ value, ...timing });
        runtime.later(next, settings.gap);
      });
    };
    runtime.later(next, 500);
  };
  const answer = () => {
    phase = 'answer';
    root.innerHTML = header() + `<form class="number-form"><label for="span-answer">${backward ? '倒序' : '按原顺序'}输入数字</label><input id="span-answer" inputmode="numeric" autocomplete="off" pattern="[0-9]+" maxlength="${length}" required><div class="answer-options">${'1234567890'.split('').map((digit) => `<button type="button" data-digit="${digit}">${digit}</button>`).join('')}<button type="button" data-clear>清空</button></div><button class="button primary" type="submit">确认</button></form>`;
    root.querySelector('input').focus();
  };
  runtime.listen(root, 'click', (event) => {
    if (event.target.closest('[data-print]')) { printSheets({ title: '数字广度练习', pages: practiceSheets(random) }); return; }
    if (phase !== 'answer') return;
    const input = root.querySelector('input');
    const button = event.target.closest('[data-digit]');
    if (button && input.value.length < length) input.value += button.dataset.digit;
    if (event.target.closest('[data-clear]')) input.value = '';
  });
  runtime.listen(root, 'submit', (event) => {
    event.preventDefault();
    if (phase !== 'answer') return;
    const response = root.querySelector('input').value;
    if (response.length !== digits.length) return;
    const correct = response === spanAnswer(digits, backward);
    roundTrial.correct = correct;
    if (correct) best = length;
    if (example || (!correct && ++failures >= (mode.id === 'standard' ? 1 : 2))) {
      phase = 'finished';
      runtime.finish({ value: best, detail: correct ? `完成 ${length} 位` : `最长成功 ${best} 位`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputKind(), endReason: correct ? 'completed' : 'mistake', scored: !example, metrics: { best }, trials });
      return;
    }
    if (correct) { length++; failures = 0; }
    show();
  });
  show();
  return runtime.cleanup;
}

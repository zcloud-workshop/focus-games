import { randomDigits } from '../engines/sequence.js';
import { printSheets } from '../engines/print.js';
import { createRuntime } from '../engines/runtime.js';

const standard = (start) => ({ id: `start-${start}`, name: `${start} 位起`, settings: { start, duration: 1000 } });
const spanMode = (id, name, presets, extra = {}) => ({ id, name, ruleVersion: 2, presets, score: { unit: '位', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['keyboard', 'touch'], rule: '逐个观察数字, 在消失后输入完整序列.', ...extra });
export const definition = { id: 'digit-span', modes: [
  spanMode('standard', '数字广度', [standard(3), standard(5), standard(7)], { fields: [{ key: 'start', label: '起始位数', type: 'number', default: 3, min: 1, max: 12, step: 1 }, { key: 'duration', label: '每位时长', type: 'number', default: 1000, min: 300, max: 2000, step: 100, unit: '毫秒' }] }),
  spanMode('forward', '正背', [standard(3)]),
  spanMode('backward', '倒背', [standard(3)], { rule: '逐个观察数字, 然后按倒序输入.' }),
  spanMode('example-forward', '正背例题', [standard(3)], { scored: false }),
  spanMode('example-backward', '倒背例题', [standard(3)], { scored: false, rule: '逐个观察数字, 然后按倒序输入.' }),
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
  let length = settings.start, previous = '', digits = '', failures = 0, best = 0, phase = 'show';
  const backward = mode.id.includes('backward');
  const example = mode.scored === false;
  const header = () => `<div class="game-status"><span>${length} 位 · ${backward ? '倒背' : '正背'}</span><button class="text-button" type="button" data-print>打印练习表</button></div>`;
  const show = () => {
    phase = 'show';
    digits = freshDigits(length, previous, random);
    previous = digits;
    root.innerHTML = header() + '<div class="stimulus" data-digit>·</div><p class="stage-note">观察数字</p>';
    let index = 0;
    const next = () => {
      if (index === digits.length) { answer(); return; }
      root.querySelector('[data-digit]').textContent = digits[index++];
      runtime.frame(() => runtime.later(() => { root.querySelector('[data-digit]').textContent = '·'; runtime.later(next, 250); }, settings.duration));
    };
    runtime.later(next, 500);
  };
  const answer = () => {
    phase = 'answer';
    root.innerHTML = header() + `<form class="number-form"><label for="span-answer">${backward ? '倒序' : '按原顺序'}输入数字</label><input id="span-answer" inputmode="numeric" autocomplete="off" pattern="[0-9]+" required><div class="answer-options">${'1234567890'.split('').map((digit) => `<button type="button" data-digit="${digit}">${digit}</button>`).join('')}<button type="button" data-clear>清空</button></div><button class="button primary" type="submit">确认</button></form>`;
    root.querySelector('input').focus();
  };
  runtime.listen(root, 'click', (event) => {
    if (event.target.closest('[data-print]')) { printSheets({ title: '数字广度练习', pages: practiceSheets(random) }); return; }
    if (phase !== 'answer') return;
    const input = root.querySelector('input');
    const button = event.target.closest('[data-digit]');
    if (button) input.value += button.dataset.digit;
    if (event.target.closest('[data-clear]')) input.value = '';
  });
  runtime.listen(root, 'submit', (event) => {
    event.preventDefault();
    if (phase !== 'answer') return;
    const correct = root.querySelector('input').value === spanAnswer(digits, backward);
    if (correct) best = length;
    if (example || (!correct && ++failures >= (mode.id === 'standard' ? 1 : 2))) {
      phase = 'finished';
      runtime.finish({ value: best, detail: correct ? `完成 ${length} 位` : `最长成功 ${best} 位`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: 'mixed', endReason: correct ? 'completed' : 'mistake', scored: !example, metrics: { best } });
      return;
    }
    if (correct) { length++; failures = 0; }
    show();
  });
  show();
  return runtime.cleanup;
}

import { randomDigits } from '../engines/sequence.js';
import { createRuntime } from '../engines/runtime.js';

export const definition = { id: 'dynamic-visual-acuity-test', modes: [{ id: 'flash', name: '瞬时数字', ruleVersion: 2, presets: [{ id: 'standard', name: '标准', settings: {} }], score: { unit: '关', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['keyboard', 'touch'], rule: '短暂观察整组数字, 消失后输入. 答对升级, 答错结束.', warning: '本训练包含短暂闪现的数字.' }] };

export function levelSettings(level) {
  return { length: 4 + Math.floor((level - 1) / 3), duration: Math.max(200, 1000 - (level - 1) * 50) };
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  let level = 1, answer = '', phase = 'show';
  const show = () => {
    phase = 'show';
    const config = levelSettings(level);
    answer = randomDigits(config.length, random);
    root.innerHTML = `<div class="game-status"><span>第 ${level} 关</span><span>观察数字</span></div><div class="stimulus number-stimulus">${answer}</div>`;
    runtime.later(() => {
      phase = 'answer';
      root.innerHTML = `<div class="game-status"><span>第 ${level} 关</span><span>输入刚才的数字</span></div><form class="number-form"><label for="flash-answer">数字</label><input id="flash-answer" inputmode="numeric" autocomplete="off" pattern="[0-9]+" required><button class="button primary" type="submit">确认</button></form>`;
      root.querySelector('input').focus();
    }, config.duration);
  };
  runtime.listen(root, 'submit', (event) => {
    event.preventDefault();
    if (phase !== 'answer') return;
    const input = root.querySelector('input').value;
    if (input !== answer) { phase = 'finished'; runtime.finish({ value: level - 1, detail: `通过 ${level - 1} 关, 本关数字为 ${answer}`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: 'mixed', endReason: 'mistake', scored: true, metrics: { completed: level - 1 } }); return; }
    level++; show();
  });
  show();
  return runtime.cleanup;
}

import { matrixQuestion } from '../engines/transforms.js';
import { bindBoardButtons, trackInputs } from '../engines/board-input.js';

export const definition = {
  id: 'matrix-reasoning',
  modes: [{
    id: 'matrix', name: '矩阵推理', ruleVersion: 2,
    presets: [
      { id: 'two', name: '2 属性', settings: { attributes: 2, complex: false, rounds: 10 } },
      { id: 'three', name: '3 属性', settings: { attributes: 3, complex: false, rounds: 10 } },
      { id: 'complex', name: '复杂组合', settings: { attributes: 3, complex: true, rounds: 10 } },
    ],
    fields: [{ key: 'rounds', label: '题数', type: 'number', default: 10, min: 5, max: 30, step: 1 }],
    score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate',
    inputs: ['pointer', 'touch', 'keyboard', 'mixed'], rule: '观察每行、每列中图形属性的变化, 选择缺失的一格.'
  }]
};

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const started = clock.performance.now();
  const symbols = ['●', '▲', '■'];
  const colors = ['#b84141', '#3275bf', '#27805e'];
  let round = 0;
  let correct = 0;
  let question;
  let active = true;
  const inputs = trackInputs();
  const cleanup = () => { active = false; controller.abort(); };
  const cell = (attributes) => `<span style="color:${colors[attributes[2] ?? 1]};font-size:22px;white-space:nowrap">${symbols[attributes[0]].repeat(attributes[1] + 1)}</span>`;
  const draw = () => {
    question = matrixQuestion(settings.attributes, settings.complex, random);
    root.innerHTML = `<div class="game-status"><span>第 ${round + 1} / ${settings.rounds} 题</span><span>答对 ${correct} 题</span></div><div class="play-grid" style="--columns:3;max-width:280px">${question.cells.map((value, index) => `<div class="play-cell">${index === 8 ? '?' : cell(value)}</div>`).join('')}</div><p class="stage-note">选择缺失的一格</p><div class="answer-options">${question.choices.map((choice, index) => `<button class="answer-button" data-index="${index}" aria-label="选项 ${index + 1}">${cell(choice)}</button>`).join('')}</div>`;
  };
  bindBoardButtons(root, 'button[data-index]', (button, input, at) => {
    if (!active) return;
    inputs.add(input);
    if (Number(button.dataset.index) === question.answer) correct++;
    round++;
    if (round < settings.rounds) { draw(); return; }
    const duration = Math.max(0, at - started) / 1000;
    cleanup();
    onFinish({ value: Math.round(correct / round * 100), detail: `${round} 题中答对 ${correct} 题`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputs.value, endReason: 'complete', scored: true, metrics: { correct, rounds: round }, trials: [] });
  }, controller.signal, () => clock.performance.now());
  draw();
  return cleanup;
}

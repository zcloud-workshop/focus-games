import { rotationQuestion, rotationShape } from '../engines/transforms.js';
import { bindBoardButtons, trackInputs } from '../engines/board-input.js';

const shapes = {
  simple: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 2]],
  complex: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
  large: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [0, 2], [2, 3]],
};

export const definition = {
  id: 'mental-rotation',
  modes: [{
    id: 'rotate', name: '心理旋转', ruleVersion: 2,
    presets: [
      { id: 'simple', name: '3 × 3', settings: { shape: 'simple', rounds: 15 } },
      { id: 'complex', name: '3 × 3 复杂', settings: { shape: 'complex', rounds: 15 } },
      { id: 'large', name: '4 × 4', settings: { shape: 'large', rounds: 15 } },
    ],
    fields: [
      { key: 'rounds', label: '题数', type: 'number', default: 15, min: 5, max: 40, step: 1 },
      { key: 'shape', label: '图形', type: 'select', default: 'simple', options: [{ value: 'simple', label: '3 × 3' }, { value: 'complex', label: '3 × 3 复杂' }, { value: 'large', label: '4 × 4' }] },
    ],
    score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate',
    inputs: ['pointer', 'touch', 'keyboard', 'mixed'], rule: '选择能由上方图形旋转得到的图形, 镜像不能通过旋转重合.'
  }]
};

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const started = clock.performance.now();
  const size = settings.shape === 'large' ? 4 : 3;
  let round = 0;
  let correct = 0;
  let question;
  let active = true;
  const inputs = trackInputs();
  const cleanup = () => { active = false; controller.abort(); };
  const figure = (points) => `<svg viewBox="0 0 ${size} ${size}" width="80" height="80" aria-hidden="true">${points.map(([x, y]) => `<rect x="${x}" y="${y}" width=".93" height=".93" fill="currentColor"/>`).join('')}</svg>`;
  const draw = () => {
    const count = settings.shape === 'simple' ? 5 : settings.shape === 'complex' ? 7 : 8;
    question = rotationQuestion(rotationShape(size, count, random) ?? shapes[settings.shape], random);
    root.innerHTML = `<div class="game-status"><span>第 ${round + 1} / ${settings.rounds} 题</span><span>答对 ${correct} 题</span></div><div style="text-align:center;margin:20px">${figure(question.shape)}</div><div class="answer-options">${question.choices.map((choice, index) => `<button class="answer-button" data-index="${index}" aria-label="选项 ${index + 1}">${figure(choice)}</button>`).join('')}</div>`;
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

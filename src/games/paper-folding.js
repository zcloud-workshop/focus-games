import { shuffle } from '../core.js';
import { unfoldHole } from '../engines/transforms.js';
import { bindBoardButtons, trackInputs } from '../engines/board-input.js';

const folds = [{ axis: 'x', line: 4 }, { axis: 'y', line: 4 }, { axis: 'x', line: 2 }];

export const definition = {
  id: 'paper-folding',
  modes: [{
    id: 'unfold', name: '折纸展开', ruleVersion: 2,
    presets: [1, 2, 3].map((count) => ({ id: `${count}`, name: `折 ${count} 次`, settings: { folds: count, rounds: 10 } })),
    fields: [{ key: 'rounds', label: '题数', type: 'number', default: 10, min: 5, max: 30, step: 1 }],
    score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate',
    inputs: ['pointer', 'touch', 'keyboard', 'mixed'], rule: '观察折叠方向和打孔位置, 选择展开后的孔分布.'
  }]
};

export function foldingQuestion(count, random = Math.random) {
  const selected = folds.slice(0, count);
  const width = count === 3 ? 2 : 4;
  const height = count >= 2 ? 4 : 8;
  const holes = Array.from({ length: width * height }, (_, index) => [index % width, Math.floor(index / width)]);
  const candidates = shuffle(holes, random).slice(0, 4);
  const correct = unfoldHole(candidates[0], selected);
  const choices = shuffle([correct, ...candidates.slice(1).map((hole) => unfoldHole(hole, selected))], random);
  return { hole: candidates[0], width, height, choices, answer: choices.indexOf(correct) };
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const started = clock.performance.now();
  let round = 0;
  let correct = 0;
  let question;
  let active = true;
  const inputs = trackInputs();
  const cleanup = () => { active = false; controller.abort(); };
  const figure = (points, width = 8, height = 8) => `<svg viewBox="0 0 8 8" width="96" height="96" aria-hidden="true"><rect width="8" height="8" fill="#eee"/><rect width="${width}" height="${height}" fill="#bcd4e8"/>${points.map(([x, y]) => `<circle cx="${x + 0.5}" cy="${y + 0.5}" r=".28" fill="#222"/>`).join('')}</svg>`;
  const draw = () => {
    question = foldingQuestion(settings.folds, random);
    const directions = ['右半向左折', '下半向上折', '右半再向左折'].slice(0, settings.folds).join(' → ');
    root.innerHTML = `<div class="game-status"><span>第 ${round + 1} / ${settings.rounds} 题</span><span>答对 ${correct} 题</span></div><p class="stage-note">${directions}, 在蓝色折叠区域打孔</p><div style="text-align:center">${figure([question.hole], question.width, question.height)}</div><p class="stage-note">展开后是什么样?</p><div class="answer-options">${question.choices.map((choice, index) => `<button class="answer-button" data-index="${index}" aria-label="选项 ${index + 1}">${figure(choice)}</button>`).join('')}</div>`;
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

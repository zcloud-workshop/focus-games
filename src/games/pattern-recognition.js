import { shuffle } from '../core.js';
import { bindBoardButtons, trackInputs } from '../engines/board-input.js';

export const definition = {
  id: 'pattern-recognition',
  modes: [{
    id: 'sequence', name: '数字规律', ruleVersion: 2,
    presets: [
      { id: 'easy', name: '初级', settings: { difficulty: 0, rounds: 10 } },
      { id: 'medium', name: '中级', settings: { difficulty: 1, rounds: 10 } },
      { id: 'hard', name: '高级', settings: { difficulty: 2, rounds: 10 } },
    ],
    fields: [{ key: 'rounds', label: '题数', type: 'number', default: 10, min: 5, max: 30, step: 1 }],
    score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate',
    inputs: ['pointer', 'touch', 'keyboard', 'mixed'], rule: '观察数字序列, 选择符合规律的下一项.'
  }]
};

export function patternQuestion(difficulty, random = Math.random) {
  const start = 1 + Math.floor(random() * 5);
  let series;
  let rule;
  if (difficulty === 0) {
    const step = 2 + Math.floor(random() * 5);
    series = Array.from({ length: 6 }, (_, index) => start + step * index);
    rule = `每次增加 ${step}`;
  } else if (difficulty === 1) {
    const step = 1 + Math.floor(random() * 3);
    series = Array.from({ length: 6 }, (_, index) => start + step * index * index);
    rule = `相邻差依次增加 ${step * 2}`;
  } else {
    series = [start, start + 1 + Math.floor(random() * 4)];
    while (series.length < 6) series.push(series.at(-1) + series.at(-2));
    rule = '每一项是前两项之和';
  }
  const answer = series.pop();
  const options = shuffle([answer, answer - 1, answer + 1, answer + 2], random);
  return { series, answer, options, rule };
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const started = clock.performance.now();
  let round = 0;
  let correct = 0;
  let question;
  let feedback = '';
  let active = true;
  const inputs = trackInputs();
  const cleanup = () => { active = false; controller.abort(); };
  const draw = () => {
    question = patternQuestion(settings.difficulty, random);
    root.innerHTML = `<div class="game-status"><span>第 ${round + 1} / ${settings.rounds} 题</span><span>答对 ${correct} 题</span></div><p class="stage-note">${feedback}</p><div class="stimulus" style="font-size:clamp(22px,5vw,34px);letter-spacing:0">${question.series.join(' , ')} , ?</div><div class="answer-options">${question.options.map((value) => `<button class="answer-button" data-value="${value}">${value}</button>`).join('')}</div>`;
  };
  bindBoardButtons(root, 'button[data-value]', (button, input, at) => {
    if (!active) return;
    inputs.add(input);
    const hit = Number(button.dataset.value) === question.answer;
    if (hit) correct++;
    feedback = `${hit ? '上一题正确' : `上一题答案 ${question.answer}`} : ${question.rule}`;
    round++;
    if (round < settings.rounds) { draw(); return; }
    const duration = Math.max(0, at - started) / 1000;
    cleanup();
    onFinish({ value: Math.round(correct / round * 100), detail: `${round} 题中答对 ${correct} 题`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputs.value, endReason: 'complete', scored: true, metrics: { correct, rounds: round }, trials: [] });
  }, controller.signal, () => clock.performance.now());
  draw();
  return cleanup;
}

import { createRuntime, inputMethod, inputTime, trackInputs } from './runtime.js';
import { presentOnFrame } from './trials.js';
import { shuffle } from '../core.js';

const colors = [{ name: '红', css: '#c44343' }, { name: '蓝', css: '#3275bf' }, { name: '绿', css: '#27805e' }, { name: '紫', css: '#8d53b1' }, { name: '橙', css: '#b86b14' }, { name: '黑', css: '#333333' }];
const sixColors = [colors[0], colors[1], colors[2], { name: '黄', css: '#bd8b00' }, colors[3], { name: '粉', css: '#c83c87' }];
const pick = (items, random) => items[Math.floor(random() * items.length)];
export const choiceFields = {
  count: { key: 'count', label: '题数', type: 'number', default: 30, min: 10, max: 100, step: 1 },
  window: { key: 'window', label: '响应窗', type: 'number', default: 2000, min: 300, max: 10000, step: 100, unit: '毫秒' },
  colors: { key: 'colors', label: '颜色数', type: 'number', default: 3, min: 3, max: 6, step: 1 },
  arrows: { key: 'arrows', label: '箭头数', type: 'select', default: 5, options: [3, 5, 7].map((value) => ({ value, label: String(value) })) },
  conflictRate: { key: 'conflictRate', label: '冲突比例', type: 'number', default: 50, min: 0, max: 100, step: 5, unit: '%' },
  validRate: { key: 'validRate', label: '有效线索', type: 'number', default: 80, min: 10, max: 90, step: 5, unit: '%' },
};

export function choiceTrial(kind, settings, random = Math.random, index = 0, previousRule, target) {
  const direction = target?.direction ?? (random() < 0.5 ? 0 : 1);
  const conflict = random() < (kind === 'posner-cue' ? 1 - (settings.validRate ?? 80) / 100 : kind === 'stroop' ? 1 - (settings.congruentRate ?? 50) / 100 : kind === 'flanker' ? (settings.conflictRate ?? 50) / 100 : 0.5);
  if (kind === 'flanker') {
    const group = target?.group ?? (settings.neutral && random() < 1 / 3 ? 'neutral' : conflict ? 'conflict' : 'congruent');
    const center = direction ? '→' : '←';
    const side = group === 'neutral' ? '―' : group === 'conflict' ? (direction ? '←' : '→') : center;
    const half = Math.floor((settings.arrows ?? 5) / 2);
    return { stimulus: `${side.repeat(half)}${center}${side.repeat(half)}`, options: ['←', '→'], answer: direction, group };
  }
  if (kind === 'simon') {
    const position = conflict ? 1 - direction : direction;
    return { stimulus: `<span style="display:inline-block;width:45%;text-align:${position ? 'right' : 'left'};color:${direction ? '#3275bf' : '#c44343'}">●</span>`, options: ['红 / 左', '蓝 / 右'], answer: direction, group: conflict ? 'conflict' : 'congruent' };
  }
  if (kind === 'posner-cue') {
    const cue = conflict ? 1 - direction : direction;
    return { cue: cue ? '→' : '←', stimulus: direction ? '□　●' : '●　□', options: ['←', '→'], answer: direction, group: conflict ? 'invalid' : 'valid' };
  }
  if (kind === 'task-switching') {
    const rule = settings.order === 'alternate' ? index % 2 : previousRule === undefined ? Math.floor(random() * 2) : random() < (settings.switchRate ?? 50) / 100 ? 1 - Number(previousRule) : Number(previousRule);
    const shape = random() < 0.5 ? 0 : 1;
    return { stimulus: `<span style="color:${direction ? '#3275bf' : '#c44343'}">${shape ? '▲' : '●'}</span>`, hint: rule ? '判断形状' : '判断颜色', options: rule ? ['圆', '三角'] : ['红', '蓝'], answer: rule ? shape : direction, group: String(rule) };
  }
  if (kind === 'stroop') {
    const palette = (settings.palette === 'six' ? sixColors : colors).slice(0, settings.colors ?? 3);
    const ink = Math.floor(random() * palette.length);
    const word = settings.independentColors ? Math.floor(random() * palette.length) : conflict ? pick(palette.map((_, i) => i).filter((i) => i !== ink), random) : ink;
    const variant = settings.variant ?? 'ink';
    const answer = variant === 'word' ? word : ink;
    if (variant === 'match') return { stimulus: `<span style="color:${palette[ink].css}">${palette[word].name}</span>`, hint: '字义与颜色相同吗?', options: ['不同', '相同'], answer: Number(ink === word), group: ink === word ? 'congruent' : 'conflict' };
    if (variant === 'two-lines') return { stimulus: `<span>${palette[word].name}</span><br><span style="color:${palette[ink].css}">■</span>`, hint: '上方字义与下方颜色相同吗?', options: ['不同', '相同'], answer: Number(ink === word), group: conflict ? 'conflict' : 'congruent' };
    return { stimulus: `<span style="color:${palette[ink].css}">${palette[word].name}</span>`, hint: variant === 'word' ? '选择字义' : '选择文字的颜色', options: palette.map((color) => `${color.name}色`), answer, group: ink === word ? 'congruent' : 'conflict' };
  }
  if (kind === 'number-comparison') {
    const a = Math.floor(random() * 90) + 10;
    const difference = (settings.level ?? 1) > 1 ? 1 : 2;
    const candidates = Array.from({ length: 90 }, (_, i) => i + 10).filter((value) => Math.abs(value - a) >= difference);
    const b = pick(candidates, random);
    return { stimulus: '选择较大的数字', options: [String(a), String(b)], answer: a > b ? 0 : 1, group: 'comparison' };
  }
  const limit = settings.variant === 'two-digit' ? 90 : 9;
  const a = Math.floor(random() * limit) + 1;
  const b = Math.floor(random() * 9) + 1;
  const operator = settings.variant === 'multiply' ? pick(['×', '÷'], random) : pick(['+', '−'], random);
  const left = operator === '÷' ? a * b : a;
  const result = operator === '÷' ? a : operator === '×' ? a * b : operator === '+' ? a + b : a - b;
  const options = shuffle([result, result + 1, result - 1, result + 2], random);
  return { stimulus: `${left} ${operator} ${b}`, options: options.map(String), answer: options.indexOf(result), group: operator };
}

export function flankerSchedule(random = Math.random) {
  const balanced = (group, count) => Array.from({ length: count }, (_, i) => ({ group, direction: i % 2 }));
  return [...shuffle([...balanced('congruent', 2), ...balanced('conflict', 2)], random), ...shuffle([...balanced('congruent', 16), ...balanced('conflict', 16), ...balanced('neutral', 8)], random)];
}

export function numberChallenge(level, attempts, correct) {
  const targetAttempts = 25 + (level - 1) * 3;
  const targetAccuracy = level === 1 ? 90 : Math.round((targetAttempts - 2) / targetAttempts * 100);
  const accuracy = attempts ? correct / attempts * 100 : 0;
  return { level, targetAttempts, targetAccuracy, accuracy, achieved: attempts >= targetAttempts && accuracy >= targetAccuracy };
}

export function choiceMetrics(trials) {
  const groups = {};
  for (const trial of trials) {
    const group = groups[trial.group] ??= { total: 0, correct: 0, responseMs: [] };
    group.total++;
    if (trial.correct) { group.correct++; if (trial.responseMs !== null) group.responseMs.push(trial.responseMs); }
  }
  const mean = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  for (const group of Object.values(groups)) { group.meanMs = mean(group.responseMs); delete group.responseMs; }
  const correctTimes = trials.filter((trial) => trial.correct && trial.responseMs !== null).map((trial) => trial.responseMs);
  return { correct: trials.filter((trial) => trial.correct).length, errors: trials.filter((trial) => !trial.correct).length, meanMs: mean(correctTimes), groups };
}

export function mountChoices({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis, kind }) {
  const runtime = createRuntime({ onFinish, clock });
  const values = { ...preset.settings, ...settings };
  const trials = [];
  const schedule = values.balancedFlanker ? flankerSchedule(random) : null;
  const inputs = trackInputs();
  const start = runtime.now();
  const deadline = values.duration ? start + values.duration * 1000 : Infinity;
  let shownAt;
  let timer;
  let current;
  let accepting = false;
  let previousGroup;
  let practiceConfirmed = false;
  const finish = () => {
    accepting = false;
    const scoredTrials = trials.filter((trial) => !trial.practice);
    const metrics = choiceMetrics(scoredTrials);
    const groupPair = kind === 'posner-cue' ? ['invalid', 'valid'] : kind === 'task-switching' ? ['switch', 'repeat'] : ['conflict', 'congruent'];
    const [first, second] = groupPair.map((key) => metrics.groups[key]?.meanMs);
    metrics.effectMs = Number.isFinite(first) && Number.isFinite(second) ? first - second : null;
    const challenge = kind === 'number-comparison' ? numberChallenge(values.level ?? 1, scoredTrials.length, metrics.correct) : null;
    if (challenge) Object.assign(metrics, challenge, { challenge: challenge.achieved ? '达标' : '未达标' });
    const score = kind === 'number-comparison' ? metrics.correct : kind === 'posner-cue' ? metrics.meanMs : values.penalty ? (metrics.meanMs === null ? null : Math.round(metrics.meanMs + metrics.errors * values.penalty) / 1000) : scoredTrials.length ? Math.round(metrics.correct / scoredTrials.length * 100) : null;
    const accuracy = scoredTrials.length ? metrics.correct / scoredTrials.length : 0;
    const unlocks = challenge?.achieved ? [`number-comparison|level|${challenge.level + 1}`] : kind === 'stroop' && mode.id === 'ink' && preset.id === '3' && accuracy >= 0.85 ? ['stroop|ink|4'] : kind === 'stroop' && mode.id === 'ink' && preset.id === '4' && accuracy >= 0.9 ? ['stroop|ink|5', 'stroop|ink|reverse'] : [];
    runtime.finish({ value: score, detail: `${scoredTrials.length} 题中答对 ${metrics.correct} 题`, mode: mode.id, preset: preset.id, settings: values, rules: mode.ruleVersion, input: inputs.value, endReason: values.duration ? 'timeout' : 'completed', scored: score !== null, metrics, trials, unlocks });
  };
  const advance = () => {
    if (runtime.now() >= deadline || (values.count && trials.length >= values.count + (values.practice ?? 0))) { finish(); return; }
    if (values.practice && trials.length === values.practice && !practiceConfirmed) {
      accepting = false;
      root.innerHTML = '<div class="empty-state"><p>练习完成, 接下来开始正式测试.</p><button class="button primary" data-continue>开始测试</button></div>';
      return;
    }
    accepting = false;
    current = choiceTrial(kind, values, random, trials.length, previousGroup, schedule?.[trials.length]);
    if (kind === 'task-switching') { current.rule = current.group; current.group = previousGroup === undefined ? 'first' : previousGroup === current.rule ? 'repeat' : 'switch'; previousGroup = current.rule; }
    const show = () => presentOnFrame(runtime, () => {
      root.innerHTML = `<div class="game-status"><span>${trials.length < (values.practice ?? 0) ? `练习 ${trials.length + 1} / ${values.practice}` : values.duration ? `剩余 ${Math.max(0, Math.ceil((deadline - runtime.now()) / 1000))} 秒` : `第 ${trials.length + 1 - (values.practice ?? 0)} / ${values.count} 题`}</span><span>${current.hint ?? ''}</span></div><div class="stimulus">${current.stimulus}</div><div class="answer-options">${current.options.map((item, i) => `<button class="answer-button" data-choice="${i}">${item}</button>`).join('')}</div><p class="stage-note">点击选项或按对应数字键</p>`;
    }, (at) => {
      shownAt = at; accepting = true;
      if (values.window) timer = runtime.later(() => record(null, runtime.now(), 'any'), values.window);
    });
    if (current.cue) {
      root.innerHTML = `<div class="stimulus fixation">${current.cue}</div>`;
      runtime.later(show, 300);
    } else if (values.fixation) {
      root.innerHTML = '<div class="stimulus fixation">+</div>';
      runtime.later(show, values.fixation);
    } else show();
  };
  const record = (answer, at, input) => {
    if (!accepting) return;
    if (at >= deadline) { finish(); return; }
    accepting = false;
    runtime.cancel(timer);
    if (input !== 'any') inputs.add(input);
    const correct = answer === current.answer;
    trials.push({ group: current.group, correct, responseMs: answer === null ? null : Math.max(0, at - shownAt), answer, target: current.answer, practice: trials.length < (values.practice ?? 0) });
    if (values.feedback) {
      root.innerHTML = `<div class="stimulus">${answer === null ? '未响应' : correct ? '正确' : '错误'}</div>`;
      runtime.later(advance, values.feedback);
    } else advance();
  };
  runtime.listen(root, 'click', (event) => {
    if (!event.target.closest('[data-continue]')) return;
    practiceConfirmed = true;
    root.innerHTML = '<div class="stimulus">准备</div>';
    runtime.later(advance, values.initialDelay ?? 0);
  });
  runtime.listen(root, 'pointerdown', (event) => {
    const button = event.target.closest('[data-choice]');
    if (!button || event.button !== 0) return;
    event.preventDefault(); record(Number(button.dataset.choice), inputTime(event, runtime.now), inputMethod(event));
  });
  runtime.listen(document, 'keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const index = ({ ArrowLeft: 0, KeyF: 0, KeyA: 0, ArrowRight: 1, KeyJ: 1, KeyD: 1 })[event.code] ?? (event.code.startsWith('Digit') ? Number(event.code.slice(5)) - 1 : -1);
    if (index < 0 || !current || index >= current.options.length) return;
    event.preventDefault(); record(index, inputTime(event, runtime.now), inputMethod(event));
  });
  if (values.duration) runtime.later(finish, values.duration * 1000);
  if (values.initialDelay) { root.innerHTML = '<div class="stimulus">准备</div>'; runtime.later(advance, values.initialDelay); }
  else advance();
  return runtime.cleanup;
}

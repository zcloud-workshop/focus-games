const masks = [63, 6, 91, 79, 102, 109, 125, 7, 127, 111];
const grades = [[1, 1, 1], [1, 1, 2], [2, 1, 2], [2, 2, 2], [2, 2, 3], [3, 3, 3]];
const fallback = [[3, 4, '+', 7], [5, 6, '+', 11], [12, 3, '+', 15], [12, 23, '+', 35], [45, 67, '+', 112], [345, 267, '+', 612]];

export const definition = {
  id: 'matchstick-math',
  modes: [{
    id: 'timed', name: '火柴算式', ruleVersion: 2,
    presets: grades.map((_, index) => ({ id: `grade-${index + 1}`, name: `${index + 1} 年级`, settings: { grade: index + 1 } })),
    score: { unit: '关', lower: false, min: 0 }, hiddenPolicy: 'invalidate',
    inputs: ['pointer', 'touch', 'keyboard', 'mixed'], rule: '移动恰好一根线段, 使算式成立. 可改变数字和加减号.'
  }]
};

function encode(a, b, operator, c) {
  return [...String(a)].map((digit) => ({ kind: 'digit', mask: masks[Number(digit)] }))
    .concat([{ kind: 'operator', mask: operator === '+' ? 3 : 1 }], [...String(b)].map((digit) => ({ kind: 'digit', mask: masks[Number(digit)] })), [{ kind: 'equals', mask: 0 }], [...String(c)].map((digit) => ({ kind: 'digit', mask: masks[Number(digit)] })));
}

export function readEquation(tokens) {
  const operator = tokens.findIndex((token) => token.kind === 'operator');
  const equals = tokens.findIndex((token) => token.kind === 'equals');
  const read = (part) => {
    const digits = part.map((token) => masks.indexOf(token.mask));
    if (digits.includes(-1) || (digits.length > 1 && digits[0] === 0)) return null;
    return Number(digits.join(''));
  };
  const a = read(tokens.slice(0, operator));
  const b = read(tokens.slice(operator + 1, equals));
  const c = read(tokens.slice(equals + 1));
  const sign = tokens[operator].mask === 3 ? '+' : tokens[operator].mask === 1 ? '-' : null;
  if (a === null || b === null || c === null || !sign) return null;
  return { a, b, c, sign, valid: sign === '+' ? a + b === c : a - b === c };
}

export function moveMatch(tokens, from, to) {
  if (from.index === to.index && from.segment === to.segment) return null;
  const first = tokens[from.index];
  const second = tokens[to.index];
  if (!first || !second || first.kind === 'equals' || second.kind === 'equals') return null;
  if (!(first.mask & (1 << from.segment)) || (second.mask & (1 << to.segment))) return null;
  const result = tokens.map((token) => ({ ...token }));
  result[from.index].mask &= ~(1 << from.segment);
  result[to.index].mask |= 1 << to.segment;
  return readEquation(result) ? result : null;
}

export function matchNeighbors(tokens) {
  const found = new Map();
  for (let from = 0; from < tokens.length; from++) {
    const fromCount = tokens[from].kind === 'digit' ? 7 : tokens[from].kind === 'operator' ? 2 : 0;
    for (let a = 0; a < fromCount; a++) for (let to = 0; to < tokens.length; to++) {
      const toCount = tokens[to].kind === 'digit' ? 7 : tokens[to].kind === 'operator' ? 2 : 0;
      for (let b = 0; b < toCount; b++) {
        const result = moveMatch(tokens, { index: from, segment: a }, { index: to, segment: b });
        if (result) found.set(result.map((token) => token.mask).join(','), result);
      }
    }
  }
  return [...found.values()];
}

export function matchQuestion(grade, random = Math.random) {
  const [aDigits, bDigits, cDigits] = grades[grade - 1];
  const value = (digits) => {
    const min = 10 ** (digits - 1);
    return min + Math.floor(random() * (9 * min));
  };
  for (let attempt = 0; attempt < 200; attempt++) {
    let valid;
    for (let inner = 0; inner < 100; inner++) {
      const a = value(aDigits);
      const b = value(bDigits);
      const sign = random() < 0.5 ? '+' : '-';
      const c = sign === '+' ? a + b : a - b;
      if (c >= 0 && String(c).length === cDigits) { valid = encode(a, b, sign, c); break; }
    }
    if (!valid) valid = encode(...fallback[grade - 1]);
    // 少数算式 (如 4+4=8) 的每个可读移动邻居都合法, 没有可出题的无效形态, 换一题.
    const wrong = matchNeighbors(valid).filter((tokens) => !readEquation(tokens).valid);
    if (!wrong.length) continue;
    const question = wrong[Math.floor(random() * wrong.length)];
    const solutions = matchNeighbors(question).filter((tokens) => readEquation(tokens).valid);
    return { tokens: question, solutions };
  }
  throw new Error('未能生成火柴算式.');
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const started = clock.performance.now();
  const deadline = started + 180000;
  const segmentStyles = ['left:20%;top:0;width:60%;height:10%', 'right:0;top:8%;width:12%;height:38%', 'right:0;bottom:8%;width:12%;height:38%', 'left:20%;bottom:0;width:60%;height:10%', 'left:0;bottom:8%;width:12%;height:38%', 'left:0;top:8%;width:12%;height:38%', 'left:20%;top:45%;width:60%;height:10%'];
  let question;
  let selected = null;
  let completed = 0;
  let mistakes = 0;
  let message = '';
  let timer;
  let active = true;
  const inputs = trackInputs();
  const cleanup = () => { active = false; controller.abort(); clock.clearTimeout(timer); };
  const draw = () => {
    const tokens = question.tokens.map((token, index) => {
      if (token.kind === 'equals') return '<span style="font-size:28px;align-self:center">=</span>';
      const count = token.kind === 'digit' ? 7 : 2;
      const styles = token.kind === 'digit' ? segmentStyles : ['left:10%;top:45%;width:80%;height:10%', 'left:45%;top:10%;width:10%;height:80%'];
      return `<span style="position:relative;display:inline-block;width:clamp(25px,7vw,42px);height:70px">${Array.from({ length: count }, (_, segment) => {
        const lit = Boolean(token.mask & (1 << segment));
        const chosen = selected?.index === index && selected.segment === segment;
        return `<button data-index="${index}" data-segment="${segment}" aria-label="第 ${index + 1} 位第 ${segment + 1} 段${lit ? '已放置' : '空位'}" style="position:absolute;${styles[segment]};min-width:0;padding:0;border:${lit ? '0' : '1px dashed #aaa'};background:${chosen ? '#3275bf' : lit ? '#6d4936' : 'transparent'}"></button>`;
      }).join('')}</span>`;
    }).join('');
    root.innerHTML = `<div class="game-status"><span>完成 ${completed} 关</span><span data-time></span></div><p class="stage-note">${message || '选择一根线段, 再选择空位'}</p><div style="display:flex;justify-content:center;gap:4px;overflow-x:auto;padding:16px 0">${tokens}</div><div class="answer-options"><button class="answer-button" data-reset>取消选择</button></div>`;
    root.querySelector('[data-time]').textContent = `${Math.max(0, Math.ceil((deadline - clock.performance.now()) / 1000))} 秒`;
  };
  const next = () => { question = matchQuestion(settings.grade, random); selected = null; draw(); };
  const tick = () => {
    if (!active) return;
    const remaining = Math.max(0, deadline - clock.performance.now());
    root.querySelector('[data-time]').textContent = `${Math.ceil(remaining / 1000)} 秒`;
    if (!remaining) {
      const duration = (clock.performance.now() - started) / 1000;
      cleanup();
      onFinish({ value: completed, detail: `完成 ${completed} 关, 尝试错误 ${mistakes} 次`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputs.value, endReason: 'timeout', scored: true, metrics: { completed, mistakes }, trials: [] });
    } else timer = clock.setTimeout(tick, Math.min(100, remaining));
  };
  bindBoardButtons(root, 'button[data-segment], button[data-reset]', (button, input, at) => {
    if (!active || at >= deadline) return;
    inputs.add(input);
    if ('reset' in button.dataset) { selected = null; message = ''; draw(); return; }
    const position = { index: Number(button.dataset.index), segment: Number(button.dataset.segment) };
    const lit = question.tokens[position.index].mask & (1 << position.segment);
    if (lit) { selected = position; message = '选择放置线段的空位'; draw(); return; }
    if (!selected) return;
    const result = moveMatch(question.tokens, selected, position);
    if (result && readEquation(result).valid) { completed++; message = '正确'; next(); }
    else { selected = null; mistakes++; message = '算式未成立, 请重试'; draw(); }
  }, controller.signal, () => clock.performance.now());
  next();
  tick();
  return cleanup;
}
import { bindBoardButtons, trackInputs } from '../engines/board-input.js';


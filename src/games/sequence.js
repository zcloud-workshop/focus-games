import { createInputTracker } from '../engines/input.js';
import { createRuntime } from '../engines/runtime.js';
import { presentOnFrame } from '../engines/trials.js';
import { uniquePositions } from '../engines/sequence.js';

const score = { unit: '个', lower: false, min: 0 };
const mode = (id, name, presets, extra = {}) => ({ id, name, ruleVersion: 2, presets, score, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard', 'touch'], rule: '观察位置出现的顺序, 然后按要求复现. 每轮增加一步.', ...extra });
export const definition = { id: 'sequence', modes: [
  mode('grid', '方格序列', [{ id: 'slow', name: '3 × 3 慢速', settings: { size: 3, speed: 600, start: 1 } }, { id: 'fast', name: '3 × 3 快速', settings: { size: 3, speed: 350, start: 1 }, unlock: { requires: ['sequence:medium'] } }, { id: 'large', name: '4 × 4', settings: { size: 4, speed: 350, start: 1 }, unlock: { requires: ['sequence:hard'] } }, { id: 'custom', name: '自定义', settings: { size: 3, speed: 600, start: 1 }, unlock: { requires: ['sequence:medium'] }, fields: [{ key: 'size', label: '网格边长', type: 'number', min: 3, max: 3, step: 1, maxByUnlock: [{ key: 'sequence:hard', max: 5 }] }, { key: 'speed', label: '显示时长', type: 'number', min: 600, max: 800, step: 50, unit: '毫秒', minByUnlock: [{ key: 'sequence:medium', min: 350 }, { key: 'sequence:hard', min: 200 }] }] }], { ruleVersion: 3 }),
  mode('buttons', '按钮序列', [{ id: 'standard', name: '标准', settings: { size: 3, speed: 500, start: 1 } }]),
  mode('forward', '正序挑战', [{ id: 'standard', name: '3 步起', settings: { size: 3, speed: 800, start: 3 } }], { ruleVersion: 3 }),
  mode('backward', '倒序挑战', [{ id: 'standard', name: '3 步起', settings: { size: 3, speed: 800, start: 3 } }], { ruleVersion: 3, rule: '观察位置亮起的顺序, 按倒序复现.' }),
  mode('practice', '正序练习', [{ id: 'standard', name: '练习', settings: { size: 3, speed: 800, start: 3 } }], { ruleVersion: 3, scored: false, fields: [{ key: 'start', label: '起始长度', type: 'number', default: 3, min: 1, max: 20, step: 1 }] }),
  mode('backward-practice', '倒序练习', [{ id: 'standard', name: '练习', settings: { size: 3, speed: 800, start: 3 } }], { ruleVersion: 3, scored: false, fields: [{ key: 'start', label: '起始长度', type: 'number', default: 3, min: 1, max: 20, step: 1 }], rule: '观察位置亮起的顺序, 按倒序复现.' }),
  mode('path', '跳跃路径', [{ id: 'standard', name: '路径', settings: { startLevel: 1 } }], { ruleVersion: 3, fields: [{ key: 'startLevel', label: '起始关卡', type: 'number', default: 1, min: 1, max: 20, step: 1 }], score: { unit: '分', lower: false, min: 0 }, rule: '观察起点和跳跃路径, 再依次点击落点. 答对累计分数, 答错可重试或结束.' }),
] };

export function extendSequence(sequence, size, random = Math.random) { return [...sequence, Math.floor(random() * size * size)]; }
export function makeChallengeSequence(length, random = Math.random) {
  const values = [];
  for (let index = 0; index < length; index++) {
    const choices = Array.from({ length: 9 }, (_, value) => value).filter((value) => value !== values.at(-1));
    values.push(choices[Math.floor(random() * choices.length)]);
  }
  return values;
}
export function answerSequence(sequence, reverse) { return reverse ? [...sequence].reverse() : [...sequence]; }

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  if (mode.id === 'path') return mountPath({ root, mode, preset, settings, onFinish, random, clock });
  const runtime = createRuntime({ onFinish, clock });
  const inputKind = createInputTracker(runtime, root);
  const grid = mode.id === 'grid';
  const challenge = ['forward', 'backward', 'practice', 'backward-practice'].includes(mode.id);
  let sequence = challenge ? makeChallengeSequence(settings.start, random) : [];
  if (!challenge) for (let i = 0; i < settings.start; i++) sequence = extendSequence(sequence, settings.size, random);
  let phase = 'show', position = 0, completed = 0, roundTrial;
  const trials = [];
  const reverse = mode.id.startsWith('backward');
  const show = () => {
    phase = 'show';
    roundTrial = { sequence: [...sequence], cues: [], responses: [] };
    trials.push(roundTrial);
    root.innerHTML = `<div class="game-status"><span>序列长度 ${sequence.length}</span><span data-hint>观察顺序</span></div><div style="position:relative"><div class="play-grid sequence-grid" style="--columns:${settings.size}">${Array.from({ length: settings.size ** 2 }, (_, i) => `<button class="play-cell" type="button" data-cell="${i}" aria-label="位置 ${i + 1}"${mode.id === 'path' ? ' style="border-radius:50%"' : ''}></button>`).join('')}</div>${mode.id === 'path' ? '<span data-marker aria-hidden="true" style="position:absolute;pointer-events:none;transform:translate(-50%,-50%);font-size:2rem">●</span>' : ''}</div>`;
    const cells = [...root.querySelectorAll('[data-cell]')];
    let cursor = 0;
    let previous = Math.floor(settings.size ** 2 / 2);
    const marker = root.querySelector('[data-marker]');
    const place = (index) => [((index % settings.size) + 0.5) * 100 / settings.size, (Math.floor(index / settings.size) + 0.5) * 100 / settings.size];
    if (marker) { const [x, y] = place(previous); marker.style.left = `${x}%`; marker.style.top = `${y}%`; }
    const next = () => {
      if (cursor === sequence.length) {
        phase = 'answer'; position = 0;
        if (marker) marker.remove();
        root.querySelector('[data-hint]').textContent = reverse ? '按倒序点击' : '按顺序点击';
        return;
      }
      const target = sequence[cursor++];
      const cell = cells[target];
      presentOnFrame(runtime, () => cell.classList.add('lit'), (shownAt) => {
        const clear = () => presentOnFrame(runtime, () => cell.classList.remove('lit'), (hiddenAt) => {
          roundTrial.cues.push({ target, presentedAt: shownAt, durationMs: hiddenAt - shownAt });
          runtime.later(next, challenge || grid ? 200 : 250);
        });
        if (!marker) { runtime.later(clear, settings.speed); return; }
        const [fromX, fromY] = place(previous);
        const [toX, toY] = place(target);
        const duration = Math.min(settings.speed, 350);
        const move = (time) => {
          const progress = Math.min(1, Math.max(0, (time - shownAt) / duration));
          marker.style.left = `${fromX + (toX - fromX) * progress}%`;
          marker.style.top = `${fromY + (toY - fromY) * progress}%`;
          if (progress < 1) runtime.frame(move);
          else { previous = target; runtime.later(clear, settings.speed - duration); }
        };
        runtime.frame(move);
      });
    };
    runtime.later(next, challenge ? 2000 : 500);
  };
  runtime.listen(root, 'click', (event) => {
    const cell = event.target.closest('[data-cell]');
    if (!cell || phase !== 'answer') return;
    const expected = answerSequence(sequence, reverse);
    roundTrial.responses.push(Number(cell.dataset.cell));
    if (Number(cell.dataset.cell) !== expected[position]) {
      phase = 'finished';
      roundTrial.correct = false;
      runtime.finish({ value: completed, detail: `最长完整序列 ${completed} 步`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputKind(), endReason: 'mistake', scored: mode.scored !== false, rankEligible: ['forward', 'backward'].includes(mode.id) && completed >= 3, metrics: { completed }, trials, unlocks: grid ? [...(preset.id === 'slow' && completed >= 6 ? ['sequence:medium'] : []), ...(preset.id === 'fast' && completed >= 5 ? ['sequence:hard'] : [])] : [] });
      return;
    }
    cell.classList.add('correct');
    runtime.later(() => cell.classList.remove('correct'), 200);
    position++;
    if (position === sequence.length) { roundTrial.correct = true; completed = sequence.length; phase = 'waiting'; sequence = challenge ? makeChallengeSequence(sequence.length + 1, random) : grid ? Array.from({ length: sequence.length + 1 }, () => Math.floor(random() * settings.size ** 2)) : extendSequence(sequence, settings.size, random); runtime.later(show, grid ? 800 : 500); }
  });
  show();
  return runtime.cleanup;
}

export function pathLevel(level) { return { pads: Math.min(4 + Math.floor((level - 1) / 2), 10), jumps: Math.min(level + 1, 9) }; }
export function pathPoints(level, milliseconds) { return 100 + level * 20 + (milliseconds < 5000 ? 50 : milliseconds < 10000 ? 25 : 0); }
export function makeLeapRoute(pads, jumps, random = Math.random) {
  const route = [pads[Math.floor(random() * pads.length)]];
  for (let i = 0; i < jumps; i++) {
    const choices = pads.filter((pad) => pad !== route.at(-1));
    route.push(choices[Math.floor(random() * choices.length)]);
  }
  return route;
}
function jumpDuration(from, to) {
  const distance = Math.hypot((from % 4 - to % 4) * 25, (Math.floor(from / 4) - Math.floor(to / 4)) * 25);
  return Math.round(400 + Math.min(1, Math.max(0, (distance - 10) / 70)) * 800);
}
function mountPath({ root, mode, preset, settings, onFinish, random, clock }) {
  const runtime = createRuntime({ onFinish, clock });
  const inputKind = createInputTracker(runtime, root);
  let level = settings.startLevel, points = 0, longest = 0, phase = 'show', pads, route, trial, position, responseAt;
  const trials = [];
  const place = (index) => [((index % 4) + 0.5) * 25, (Math.floor(index / 4) + 0.5) * 25];
  const move = (from, to, callback) => {
    const marker = root.querySelector('[data-marker]');
    const [fromX, fromY] = place(from), [toX, toY] = place(to);
    const duration = jumpDuration(from, to);
    presentOnFrame(runtime, () => {}, (start) => {
      const animate = (now) => {
        const fraction = Math.min(1, Math.max(0, (now - start) / duration));
        marker.style.left = `${fromX + (toX - fromX) * fraction}%`;
        marker.style.top = `${fromY + (toY - fromY) * fraction}%`;
        if (fraction < 1) runtime.frame(animate);
        else callback({ from, to, presentedAt: start, durationMs: now - start });
      };
      runtime.frame(animate);
    });
  };
  const finish = () => runtime.finish({ value: points, detail: `累计 ${points} 分, 最长路径 ${longest} 步`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputKind(), endReason: 'mistake', scored: true, metrics: { longest, level }, trials });
  const show = () => {
    const params = pathLevel(level);
    pads = uniquePositions(4, params.pads, random);
    route = makeLeapRoute(pads, params.jumps, random);
    trial = { level, pads, route, jumps: [], responses: [] }; trials.push(trial);
    phase = 'show'; position = 1;
    const [x, y] = place(route[0]);
    presentOnFrame(runtime, () => {
      root.innerHTML = `<div class="game-status"><span>第 ${level} 关 · ${points} 分</span><span data-hint>记住起点和跳跃</span></div><div style="position:relative"><div class="play-grid" style="--columns:4">${Array.from({ length: 16 }, (_, index) => pads.includes(index) ? `<button type="button" class="play-cell" style="border-radius:50%" data-pad="${index}" aria-label="位置 ${index + 1}"></button>` : '<div class="play-cell" style="visibility:hidden"></div>').join('')}</div><span data-marker aria-hidden="true" style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);font-size:2rem;pointer-events:none">●</span></div>`;
    }, (shownAt) => {
      trial.presentedAt = shownAt;
      let jump = 1;
      const next = () => {
        if (jump === route.length) {
          runtime.later(() => presentOnFrame(runtime, () => {
            const marker = root.querySelector('[data-marker]'); marker.style.left = `${x}%`; marker.style.top = `${y}%`;
            root.querySelector('[data-hint]').textContent = '按跳跃顺序点击落点';
          }, (timestamp) => { phase = 'answer'; responseAt = timestamp; }), 300);
          return;
        }
        const from = route[jump - 1], to = route[jump++];
        move(from, to, (timing) => { trial.jumps.push(timing); runtime.later(next, 200); });
      };
      runtime.later(next, 2000);
    });
  };
  const answer = (cell, event) => {
    if (phase !== 'answer') return;
    const target = Number(cell.dataset.pad);
    trial.responses.push(target);
    if (target !== route[position]) {
      phase = 'failure'; trial.correct = false;
      root.querySelector('[data-hint]').textContent = '未匹配, 可重试本关或结束.';
      root.insertAdjacentHTML('beforeend', '<div class="answer-options"><button type="button" class="answer-button" data-retry>重试本关</button><button type="button" class="answer-button" data-end>结束并记录</button></div>');
      return;
    }
    const enteredAt = Number.isFinite(event.timeStamp) ? event.timeStamp : runtime.now();
    phase = 'moving';
    const from = route[position - 1];
    position++;
    move(from, target, () => {
      if (position < route.length) { phase = 'answer'; return; }
      const earned = pathPoints(level, enteredAt - responseAt);
      trial.correct = true; trial.points = earned; points += earned; longest = Math.max(longest, route.length - 1);
      root.querySelector('[data-hint]').textContent = `正确, 获得 ${earned} 分`;
      phase = 'waiting'; level++; runtime.later(show, 2200);
    });
  };
  runtime.listen(root, 'pointerdown', (event) => { const cell = event.target.closest('[data-pad]'); if (cell) answer(cell, event); });
  runtime.listen(root, 'click', (event) => {
    const cell = event.target.closest('[data-pad]');
    if (cell && event.detail === 0) answer(cell, event);
    if (phase === 'failure' && event.target.closest('[data-retry]')) show();
    else if (phase === 'failure' && event.target.closest('[data-end]')) { phase = 'finished'; finish(); }
  });
  show(); return runtime.cleanup;
}

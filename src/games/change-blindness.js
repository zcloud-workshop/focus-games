import { createRuntime, inputTime, trackInputs } from '../engines/runtime.js';

const mediumKey = 'change-blindness|alternating|medium';
const hardKey = 'change-blindness|alternating|hard';
export const definition = { id: 'change-blindness', modes: [{ id: 'alternating', name: '画面变化', sources: ['A04'], ruleVersion: 3, presets: [
  { id: '4', name: '4 × 4', settings: { size: 4, rounds: 5, level: 'easy' } },
  { id: '5', name: '5 × 5', settings: { size: 5, rounds: 5, level: 'medium' }, unlock: { requires: [mediumKey] } },
  { id: '6', name: '6 × 6', settings: { size: 6, rounds: 5, level: 'hard' }, unlock: { requires: [hardKey] } },
  { id: 'custom', name: '自定义', settings: { size: 4, rounds: 5, level: 'custom' }, unlock: { requires: [mediumKey] }, fields: [
    { key: 'size', label: '网格大小', type: 'number', min: 3, max: 4, step: 1, maxByUnlock: [{ key: mediumKey, max: 5 }, { key: hardKey, max: 6 }] },
    { key: 'rounds', label: '局数', type: 'number', min: 3, max: 5, step: 1, maxByUnlock: [{ key: mediumKey, max: 8 }, { key: hardKey, max: 10 }] },
  ] },
], score: { unit: '局', lower: false, min: 0, max: 10 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], warning: '画面会短暂遮盖.', rule: '先观察画面1.2秒, 遮盖0.3秒后找出变化的一格. 每轮五局, 点错立即结束.' }] };

export function changeScene(size, random = Math.random) {
  const poolSize = size <= 4 ? 8 : 6;
  const base = Array.from({ length: size ** 2 }, () => Math.floor(random() * poolSize));
  const target = Math.floor(random() * base.length);
  const changed = [...base];
  changed[target] = (base[target] + 1 + Math.floor(random() * (poolSize - 1))) % poolSize;
  return { base, changed, target };
}

export function mount({ root, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const inputs = trackInputs();
  const trials = [];
  let round = 0;
  let correct = 0;
  let scene;
  let phase = 'preparing';
  let shownAt;
  let frameStarted;
  const symbols = settings.size <= 4 ? ['○','△','□','◇','＋','×','∥','⊥'] : ['○','●','◉','◎','⊕','⊙'];
  const draw = (values, note) => {
    root.innerHTML = `<div class="game-status"><span>第 ${round + 1} / ${settings.rounds} 局</span><span>${note}</span></div><div class="play-grid change-board" style="--columns:${settings.size}">${values.map((value,i) => `<button type="button" class="play-cell" data-index="${i}" aria-label="位置 ${i + 1}">${value === null ? '' : symbols[value]}</button>`).join('')}</div>`;
  };
  const show = () => {
    scene = changeScene(settings.size,random);
    phase = 'study';
    runtime.frame((at) => {
      frameStarted = at;
      draw(scene.base,'观察第一幅画面');
      runtime.later(() => runtime.frame((blankAt) => {
        phase = 'blank';
        draw(Array(scene.base.length).fill(null),'短暂遮盖');
        runtime.later(() => runtime.frame((at) => {
          phase = 'answer';
          shownAt = at;
          trials.push({ studyMs: blankAt - frameStarted, blankMs: at - blankAt });
          draw(scene.changed,'找出变化的位置');
        }),Math.max(0,blankAt + 300 - runtime.now()));
      }),Math.max(0,at + 1200 - runtime.now()));
    });
  };
  const answer = (button,event) => {
    if (phase !== 'answer') return;
    phase = 'feedback';
    inputs.add(event);
    const success = Number(button.dataset.index) === scene.target;
    Object.assign(trials.at(-1),{ correct: success, responseMs: Math.max(0,inputTime(event,runtime.now) - shownAt), input: inputs.value });
    if (success) correct++;
    button.classList.add(success ? 'correct' : 'incorrect');
    root.querySelector(`[data-index="${scene.target}"]`).classList.add('correct');
    round++;
    runtime.later(() => {
      if (!success || round === settings.rounds) {
        const unlocks = settings.level === 'easy' && correct >= 4 ? [mediumKey] : settings.level === 'medium' && correct >= 4 ? [hardKey] : [];
        runtime.finish({ value: correct, input: inputs.value, detail: `${correct} / ${settings.rounds} 局正确`, endReason: success ? 'completed' : 'incorrect', unlocks, metrics: { 答对局数: correct, 尝试局数: trials.length, 平均作答秒: trials.reduce((sum,t) => sum + t.responseMs,0) / trials.length / 1000 }, trials });
      } else show();
    },success ? 600 : 1500);
  };
  runtime.listen(root,'pointerdown',(event) => { const button = event.target.closest('[data-index]'); if (button && event.button === 0) { event.preventDefault(); answer(button,event); } });
  runtime.listen(root,'keydown',(event) => { if (['Space','Enter'].includes(event.code) && !event.repeat && event.target.matches('[data-index]')) { event.preventDefault(); answer(event.target,event); } });
  let count = 3;
  const prepare = () => {
    if (!count) { show(); return; }
    root.innerHTML = `<div class="stimulus">${count--}</div>`;
    runtime.later(prepare,1000);
  };
  prepare();
  return runtime.cleanup;
}

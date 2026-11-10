import { createRuntime, inputTime, trackInputs } from '../engines/runtime.js';
import { colorPair, rgb } from '../engines/grid.js';

const common = { ruleVersion: 2, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'] };
export const definition = { id: 'color', modes: [
  { ...common, id: 'streak', name: '连续辨色', sources: ['A03'], ruleVersion: 3, presets: [[3,15],[4,8],[5,4]].map(([size, initialDelta]) => ({ id: `${size}`, name: `${size} × ${size}`, settings: { size, initialDelta }, ...(size > 3 ? { unlock: { requires: [size === 4 ? 'color:4' : 'color:5'] } } : {}) })).concat({ id: 'custom', name: '自定义', unlock: { requires: ['color:4'] }, settings: { size: 3, initialDelta: 15 }, fields: [{ key: 'size', label: '网格大小', type: 'number', min: 3, max: 3, maxByUnlock: [{ key: 'color:4', max: 5 }, { key: 'color:5', max: 8 }], step: 1 }, { key: 'initialDelta', label: '初始亮度差', type: 'number', min: 15, minByUnlock: [{ key: 'color:4', min: 8 }, { key: 'color:5', min: 3 }], max: 20, step: 1 }] }), score: { unit: '次', lower: false, min: 0 }, rule: '找出颜色不同的一格, 每次答对亮度差减 1, 最小为 1. 点错结束. 初级连对 5 次解锁中级, 中级连对 8 次解锁高级.' },
  { ...common, id: 'forty', name: '四十关辨色', sources: ['T21'], presets: [{ id: 'standard', name: '9 格 · 40 关', settings: { size: 3, rounds: 40, initialDelta: 30 } }], score: { unit: '关', lower: false, min: 0, max: 40 }, rule: '每关 9 格, 只有一格颜色不同. 共 40 关, 色差逐渐减小, 点错结束. 保留最后成功关卡和当时用时.' },
] };

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const inputs = trackInputs();
  const start = runtime.now();
  let round = 0;
  let target;
  let pair;
  let accepting = false;
  let lastSuccess = 0;
  let lastDelta = null;
  const trials = [];
  const show = () => {
    accepting = false;
    target = Math.floor(random() * settings.size ** 2);
    if (mode.id === 'streak') {
      const hue = Math.floor(random() * 360);
      const delta = Math.max(1, settings.initialDelta - round);
      pair = { base: `hsl(${hue},60%,55%)`, target: `hsl(${hue},60%,${55 + delta}%)`, delta };
    } else pair = colorPair(Math.max(0.7, settings.initialDelta * 0.91 ** round), random);
    runtime.frame((at) => {
      root.innerHTML = `<div class="game-status"><span>${mode.id === 'forty' ? `第 ${round + 1} / 40 关` : `连续答对 ${round} 次`}</span><span>找出不同颜色</span></div><div class="play-grid color-grid" style="--columns:${settings.size}">${Array.from({ length: settings.size ** 2 }, (_, i) => { const color = i === target ? pair.target : pair.base; return `<button type="button" class="play-cell" data-index="${i}" aria-label="方块 ${i + 1}" style="background:${mode.id === 'streak' ? color : rgb(color)}"></button>`; }).join('')}</div>`;
      trials.push({ presentedAt: at, [mode.id === 'streak' ? 'lightnessDifference' : 'deltaE']: pair.delta });
      accepting = true;
    });
  };
  const answer = (button, event, input) => {
    if (!accepting) return;
    inputs.add(input);
    accepting = false;
    const correct = Number(button.dataset.index) === target;
    const at = inputTime(event, runtime.now);
    Object.assign(trials.at(-1), { correct, responseMs: at - trials.at(-1).presentedAt, input });
    if (correct) { round++; lastSuccess = (at - start) / 1000; lastDelta = pair.delta; }
    if (!correct || (mode.id === 'forty' && round === 40)) {
      runtime.later(() => runtime.finish({ value: round, detail: `完成 ${round}${mode.id === 'forty' ? ' 关' : ' 次连续辨色'}`, input: inputs.value, endReason: correct ? 'completed' : 'incorrect', metrics: { 最后成功色差: lastDelta, 最后成功用时秒: lastSuccess }, trials, unlocks: mode.id === 'streak' ? preset.id === '3' && round >= 5 ? ['color:4'] : preset.id === '4' && round >= 8 ? ['color:5'] : [] : [] }), mode.id === 'streak' ? 300 : 0);
    } else runtime.later(show, mode.id === 'streak' ? 200 : 0);
  };
  runtime.listen(root, 'pointerdown', (event) => { const b = event.target.closest('[data-index]'); if (b && event.button === 0) { event.preventDefault(); answer(b, event, event.pointerType === 'touch' ? 'touch' : 'pointer'); } });
  runtime.listen(root, 'keydown', (event) => { if (['Enter', 'Space'].includes(event.code) && !event.repeat && event.target.matches('[data-index]')) { event.preventDefault(); answer(event.target, event, 'keyboard'); } });
  show();
  return runtime.cleanup;
}

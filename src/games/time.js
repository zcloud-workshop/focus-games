import { createRuntime, inputTime, trackInputs } from '../engines/runtime.js';
import { createAudio } from '../engines/audio.js';

const common = { ruleVersion: 2, score: { unit: '秒误差', lower: true, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'] };
export const definition = { id: 'time', modes: [
  { ...common, id: 'fixed', name: '固定目标', sources: ['A19'], ruleVersion: 3, presets: [3, 5, 10].map((target) => ({ id: `${target}s`, name: `${target} 秒`, settings: { target, rounds: 1 }, ...(target > 3 ? { unlock: { requires: [`time:${target}`] } } : {}) })).concat({ id: 'custom', name: '自定义', unlock: { requires: ['time:5'] }, settings: { target: 3, rounds: 1 }, fields: [{ key: 'target', label: '目标时间', type: 'number', min: 1, max: 5, maxByUnlock: [{ key: 'time:5', max: 10 }, { key: 'time:10', max: 20 }], step: 1, unit: '秒' }] }), rule: '开始后凭感觉停止, 记录与目标的绝对偏差, 同时保留提前或延后的带符号偏差.' },
  { ...common, id: 'random-ten', name: '十轮估时', sources: ['T23'], presets: [{ id: 'ten', name: '10 次', settings: { rounds: 10, minTarget: 3, maxTarget: 15 } }], rule: '每轮给出随机目标秒数, 共十轮. 保存累计绝对偏差, 每轮的实际时长和带符号偏差另行记录.' },
  { ...common, id: 'practice', name: '秒针练习', sources: ['T23'], scored: false, presets: [{ id: 'practice', name: '声音辅助', settings: { target: 10, rounds: 1, audio: true, visible: true } }], rule: '跟随秒针声音练习时间感知. 本模式不记录成绩.' },
  ...[false, true].map((visible) => ({ ...common, score: { ...common.score, precision: 4 }, id: visible ? 'ten-visible' : 'ten-hidden', name: visible ? '十秒 · 显示计时' : '十秒 · 隐藏计时', sources: ['C26'], presets: [{ id: 'ten', name: '10 秒', settings: { target: 10, rounds: 1, visible } }], rule: '尽量在 10.0000 秒停止. 显示四位小数用于比较, 实际测量精度取决于浏览器和设备.' })),
] };

export function timingError(actual, target) {
  return { actual, target, signed: actual - target, absolute: Math.abs(actual - target) };
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const inputs = trackInputs();
  const audio = createAudio();
  let phase = 'idle';
  let start;
  let target;
  let tickSecond = -1;
  let soundReady = false;
  const trials = [];
  const show = () => {
    phase = 'idle';
    target = mode.id === 'random-ten' ? settings.minTarget + Math.floor(random() * (settings.maxTarget - settings.minTarget + 1)) : settings.target;
    root.innerHTML = `<div class="game-status"><span>第 ${trials.length + 1} / ${settings.rounds} 轮</span><span>目标 ${target} 秒</span></div><div class="time-orbit"><span data-timer>${target}<small>秒</small></span></div><p class="stage-note" data-hint>准备好后开始</p><button type="button" class="button primary centered" data-time>开始计时</button>`;
  };
  const frame = (at) => {
    if (phase !== 'timing') return;
    const seconds = Math.max(0, at - start) / 1000;
    if (settings.visible) root.querySelector('[data-timer]').textContent = seconds.toFixed(mode.id.startsWith('ten-') ? 4 : 1);
    if (settings.audio && soundReady && audio.context?.state === 'running' && Math.floor(seconds) !== tickSecond) { tickSecond = Math.floor(seconds); audio.tone({ frequency: 700, duration: 0.025, gain: 0.1 }); }
    runtime.frame(frame);
  };
  const respond = (event, input) => {
    inputs.add(input);
    if (phase === 'feedback') { show(); return; }
    if (phase === 'idle') {
      start = inputTime(event, runtime.now);
      phase = 'timing';
      tickSecond = -1;
      root.querySelector('[data-timer]').textContent = settings.visible ? '0.0000' : '· · ·';
      root.querySelector('[data-hint]').textContent = '感觉时间到了就停止';
      root.querySelector('[data-time]').textContent = '停止计时';
      if (settings.audio) audio.enable().then(() => { if (runtime.active) soundReady = true; }).catch(() => { if (runtime.active) root.querySelector('[data-hint]').textContent = '声音不可用, 可继续估时'; });
      runtime.frame(frame);
      return;
    }
    if (phase !== 'timing') return;
    phase = 'feedback';
    const trial = timingError(Math.max(0, inputTime(event, runtime.now) - start) / 1000, target);
    trials.push({ ...trial, input });
    if (trials.length === settings.rounds) {
      audio.close();
      runtime.finish({ value: trials.reduce((sum, item) => sum + item.absolute, 0), detail: `${trials.length} 轮累计绝对偏差`, input: inputs.value, endReason: 'completed', scored: mode.scored !== false, trials, unlocks: mode.id === 'fixed' ? preset.id === '3s' && trial.absolute <= 0.8 ? ['time:5'] : preset.id === '5s' && trial.absolute <= 1.5 ? ['time:10'] : [] : [], metrics: { 实际停止秒: trial.actual, 带符号偏差秒: trial.signed, 绝对偏差秒: trial.absolute, 累计绝对偏差秒: trials.reduce((sum,item) => sum + item.absolute, 0) } });
    } else root.innerHTML = `<div class="stimulus">${trial.actual.toFixed(4)}<small> 秒</small></div><p class="stage-note">偏差 ${trial.signed >= 0 ? '+' : ''}${trial.signed.toFixed(4)} 秒</p><button type="button" class="button primary centered" data-time>下一轮</button>`;
  };
  runtime.listen(root, 'pointerdown', (event) => { if (event.button === 0 && event.target.closest('[data-time]')) { event.preventDefault(); respond(event,event.pointerType === 'touch' ? 'touch' : 'pointer'); } });
  runtime.listen(document, 'keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target.matches('input,textarea,select,[contenteditable]') || (target !== document.body && target !== document.documentElement && !root.contains(target))) return;
    if (event.code !== 'Space' && !(event.code === 'Enter' && target.closest('[data-time]'))) return;
    event.preventDefault();
    respond(event,'keyboard');
  });
  show();
  return () => { audio.close(); runtime.cleanup(); };
}

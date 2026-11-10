import { createRuntime, inputTime } from './runtime.js';

export function createCounter(durationMs, countFirst = true) {
  let start = null;
  let count = 0;
  let repeats = 0;
  return {
    press(at, repeat = false) {
      if (repeat) { repeats++; return false; }
      if (start === null) { start = at; if (!countFirst) return true; }
      if (at < start || at >= start + durationMs) return false;
      count++;
      return true;
    },
    remaining(at) { return start === null ? durationMs : Math.max(0, start + durationMs - at); },
    result() { return { count, cps: count / (durationMs / 1000), repeats }; },
    get started() { return start !== null; },
  };
}

export function counterMount({ root, mode, settings, onFinish, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const counter = createCounter(settings.seconds * 1000, settings.countFirst !== false);
  let input = null;
  let done = false;
  const type = settings.input;
  const label = type === 'right' ? '点击鼠标右键' : type === 'keyboard' ? settings.clickStart ? '点击开始, 然后敲击空格' : '敲击空格键' : type === 'touch' ? '轻触此区域' : '点击此区域';
  root.innerHTML = `<div class="game-status"><span data-remaining>${settings.seconds.toFixed(1)} 秒</span><span data-count>0 次</span></div><button type="button" class="reaction-area counter-area"><strong>${label}</strong><span>${settings.countFirst === false ? '首次有效输入开始, 随后输入计数' : '首次有效输入开始并计数'}</span></button><p class="stage-note">${type === 'right' ? '需要鼠标或能发送真实右键的设备. 左键和触屏不计数.' : type === 'keyboard' ? '需要真实键盘. 长按自动重复不计为敲击.' : '同一轮只使用一种输入方式.'}</p>`;
  const finish = () => {
    if (done) return;
    done = true;
    const result = counter.result();
    runtime.finish({ value: result.cps, duration: settings.seconds, detail: `${settings.seconds} 秒内 ${result.count} 次, ${result.cps.toFixed(2)} 次/秒`, input, endReason: 'deadline', metrics: { 次数: result.count, 计分时长秒: settings.seconds, 自动重复次数: result.repeats } });
  };
  const tick = () => {
    const remaining = counter.remaining(runtime.now());
    root.querySelector('[data-remaining]').textContent = `${(remaining / 1000).toFixed(1)} 秒`;
    if (!remaining) finish();
    else runtime.frame(tick);
  };
  const press = (event, source) => {
    if (done || (input && input !== source)) return;
    if (event.repeat) { counter.press(inputTime(event, runtime.now), true); return; }
    const first = !counter.started;
    if (!counter.press(inputTime(event, runtime.now))) { if (counter.started) finish(); return; }
    input = source;
    root.querySelector('[data-count]').textContent = `${counter.result().count} 次`;
    if (first) runtime.frame(tick);
  };
  runtime.listen(root.querySelector('.counter-area'), 'pointerdown', (event) => {
    if (type === 'keyboard') {
      if (!settings.clickStart || counter.started || event.button !== 0) return;
      event.preventDefault();
      counter.press(inputTime(event, runtime.now));
      root.querySelector('.counter-area strong').textContent = '敲击空格键';
      runtime.frame(tick);
      return;
    }
    if (type === 'right' && (event.button !== 2 || event.pointerType !== 'mouse')) return;
    if (type !== 'right' && event.button !== 0) return;
    if (type === 'touch' && event.pointerType !== 'touch') return;
    event.preventDefault();
    press(event, type === 'right' ? 'right-mouse' : event.pointerType === 'touch' ? 'touch' : 'pointer');
  });
  if (type === 'right') runtime.listen(root.querySelector('.counter-area'), 'contextmenu', (event) => event.preventDefault());
  if (type === 'keyboard') runtime.listen(document, 'keydown', (event) => {
    if (event.code !== 'Space' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target.matches('input,textarea,select,[contenteditable]') || (target !== document.body && target !== document.documentElement && !root.contains(target))) return;
    event.preventDefault();
    if (settings.clickStart && !counter.started) return;
    press(event, 'keyboard');
  });
  return runtime.cleanup;
}

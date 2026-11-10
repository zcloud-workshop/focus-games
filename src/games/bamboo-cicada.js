import { createRuntime } from '../engines/runtime.js';
import { animate } from '../engines/animation.js';
import { createAudio } from '../engines/audio.js';
import { addToolRecord, createId } from '../storage.js';

export const definition = { id: 'bamboo-cicada', modes: [{ id: 'gesture', name: '画圈互动', sources: ['C30'], ruleVersion: 2, presets: [{ id: 'natural', name: '竹筒与绳', settings: {} }], hiddenPolicy: 'pause', scored: false, inputs: ['pointer', 'touch', 'motion'], score: { unit: '圈', lower: false, min: 0 }, rule: '按住区域画圈带动竹筒, 转速和绳子张力改变声音. 松手后逐渐停止. 自动演示不计圈数, 手机动作感应需主动启用, 不可用时仍可手势操作.' }] };

export function angularDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function gestureStep(state, angle, at, radius) {
  if (state.angle === null || radius < 0.15) return { ...state, angle, at, progress: 0, velocity: 0 };
  const delta = angularDelta(state.angle,angle);
  const seconds = Math.max(0.008,(at - state.at) / 1000);
  if (seconds > 0.3 || Math.abs(delta) > 1.5) return { ...state, angle, at, progress: 0 };
  const velocity = delta / seconds;
  const progress = Math.abs(velocity) >= 2 ? Math.sign(delta) === Math.sign(state.progress) ? state.progress + delta : delta : state.progress;
  const turns = Math.floor(Math.abs(progress) / (Math.PI * 2));
  return { angle, at, velocity, turns: state.turns + turns, progress: progress - Math.sign(progress) * turns * Math.PI * 2 };
}

export function mount({ root, store, clock = globalThis }) {
  const runtime = createRuntime({ clock });
  const audio = createAudio();
  let voice;
  let enabled = false;
  let muted = false;
  let automatic = false;
  let held = false;
  let hidden = false;
  let resumedAt = null;
  let sensor = false;
  let pointerId;
  let angle = 0;
  let velocity = 0;
  let tension = 0;
  let style = 0;
  let gesture = { angle: null, at: 0, progress: 0, turns: 0, velocity: 0 };
  const session = createId();
  const started = runtime.now();
  let savedTurns = 0;
  root.innerHTML = '<div class="cicada-board" tabindex="0" aria-label="按住画圈的竹知了互动区域"><svg viewBox="0 0 400 320" aria-hidden="true"><path d="M200 150v-65" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><line data-rope x1="200" y1="150" x2="290" y2="150" stroke="currentColor" stroke-width="2"/><g data-cylinder><rect x="-16" y="-24" width="32" height="48" rx="8" fill="#b8a275" stroke="currentColor" stroke-width="2"/><path d="M-12-12h24M-12 12h24" stroke="currentColor"/></g></svg></div><div class="tool-controls"><button type="button" class="button primary" data-tool="sound">启用声音</button><button type="button" class="button secondary" data-tool="auto">自动甩</button><button type="button" class="button secondary" data-tool="style">切换外观</button><button type="button" class="button secondary" data-tool="motion">动作感应</button></div><p class="stage-note" data-count>手动 0 圈</p><p class="stage-note" data-note role="status">拖动时画圆. 空格切换自动演示.</p>';
  const board = root.querySelector('.cicada-board');
  const note = (text) => { if (runtime.active) root.querySelector('[data-note]').textContent = text; };
  const save = () => {
    if (gesture.turns <= savedTurns) return;
    const turns = gesture.turns;
    const record = { id: `cicada-${session}`, game: 'bamboo-cicada', kind: 'tool', at: new Date().toISOString(), duration: (runtime.now() - started) / 1000, turns, detail: `手动 ${turns} 圈` };
    store.mutate((data) => { const old = data.tools.find((r) => r?.id === record.id); if (old) { if (old.turns < turns) Object.assign(old,record); } else addToolRecord(data,record); });
    savedTurns = turns;
  };
  const enable = () => audio.enable().then(() => { if (!runtime.active) { audio.close(); return; } enabled = true; if (!voice) voice = audio.continuous({ frequency: 170, gain: 0, type: 'sawtooth' }); root.querySelector('[data-tool="sound"]').textContent = muted ? '取消静音' : '静音'; note('声音已启用'); }).catch(() => note('声音不可用, 仍可画圈互动'));
  const gestureInput = (x,y,at) => {
    const bounds = board.getBoundingClientRect();
    const dx = (x - bounds.left) / bounds.width - 0.5;
    const dy = (y - bounds.top) / bounds.height - 0.47;
    gesture = gestureStep(gesture,Math.atan2(dy,dx),at,Math.hypot(dx,dy));
    velocity = Math.max(-30,Math.min(30,gesture.velocity));
    tension = Math.min(1,Math.hypot(dx,dy) * 2.5);
    root.querySelector('[data-count]').textContent = `手动 ${gesture.turns} 圈`;
    save();
  };
  runtime.listen(board,'pointerdown',(event) => {
    if (event.button !== 0 || held) return;
    event.preventDefault();
    automatic = false;
    held = true;
    pointerId = event.pointerId;
    gesture.angle = null;
    board.setPointerCapture(pointerId);
    gestureInput(event.clientX,event.clientY,runtime.now());
  });
  runtime.listen(board,'pointermove',(event) => { if (held && event.pointerId === pointerId) gestureInput(event.clientX,event.clientY,runtime.now()); });
  const release = (event) => { if (event && event.pointerId !== pointerId) return; held = false; gesture.angle = null; save(); };
  runtime.listen(board,'pointerup',release);
  runtime.listen(board,'pointercancel',release);
  runtime.listen(board,'lostpointercapture',release);
  const toggleAuto = () => { automatic = !automatic; root.querySelector('[data-tool="auto"]').textContent = automatic ? '停止演示' : '自动甩'; note(automatic ? '自动演示不计圈数' : '可以继续手动画圈'); };
  runtime.listen(root,'click',async (event) => {
    const action = event.target.closest('[data-tool]')?.dataset.tool;
    if (action === 'auto') toggleAuto();
    if (action === 'style') { style = 1 - style; root.querySelector('rect').setAttribute('fill',style ? '#79a4b5' : '#b8a275'); }
    if (action === 'sound') { if (!enabled) enable(); else { muted = !muted; root.querySelector('[data-tool="sound"]').textContent = muted ? '取消静音' : '静音'; } }
    if (action === 'motion') {
      if (sensor) { sensor = false; window.removeEventListener('devicemotion',onMotion); note('动作感应已停用'); return; }
      if (!globalThis.DeviceMotionEvent) { note('设备不支持动作感应, 可以继续画圈'); return; }
      try {
        if (typeof DeviceMotionEvent.requestPermission === 'function' && await DeviceMotionEvent.requestPermission() !== 'granted') { note('未获动作权限, 可以继续画圈'); return; }
        if (!runtime.active) return;
        sensor = true;
        window.addEventListener('devicemotion',onMotion);
        note('动作感应已启用, 可随时关闭并使用手势');
      } catch { note('动作感应不可用, 可以继续画圈'); }
    }
  });
  const onMotion = (event) => {
    if (!sensor || hidden || automatic || held) return;
    const acceleration = event.accelerationIncludingGravity;
    if (!Number.isFinite(acceleration?.x) || !Number.isFinite(acceleration?.y)) return;
    gesture = gestureStep(gesture,Math.atan2(acceleration.y,acceleration.x),runtime.now(),Math.hypot(acceleration.x,acceleration.y) / 10);
    velocity = Math.max(-30,Math.min(30,gesture.velocity));
    tension = Math.min(1,Math.abs(velocity) / 12);
    root.querySelector('[data-count]').textContent = `手动 ${gesture.turns} 圈`;
    save();
  };
  runtime.listen(document,'keydown',(event) => { if (event.code === 'Space' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.target.matches('input,select,textarea,button')) { event.preventDefault(); toggleAuto(); } });
  runtime.listen(document,'visibilitychange',() => { hidden = document.hidden; if (hidden) { release(); sensor = false; window.removeEventListener('devicemotion',onMotion); voice?.set({gain:0}); } else resumedAt = runtime.now(); });
  animate(runtime,(seconds,at) => {
    if (hidden) return;
    if (resumedAt !== null) { seconds = Math.max(0,(at - resumedAt) / 1000); resumedAt = null; }
    if (automatic) { velocity = 11; tension = 0.9; }
    else if (!held && !sensor) { velocity *= Math.exp(-2.4 * seconds); tension *= Math.exp(-1.6 * seconds); }
    angle += velocity * seconds;
    const length = 48 + tension * 60;
    const x = 200 + Math.cos(angle) * length;
    const y = 150 + Math.sin(angle) * length;
    root.querySelector('[data-rope]').setAttribute('x2',x);
    root.querySelector('[data-rope]').setAttribute('y2',y);
    root.querySelector('[data-cylinder]').setAttribute('transform',`translate(${x} ${y}) rotate(${angle * 180 / Math.PI})`);
    voice?.set({ frequency: 150 + Math.abs(velocity) * 9 + Math.sin(angle) * 20, gain: !muted && Math.abs(velocity) > 2 ? Math.min(0.08,Math.abs(velocity) / 200) * tension * (0.6 + Math.cos(angle) * 0.4) : 0 });
  });
  return () => { save(); sensor = false; window.removeEventListener('devicemotion',onMotion); audio.close(); runtime.cleanup(); };
}

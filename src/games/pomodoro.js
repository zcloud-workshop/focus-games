import { createRuntime } from '../engines/runtime.js';
import { createAudio } from '../engines/audio.js';
import { addToolRecord, createId, visibleTools } from '../storage.js';

export const definition = { id: 'pomodoro', modes: [{ id: 'timer', name: '专注与休息', sources: ['C21'], ruleVersion: 3, hiddenPolicy: 'continue', scored: false, inputs: ['pointer', 'touch', 'keyboard'], score: { unit: '分钟', lower: false, min: 0 }, presets: [{ id: 'classic', name: '25 / 5 / 15', settings: { focus: 25, short: 5, long: 15, every: 4, autoBreak: true, sound: true } }, { id: 'custom', name: '自定义', settings: { focus: 25, short: 5, long: 15, every: 4, autoBreak: true, sound: true }, fields: [{ key: 'focus', label: '专注', type: 'number', min: 0, max: 100, step: 1, unit: '分钟' }, { key: 'short', label: '短休息', type: 'number', min: 0, max: 100, step: 1, unit: '分钟' }, { key: 'long', label: '长休息', type: 'number', min: 0, max: 100, step: 1, unit: '分钟' }, { key: 'every', label: '长休息间隔', type: 'number', min: 0, max: 100, step: 1, unit: '个专注时段' }, { key: 'autoBreak', label: '自动开始休息', type: 'checkbox', default: true }, { key: 'sound', label: '完成提示音', type: 'checkbox', default: true }] }], rule: '完成专注时段后短休息, 每四个专注时段后长休息. 支持暂停、重置和跳过; 跳过不算完成, 但会进入下一个休息周期. 0分钟时段直接跳过. 后台和刷新后按实际时间继续, 工具记录不计训练成绩.' }] };

export function initialTimer(config, id) {
  return { config: { ...config }, id, phase: 'focus', running: false, remaining: config.focus * 60_000, deadline: null, completedFocus: 0, cycleCount: 0 };
}

export function nextPhase(state, completed) {
  const completedFocus = state.completedFocus + (completed && state.phase === 'focus' ? 1 : 0);
  const cycleCount = (state.cycleCount ?? state.completedFocus) + (state.phase === 'focus' ? 1 : 0);
  const phase = state.phase === 'focus' ? cycleCount % state.config.every === 0 ? 'long' : 'short' : 'focus';
  return { ...state, completedFocus, cycleCount, phase, running: false, deadline: null, remaining: state.config[phase] * 60_000 };
}

export function timerRemaining(state, now) {
  return state.running ? Math.max(0, state.deadline - now) : state.remaining;
}

export function mount({ root, settings, store, clock = globalThis }) {
  const runtime = createRuntime({ clock });
  const audio = createAudio();
  const now = () => (clock.Date ?? Date).now();
  const previous = store.data.toolState?.pomodoro;
  let state = previous && previous.running ? { ...previous, config: { ...previous.config } } : initialTimer(settings, createId(now()));
  if (previous && !previous.running && JSON.stringify(previous.config) === JSON.stringify(settings)) state = { ...previous };
  let sound = false;
  let note = '';
  const save = (completed) => store.mutate((data) => {
    data.toolState ??= {};
    data.toolState.pomodoro = { ...state, config: { ...state.config } };
    if (completed) addToolRecord(data, completed);
  });
  const todayStats = () => {
    const day = new Date(now()).toLocaleDateString('en-CA');
    const records = visibleTools(store.data.tools).filter((r) => r.game === 'pomodoro' && new Date(r.at).toLocaleDateString('en-CA') === day);
    return { count: records.length, minutes: records.reduce((s,r) => s + r.minutes,0) };
  };
  const draw = () => {
    const total = Math.ceil(timerRemaining(state,now()) / 1000);
    const stats = todayStats();
    root.innerHTML = `<p class="stage-note">${{focus:'专注',short:'短休息',long:'长休息'}[state.phase]}</p><div class="pomodoro-clock">${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}</div><div class="tool-controls"><button type="button" class="button primary" data-timer="toggle">${state.running ? '暂停' : '开始'}</button><button type="button" class="button secondary" data-timer="reset">重置</button><button type="button" class="button secondary" data-timer="skip">跳过</button></div><p class="stage-note" data-today>今日 ${stats.count} 个专注时段 · ${stats.minutes} 分钟</p><p class="stage-note" role="status">${note}</p>`;
  };
  const reconcile = () => {
    if (!state.running || timerRemaining(state,now()) > 0) return false;
    const completed = state.phase === 'focus' && state.config.focus > 0 ? { id: `pomodoro-${state.id}`, game: 'pomodoro', kind: 'tool', at: new Date(state.deadline).toISOString(), duration: state.config.focus * 60, minutes: state.config.focus, detail: `完成 ${state.config.focus} 分钟专注` } : null;
    const previousPhase = state.phase;
    const previousDeadline = state.deadline;
    const finished = state.config[state.phase] > 0;
    state = { ...nextPhase(state,finished), id: createId(now()) };
    if (previousPhase === 'focus' && state.config.autoBreak) state = { ...state, running: true, deadline: previousDeadline + state.remaining };
    const outcome = save(completed);
    note = `${previousPhase === 'focus' ? '专注完成, 可以休息了' : '休息完成, 准备下一次专注'}${outcome.ok ? '' : '. 存储暂不可用'}`;
    if (state.config.sound && sound && !document.hidden) audio.tone({ frequency: 660, duration: 0.35, gain: 0.1 });
    return true;
  };
  const tick = () => {
    if (reconcile()) draw();
    const seconds = Math.ceil(timerRemaining(state,now()) / 1000);
    root.querySelector('.pomodoro-clock').textContent = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
    const stats = todayStats();
    root.querySelector('[data-today]').textContent = `今日 ${stats.count} 个专注时段 · ${stats.minutes} 分钟`;
    runtime.later(tick,250);
  };
  runtime.listen(root,'click',(event) => {
    const action = event.target.closest('[data-timer]')?.dataset.timer;
    if (!action) return;
    reconcile();
    if (action === 'toggle') {
      if (state.running) state = { ...state, remaining: timerRemaining(state,now()), running: false, deadline: null };
      else {
        state = { ...state, running: true, deadline: now() + state.remaining };
        if (state.config.sound) audio.enable().then(() => { sound = true; }).catch(() => { note = '声音不可用, 计时仍会继续'; });
      }
    }
    if (action === 'reset') state = { ...state, running: false, deadline: null, remaining: state.config[state.phase] * 60_000, id: createId(now()) };
    if (action === 'skip') state = { ...nextPhase(state,false), id: createId(now()) };
    save();
    draw();
  });
  runtime.listen(document,'visibilitychange',() => { if (!document.hidden) { reconcile(); draw(); } });
  reconcile();
  save();
  draw();
  tick();
  return () => { save(); audio.close(); runtime.cleanup(); };
}

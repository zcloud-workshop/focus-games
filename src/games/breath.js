import { createRuntime } from '../engines/runtime.js';

export const definition = {
  id: 'breath',
  modes: [{
    id: 'staged', name: '循序呼吸', ruleVersion: 2,
    presets: [
      { id: 'beginner', name: '初级 4 / 4 / 4', settings: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 0 } },
      { id: 'intermediate', name: '中级 4 / 7 / 8', settings: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 }, unlock: { key: 'breath|staged|intermediate', requires: ['breath|staged|intermediate'] } },
      { id: 'advanced', name: '高级 5 / 10 / 10', settings: { inhale: 5, holdIn: 10, exhale: 10, holdOut: 0 }, unlock: { key: 'breath|staged|advanced', requires: ['breath|staged|advanced'] } },
      { id: 'box', name: '箱式 4 / 4 / 4 / 4', settings: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 }, unlock: { key: 'breath|staged|box', requires: ['breath|staged|box'] } },
      { id: 'custom', name: '自定义', settings: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 0 }, unlock: { key: 'breath|staged|intermediate', requires: ['breath|staged|intermediate'] }, fields: [
        { key: 'inhale', label: '吸气', type: 'number', default: 4, min: 1, max: 30, step: 1, unit: '秒' },
        { key: 'holdIn', label: '屏息', type: 'number', default: 4, min: 0, max: 30, step: 1, unit: '秒' },
        { key: 'exhale', label: '呼气', type: 'number', default: 4, min: 1, max: 30, step: 1, unit: '秒' },
      ] },
    ],
    score: { unit: '轮', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['unknown'],
    rule: '跟随引导完成 3 轮. 如感到不适, 请随时停止.',
  }, {
    id: 'guided', name: '定时呼吸', ruleVersion: 3,
    presets: [
      { id: 'resonance', name: '4 / 6', settings: { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0, minutes: 5 } },
      { id: 'box', name: '4 / 4 / 4 / 4', settings: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4, minutes: 5 } },
      { id: '478', name: '4 / 7 / 8', settings: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, minutes: 5 } },
      { id: 'custom', name: '自定义', settings: { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0, minutes: 5 }, fields: [
        { key: 'inhale', label: '吸气', type: 'number', default: 4, min: 2, max: 10, step: 0.5, unit: '秒' },
        { key: 'holdIn', label: '吸后屏息', type: 'number', default: 0, min: 0, max: 10, step: 1, unit: '秒' },
        { key: 'exhale', label: '呼气', type: 'number', default: 6, min: 2, max: 10, step: 0.5, unit: '秒' },
        { key: 'holdOut', label: '呼后屏息', type: 'number', default: 0, min: 0, max: 10, step: 1, unit: '秒' },
        { key: 'minutes', label: '训练时长', type: 'number', default: 5, min: 1, max: 20, step: 1, unit: '分钟' },
      ] },
    ],
    fields: [
      { key: 'minutes', label: '训练时长', type: 'number', default: 5, min: 1, max: 20, step: 1, unit: '分钟' },
    ],
    score: { unit: '轮', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['unknown'],
    rule: '跟随节奏舒适呼吸. 屏息不适时可选择无屏息配置或随时退出.',
  }],
};

export function breathPhase(seconds, settings) {
  const phases = [['吸气', settings.inhale], ['屏息', settings.holdIn], ['呼气', settings.exhale], ['屏息', settings.holdOut]].filter(([, length]) => length > 0);
  const cycle = phases.reduce((sum, [, length]) => sum + length, 0);
  let offset = seconds % cycle;
  for (const [label, length] of phases) {
    if (offset < length) return { label, remaining: length - offset, progress: offset / length, cycles: Math.floor(seconds / cycle) };
    offset -= length;
  }
}

export function mount({ root, mode = definition.modes[0], preset = mode.presets[0], settings = preset.settings, onFinish, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const values = { ...preset.settings, ...settings };
  const staged = mode.id === 'staged';
  const cycle = values.inhale + values.holdIn + values.exhale + values.holdOut;
  const goal = staged ? cycle * 3 : values.minutes * 60;
  let started = runtime.now();
  let pausedAt = null;
  let pauseTime = 0;
  let segmentStart = 0;
  let completedCycles = 0;
  root.innerHTML = '<div class="game-status"><span>舒适呼吸</span><span id="breath-round"></span></div><div class="breath-orbit"><div class="breath-circle"><strong id="breath-label"></strong><span id="breath-count"></span></div></div><p class="stage-note">不必刻意深呼吸, 保持自然舒适即可</p><div class="result-actions"><button class="button secondary" data-breath="pause">暂停</button><button class="button secondary" data-breath="reset">重新开始</button></div>';
  const circle = root.querySelector('.breath-circle');
  const render = () => {
    if (!runtime.active) return;
    const elapsed = Math.min(goal, ((pausedAt ?? runtime.now()) - started - pauseTime) / 1000);
    const phase = breathPhase(elapsed - segmentStart, values);
    const cycles = completedCycles + phase.cycles;
    root.querySelector('#breath-round').textContent = `已完成 ${cycles} 轮`;
    root.querySelector('#breath-label').textContent = phase.label;
    root.querySelector('#breath-count').textContent = Math.ceil(phase.remaining);
    const scale = phase.label === '吸气' ? 1 + phase.progress * 0.35 : phase.label === '呼气' ? 1.35 - phase.progress * 0.35 : (values.holdOut && (elapsed - segmentStart) % cycle >= values.inhale + values.holdIn + values.exhale ? 1 : 1.35);
    circle.style.transform = `scale(${scale})`;
    if (elapsed >= goal) {
      const next = { beginner: 'intermediate', intermediate: 'advanced', advanced: 'box' }[preset.id];
      runtime.finish({ value: cycles, detail: `完成 ${cycles} 个完整呼吸周期`, duration: elapsed, mode: mode.id, preset: preset.id, settings: values, rules: mode.ruleVersion, input: 'unknown', endReason: 'completed', scored: true, metrics: { activeSeconds: elapsed }, unlocks: staged && next && cycles >= 3 ? [`breath|staged|${next}`] : [] });
      return;
    }
    runtime.frame(render);
  };
  runtime.listen(root, 'click', (event) => {
    const action = event.target.closest('[data-breath]')?.dataset.breath;
    if (action === 'pause') {
      if (pausedAt === null) { pausedAt = runtime.now(); event.target.textContent = '继续'; }
      else {
        const elapsed = (pausedAt - started - pauseTime) / 1000;
        if (!staged) { completedCycles += breathPhase(elapsed - segmentStart, values).cycles; segmentStart = elapsed; }
        pauseTime += runtime.now() - pausedAt; pausedAt = null; event.target.textContent = '暂停';
      }
    }
    if (action === 'reset') {
      started = runtime.now(); pauseTime = 0; pausedAt = null; segmentStart = 0; completedCycles = 0;
      root.querySelector('[data-breath="pause"]').textContent = '暂停';
    }
  });
  runtime.frame(render);
  return runtime.cleanup;
}

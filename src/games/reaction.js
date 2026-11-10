import { createRuntime, inputTime } from '../engines/runtime.js';
import { meanValidResponses, presentOnFrame } from '../engines/trials.js';
import { markUnlocked } from '../storage.js';

export const definition = {
  id: 'reaction',
  modes: [
    { id: 'staged', name: '连续反应', ruleVersion: 2, presets: [
      { id: 'beginner', name: '初级', settings: { minWait: 1.5, maxWait: 4.5 } },
      { id: 'intermediate', name: '中级', settings: { minWait: 1.5, maxWait: 4.5 }, unlock: { key: 'reaction|staged|intermediate', requires: ['reaction|staged|intermediate'] } },
      { id: 'advanced', name: '高级', settings: { minWait: 1.5, maxWait: 4.5 }, unlock: { key: 'reaction|staged|advanced', requires: ['reaction|staged|advanced'] } },
      { id: 'custom', name: '自定义', settings: { minWait: 1.5, maxWait: 4.5 }, unlock: { key: 'reaction|staged|intermediate', requires: ['reaction|staged|intermediate'] }, fields: [
        { key: 'minWait', label: '最短等待', type: 'number', default: 1.5, min: 0.5, max: 10, step: 0.1, unit: '秒' },
        { key: 'maxWait', label: '最长等待', type: 'number', default: 4.5, min: 0.5, max: 10, step: 0.1, unit: '秒' },
      ] },
    ], validateSettings: (settings) => settings.minWait > settings.maxWait ? '最短等待不能大于最长等待.' : '', score: { unit: 'ms', lower: true, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '点击开始, 变绿后响应. 可连续测量并在完成时保存平均值.' },
    { id: 'single', name: '重复测量', ruleVersion: 2, presets: [{ id: 'default', name: '单次计时', settings: {} }], score: { unit: '秒', lower: true, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '点击开始, 等待绿色信号, 再尽快响应. 点击继续可再次测量.' },
    { id: 'color', name: '颜色反应', ruleVersion: 2, presets: [{ id: 'five', name: '5 次', settings: {} }], score: { unit: 'ms', lower: true, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '等待颜色变绿后点击或按空格. 完成 5 次有效反应, 抢按后重新等待.' },
    { id: 'start-lights', name: '起步灯', ruleVersion: 2, presets: [{ id: 'five', name: '连续 5 次', settings: {} }], score: { unit: '秒', lower: true, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '等待五盏灯依次亮起并熄灭, 然后点击或按空格. 抢跑将重新累计 5 次.' },
  ],
};

export function mount({ root, mode = definition.modes[0], preset = mode.presets[0], settings = {}, onFinish, random = Math.random, clock = globalThis, store }) {
  const runtime = createRuntime({ onFinish, clock });
  const trials = [];
  let phase = 'idle';
  let timer;
  let shownAt;
  let lights = 0;
  let early = 0;
  const inputs = new Set();
  const lightMode = mode.id === 'start-lights';
  const staged = mode.id === 'staged';
  const single = mode.id === 'single';
  const continuous = staged || single;
  const unlocks = new Set();
  const valid = () => trials.filter((trial) => trial.valid);
  const draw = (message, hint = '') => {
    const markers = lightMode ? `<span style="font-size:32px;letter-spacing:8px;color:#d34c4c">${'●'.repeat(lights)}${'○'.repeat(5 - lights)}</span>` : '<span class="reaction-dot"></span>';
    root.innerHTML = `<div class="game-status"><span>有效 ${valid().length}${continuous ? '' : ' / 5'} 次</span><span>抢按 ${early} 次</span></div><button class="reaction-area ${phase === 'ready' && !lightMode ? 'ready' : 'waiting'}" type="button" data-react>${markers}<strong>${message}</strong><span>${hint}</span></button><p class="stage-note">点击区域或按空格键</p>${continuous ? `<div class="result-actions"><button class="button secondary" data-reset>重置本次</button><button class="button primary" data-finish ${valid().length ? '' : 'disabled'}>完成并保存</button></div>` : ''}`;
  };
  const signal = () => presentOnFrame(runtime, () => {
    if (phase !== 'waiting') return;
    phase = 'ready';
    lights = 0;
    draw(lightMode ? '现在出发!' : '现在点击!');
  }, (at) => { if (phase === 'ready') shownAt = at; });
  const begin = () => {
    phase = 'waiting';
    lights = 0;
    draw(lightMode ? '等待灯光熄灭' : '等待绿色出现');
    if (!lightMode) {
      const min = staged ? (settings.minWait ?? preset.settings.minWait) * 1000 : 1200;
      const max = staged ? (settings.maxWait ?? preset.settings.maxWait) * 1000 : 3400;
      timer = runtime.later(signal, min + random() * (max - min));
      return;
    }
    const next = () => {
      if (phase !== 'waiting') return;
      lights++;
      draw('等待灯光熄灭');
      timer = runtime.later(lights === 5 ? signal : next, lights === 5 ? 200 + random() * 2800 : 1000);
    };
    timer = runtime.later(next, 1000);
  };
  const respond = (event, input) => {
    if (phase === 'feedback') { if (continuous) begin(); return; }
    inputs.add(input);
    if (phase === 'idle') { begin(); return; }
    const at = inputTime(event, runtime.now);
    const responseMs = phase === 'ready' ? Math.max(0, at - shownAt) : null;
    if (phase === 'waiting' || (lightMode && responseMs < 100)) {
      runtime.cancel(timer);
      early++;
      trials.push({ valid: false, reason: 'early', responseMs, input });
      if (lightMode) for (const trial of trials) trial.valid = false;
      phase = 'feedback';
      draw('稍微早了一点', '准备重新等待');
      if (!continuous) runtime.later(begin, 1000);
      return;
    }
    if (phase !== 'ready') return;
    trials.push({ valid: true, responseMs, input });
    phase = 'feedback';
    const average = meanValidResponses(trials);
    if (staged) {
      const next = preset.id === 'beginner' && responseMs <= 300 ? 'intermediate' : preset.id === 'intermediate' && responseMs <= 250 ? 'advanced' : null;
      if (next) {
        const key = `reaction|staged|${next}`;
        unlocks.add(key);
        store?.mutate((data) => markUnlocked(data, key));
      }
    }
    if (!continuous && valid().length === 5) {
      runtime.finish({ value: Math.round((lightMode ? average / 1000 : average) * 1000) / 1000, detail: `${valid().length} 次有效反应的平均值, 抢按 ${early} 次`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputs.size === 1 ? [...inputs][0] : 'mixed', endReason: 'completed', scored: true, metrics: { early, averageMs: average }, trials });
      return;
    }
    draw(single ? `${(responseMs / 1000).toFixed(3)} 秒` : `${Math.round(responseMs)} ms`, continuous ? '点击继续, 或完成并保存' : '准备下一次');
    if (!continuous) runtime.later(begin, 900);
  };
  runtime.listen(root, 'click', (event) => {
    if (event.target.closest('[data-reset]')) {
      runtime.cancel(timer);
      trials.length = 0; early = 0; inputs.clear(); phase = 'idle';
      draw('点击开始', '等待信号后再响应');
    }
    if (event.target.closest('[data-finish]') && valid().length) {
      const average = meanValidResponses(trials);
      const value = single ? valid().at(-1).responseMs / 1000 : average;
      runtime.finish({ value: Math.round(value * 1000) / 1000, detail: single ? `最近一次反应, 本次共 ${valid().length} 次有效测量` : `${valid().length} 次有效反应的平均值, 抢按 ${early} 次`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputs.size === 1 ? [...inputs][0] : 'mixed', endReason: 'completed', scored: true, metrics: { early, averageMs: average }, trials, unlocks: [...unlocks] });
    }
  });
  runtime.listen(root, 'pointerdown', (event) => {
    if (!event.target.closest('[data-react]') || event.button !== 0) return;
    event.preventDefault();
    respond(event, event.pointerType === 'touch' ? 'touch' : 'pointer');
  });
  runtime.listen(document, 'keydown', (event) => {
    if (event.code !== 'Space' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    respond(event, 'keyboard');
  });
  draw('点击开始', '等待信号后再响应');
  return runtime.cleanup;
}

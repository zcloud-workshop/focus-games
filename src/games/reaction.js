import { createRuntime, inputTime } from '../engines/runtime.js';
import { meanValidResponses, presentOnFrame } from '../engines/trials.js';

export const definition = {
  id: 'reaction',
  modes: [
    { id: 'color', name: '颜色反应', ruleVersion: 2, presets: [{ id: 'five', name: '5 次', settings: {} }], score: { unit: 'ms', lower: true, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard'], rule: '等待颜色变绿后点击或按空格. 完成 5 次有效反应, 抢按后重新等待.' },
    { id: 'start-lights', name: '起步灯', ruleVersion: 2, presets: [{ id: 'five', name: '连续 5 次', settings: {} }], score: { unit: '秒', lower: true, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard'], rule: '等待五盏灯依次亮起并熄灭, 然后点击或按空格. 抢跑将重新累计 5 次.' },
  ],
};

export function mount({ root, mode = definition.modes[0], preset = mode.presets[0], settings = {}, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const trials = [];
  let phase = 'idle';
  let timer;
  let shownAt;
  let lights = 0;
  let early = 0;
  const inputs = new Set();
  const lightMode = mode.id === 'start-lights';
  const valid = () => trials.filter((trial) => trial.valid);
  const draw = (message, hint = '') => {
    const markers = lightMode ? `<span style="font-size:32px;letter-spacing:8px;color:#d34c4c">${'●'.repeat(lights)}${'○'.repeat(5 - lights)}</span>` : '<span class="reaction-dot"></span>';
    root.innerHTML = `<div class="game-status"><span>有效 ${valid().length} / 5 次</span><span>抢按 ${early} 次</span></div><button class="reaction-area ${phase === 'ready' && !lightMode ? 'ready' : 'waiting'}" type="button" data-react>${markers}<strong>${message}</strong><span>${hint}</span></button><p class="stage-note">点击区域或按空格键</p>`;
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
      timer = runtime.later(signal, 1200 + random() * 2200);
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
    if (phase === 'feedback') return;
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
      runtime.later(begin, 1000);
      return;
    }
    if (phase !== 'ready') return;
    trials.push({ valid: true, responseMs, input });
    phase = 'feedback';
    const average = meanValidResponses(trials);
    if (valid().length === 5) {
      runtime.finish({ value: Math.round((lightMode ? average / 1000 : average) * 1000) / 1000, detail: `5 次有效反应的平均值, 抢按 ${early} 次`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputs.size === 1 ? [...inputs][0] : 'mixed', endReason: 'completed', scored: true, metrics: { early, averageMs: average }, trials });
      return;
    }
    draw(`${Math.round(responseMs)} ms`, '准备下一次');
    runtime.later(begin, 900);
  };
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

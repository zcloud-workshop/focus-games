import { shuffle } from '../core.js';
import { createRuntime, trackInputs } from '../engines/runtime.js';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const definition = { id: 'rsvp', modes: [{
  id: 'letters', name: '快速字母流', sources: ['A07'], ruleVersion: 3,
  presets: [
    { id: 'default', name: '默认', settings: { intervalMs: 150, count: 15, targets: 2 } },
    { id: 'easy', name: '初级', settings: { intervalMs: 200, count: 12, targets: 1 } },
    { id: 'medium', name: '中级', unlock: { requires: ['rsvp:medium'] }, settings: { intervalMs: 150, count: 15, targets: 2 } },
    { id: 'hard', name: '高级', unlock: { requires: ['rsvp:hard'] }, settings: { intervalMs: 80, count: 20, targets: 3 } },
    { id: 'custom', name: '自定义', unlock: { requires: ['rsvp:medium'] }, settings: { intervalMs: 150, count: 15, targets: 2 }, fields: [
      { key: 'intervalMs', label: '每字呈现', type: 'number', min: 150, minByUnlock: [{ key: 'rsvp:medium', min: 100 }, { key: 'rsvp:hard', min: 80 }], max: 250, step: 10, unit: 'ms' },
      { key: 'targets', label: '红色字母数量', type: 'number', min: 1, max: 2, maxByUnlock: [{ key: 'rsvp:hard', max: 3 }], step: 1 },
    ] },
  ],
  score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'],
  warning: '字母会快速切换, 画面仅在中央小区域变化.',
  rule: '观察字母流, 在六个选项中选择任意一个出现过的红色字母. 每轮后可继续或保存本次正确率. 初级和中级各答对一轮可解锁下一预设.',
}] };

export function letterRound(settings, random = Math.random) {
  const positions = new Set(shuffle(Array.from({ length: settings.count - 2 }, (_, i) => i + 2), random).slice(0, settings.targets));
  const letters = Array.from({ length: settings.count }, (_, i) => ({ letter: alphabet[Math.floor(random() * alphabet.length)], target: positions.has(i) }));
  const targets = letters.filter((item) => item.target).map((item) => item.letter);
  const choices = [...new Set(targets)];
  for (const letter of shuffle([...alphabet], random)) if (choices.length < 6 && !choices.includes(letter)) choices.push(letter);
  return { letters, targets, choices: shuffle(choices, random) };
}

export function mount({ root, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const inputs = trackInputs();
  const trials = [];
  let phase = 'presenting';
  let current;
  const finish = () => {
    const correct = trials.filter((trial) => trial.correct).length;
    runtime.finish({ value: Math.round(correct / trials.length * 100), detail: `${correct} / ${trials.length} 轮正确`, input: inputs.value, endReason: 'manual-save', trials, metrics: { 正确轮数: correct, 完成轮数: trials.length }, unlocks: correct > 0 ? ['default', 'easy'].includes(preset.id) ? ['rsvp:medium'] : preset.id === 'medium' ? ['rsvp:hard'] : [] : [] });
  };
  const show = () => {
    phase = 'presenting';
    current = letterRound(settings, random);
    const trial = { durations: [], targets: current.targets };
    root.innerHTML = `<div class="game-status"><span>第 ${trials.length + 1} 轮</span><span>记住红色字母</span></div><div class="stimulus rsvp-stimulus">+</div>`;
    let index = 0;
    let previous;
    const present = () => runtime.frame((at) => {
      if (previous !== undefined) trial.durations.push(at - previous);
      previous = at;
      if (index === current.letters.length) {
        phase = 'recall';
        current.trial = trial;
        root.innerHTML = `<p class="stage-note">选择任意一个出现过的红色字母</p><div class="answer-options">${current.choices.map((letter) => `<button type="button" class="button" data-letter="${letter}">${letter}</button>`).join('')}</div>`;
        return;
      }
      const item = current.letters[index++];
      const element = root.querySelector('.stimulus');
      element.textContent = item.letter;
      element.style.color = item.target ? '#d43838' : 'var(--ink)';
      runtime.later(present, settings.intervalMs);
    });
    present();
  };
  runtime.listen(root, 'click', (event) => {
    const answer = event.target.closest('[data-letter]');
    if (phase === 'recall' && answer) {
      inputs.add(event);
      phase = 'feedback';
      const correct = current.targets.includes(answer.dataset.letter);
      trials.push({ ...current.trial, correct, answer: answer.dataset.letter });
      answer.classList.add(correct ? 'correct' : 'incorrect');
      root.querySelectorAll('[data-letter]').forEach((button) => { button.disabled = true; });
      runtime.later(() => {
        root.innerHTML = `<p class="stage-note">${correct ? '回答正确' : '本轮未答对'}. 红色字母为 ${current.targets.join(' ')}</p><div class="stage-actions"><button type="button" class="button primary" data-next>继续下一轮</button><button type="button" class="button" data-save>结束并保存</button></div>`;
      }, 400);
    } else if (phase === 'feedback' && event.target.closest('[data-next]')) show();
    else if (phase === 'feedback' && event.target.closest('[data-save]')) finish();
  });
  let remaining = 3;
  const countdown = () => {
    root.innerHTML = `<div class="stimulus">${remaining}</div>`;
    runtime.later(() => --remaining ? countdown() : show(), 1000);
  };
  countdown();
  return runtime.cleanup;
}

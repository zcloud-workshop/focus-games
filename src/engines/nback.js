export function makeChannel({ values, n, count, matchRate = 0.35, random = Math.random }) {
  const sequence = [];
  for (let index = 0; index < n + count; index++) {
    const previous = index >= n ? sequence[index - n] : undefined;
    const match = index >= n && random() < matchRate;
    const choices = match ? [previous] : values.filter((value) => value !== previous);
    sequence.push(choices[Math.floor(random() * choices.length)]);
  }
  return sequence;
}
export function scoreChannel(sequence, n, responses, omissionsAreNo = false) {
  const result = { hit: 0, miss: 0, falseAlarm: 0, correctRejection: 0, omitted: 0 };
  for (let index = n; index < sequence.length; index++) {
    const target = sequence[index] === sequence[index - n];
    const answer = responses[index];
    if (answer == null && !omissionsAreNo) { result.omitted++; continue; }
    if (target && answer === true) result.hit++;
    else if (target) result.miss++;
    else if (answer === true) result.falseAlarm++;
    else result.correctRejection++;
  }
  return result;
}
export function correctCount(stats) { return stats.hit + stats.correctRejection; }

import { createAudio } from './audio.js';
import { createRuntime } from './runtime.js';

const tones = [220, 277.18, 329.63, 392];
const timbres = [
  [{ type: 'sine', harmonic: 1, gain: 0.07 }, { type: 'sine', harmonic: 2, gain: 0.025 }, { type: 'sine', harmonic: 3, gain: 0.01 }],
  [{ type: 'sawtooth', harmonic: 1, gain: 0.04 }, { type: 'square', harmonic: 2, gain: 0.012 }],
  [{ type: 'sawtooth', harmonic: 1, gain: 0.03 }, { type: 'triangle', harmonic: 2, gain: 0.025 }],
  [{ type: 'sine', harmonic: 1, gain: 0.075 }, { type: 'sine', harmonic: 2, gain: 0.006 }],
];
const tileSymbols = ['○','△','□','◇','⬡','＋','✕','☆'];
export function playStimulus(audio, value, kind) {
  if (kind === 'timbre') {
    for (const partial of timbres[value]) audio.tone({ frequency: 261.63 * partial.harmonic, type: partial.type, gain: partial.gain, duration: 0.65 });
  } else audio.tone({ frequency: tones[value], duration: 0.5 });
}

export function mountTimed({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis, kind }) {
  const runtime = createRuntime({ onFinish, clock });
  const audio = createAudio();
  const dual = kind === 'dual';
  const letters = mode.id === 'position-letter' || mode.id === 'tutorial';
  const tiles = mode.id === 'tile-tone';
  const n = settings.n, count = settings.count, interval = settings.interval;
  const visual = dual ? makeChannel({ values: Array.from({ length: tiles ? 8 : 9 }, (_, i) => i), n, count, random }) : [];
  const sounds = makeChannel({ values: [0, 1, 2, 3], n, count, random });
  const responses = [Array(n + count).fill(null), Array(n + count).fill(null)];
  let index = -1, phase = 'ready';
  const speech = globalThis.speechSynthesis;
  const end = () => {
    phase = 'finished';
    const channels = dual ? [scoreChannel(visual, n, responses[0], true), scoreChannel(sounds, n, responses[1], true)] : [scoreChannel(sounds, n, responses[1])];
    const correct = channels.reduce((sum, item) => sum + correctCount(item), 0);
    const accuracy = correct / (count * channels.length) * 100;
    audio.close();
    if (letters) speech?.cancel();
    runtime.finish({ value: accuracy, detail: `正确率 ${Math.round(accuracy)}%`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: 'mixed', endReason: 'completed', scored: mode.scored !== false, rankEligible: !dual || (n >= 2 && count >= 20 && accuracy >= 80 && mode.id !== 'tutorial'), metrics: { correct, total: count * channels.length, visual: dual ? channels[0] : undefined, sound: channels.at(-1) } });
  };
  const show = () => {
    index++;
    if (index === n + count) { end(); return; }
    phase = 'trial';
    const warmup = index < n;
    const visualMarkup = !dual ? '<div class="stimulus">听</div>' : tiles ? `<div class="stimulus">${tileSymbols[visual[index]]}</div>` : `<div class="play-grid sequence-grid" style="--columns:3;max-width:240px;margin:auto">${Array.from({ length: 9 }, (_, i) => `<div class="play-cell ${i === visual[index] ? 'lit' : ''}"></div>`).join('')}</div>`;
    root.innerHTML = `<div class="game-status"><span>${warmup ? '观察与聆听' : `第 ${index - n + 1} / ${count} 题`}</span><span>${n}-Back</span></div>${visualMarkup}<p class="stage-note">${warmup ? '先记住刺激' : dual ? '匹配时分别选择, 没有匹配则等待' : '判断声音与之前是否相同'}</p><div class="answer-options">${dual ? `<button type="button" class="answer-button" data-response="visual" ${warmup ? 'disabled' : ''}>${tiles ? '图形' : '位置'}匹配 (A)</button><button type="button" class="answer-button" data-response="sound" ${warmup ? 'disabled' : ''}>声音匹配 (L)</button>` : `<button type="button" class="answer-button" data-response="same" ${warmup ? 'disabled' : ''}>相同</button><button type="button" class="answer-button" data-response="different" ${warmup ? 'disabled' : ''}>不同</button>`}</div>`;
    if (letters) {
      speech.cancel();
      const utterance = new SpeechSynthesisUtterance(['C','H','K','R'][sounds[index]]);
      utterance.lang = 'en-US';
      speech.speak(utterance);
    } else playStimulus(audio, sounds[index], kind === 'timbre' ? 'timbre' : 'tone');
    runtime.later(show, interval);
  };
  const respond = (value) => {
    if (phase !== 'trial' || index < n) return;
    if (dual) {
      const channel = value === 'visual' ? 0 : value === 'sound' ? 1 : -1;
      if (channel < 0 || responses[channel][index] !== null) return;
      responses[channel][index] = true;
      root.querySelector(`[data-response="${value}"]`).disabled = true;
    } else {
      if (!['same', 'different'].includes(value) || responses[1][index] !== null) return;
      responses[1][index] = value === 'same';
      root.querySelectorAll('[data-response]').forEach((button) => { button.disabled = true; });
    }
  };
  runtime.listen(root, 'click', async (event) => {
    const preview = event.target.closest('[data-preview]');
    if (preview && phase === 'ready') {
      try { await audio.enable(); if (runtime.active) playStimulus(audio, Number(preview.dataset.preview), 'timbre'); }
      catch { root.querySelector('[data-error]').textContent = '声音无法启用, 请检查设备设置.'; }
      return;
    }
    if (event.target.closest('[data-start]') && phase === 'ready') {
      phase = 'starting';
      try {
        if (letters && (!speech || !globalThis.SpeechSynthesisUtterance)) throw new Error('语音不可用');
        await audio.enable();
        if (runtime.active) show();
      } catch { if (runtime.active) { phase = 'ready'; root.querySelector('[data-error]').textContent = '声音无法启用, 请检查设备设置.'; } }
      return;
    }
    const button = event.target.closest('[data-response]');
    if (button) respond(button.dataset.response);
  });
  runtime.listen(document, 'keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (dual && (key === 'a' || key === 'l')) { event.preventDefault(); respond(key === 'a' ? 'visual' : 'sound'); }
  });
  root.innerHTML = `<p class="stage-note">请开启设备声音. ${mode.id === 'tutorial' ? '本练习约 30 秒, 不计分.' : ''}</p>${kind === 'timbre' ? `<div class="answer-options">${['键盘音色', '铜管音色', '弦乐音色', '长笛音色'].map((name, i) => `<button type="button" class="answer-button" data-preview="${i}">试听${name}</button>`).join('')}</div>` : ''}<p class="stage-note" data-error role="alert"></p><button class="button primary centered" type="button" data-start>启用声音并开始</button>`;
  return () => { phase = 'closed'; runtime.cleanup(); audio.close(); if (letters) speech?.cancel(); };
}

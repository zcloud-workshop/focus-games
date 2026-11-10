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
export function uniformChannel(values, length, random = Math.random) { return Array.from({ length }, () => values[Math.floor(random() * values.length)]); }
export function scoreChannel(sequence, n, responses, omissionsAreNo = false) {
  const result = { hit: 0, miss: 0, falseAlarm: 0, correctRejection: 0, omitted: 0 };
  for (let index = n; index < sequence.length; index++) {
    const target = sequence[index] === sequence[index - n];
    const answer = responses[index];
    if (answer == null && !omissionsAreNo) { result.omitted++; if (target) result.miss++; continue; }
    if (target && answer === true) result.hit++;
    else if (target) result.miss++;
    else if (answer === true) result.falseAlarm++;
    else result.correctRejection++;
  }
  return result;
}
export function correctCount(stats) { return stats.hit + stats.correctRejection; }
export function jointCorrectCount(visual, sounds, n, responses, visualOn, soundOn, count) {
  return Array.from({ length: count }, (_, offset) => {
    const index = offset + n;
    return (!visualOn || (responses[0][index] === true) === (visual[index] === visual[index - n]))
      && (!soundOn || (responses[1][index] === true) === (sounds[index] === sounds[index - n]));
  }).filter(Boolean).length;
}

import { shuffle } from '../core.js';
import { createAudio } from './audio.js';
import { createRuntime, inputTime, trackInputs } from './runtime.js';
import { presentOnFrame } from './trials.js';

const tones = [220, 277.18, 329.63, 392];
const timbres = [
  [{ type: 'sine', harmonic: 1, gain: 0.07 }, { type: 'sine', harmonic: 2, gain: 0.025 }, { type: 'sine', harmonic: 3, gain: 0.01 }],
  [{ type: 'sawtooth', harmonic: 1, gain: 0.04 }, { type: 'square', harmonic: 2, gain: 0.012 }],
  [{ type: 'sawtooth', harmonic: 1, gain: 0.03 }, { type: 'triangle', harmonic: 2, gain: 0.025 }],
  [{ type: 'sine', harmonic: 1, gain: 0.075 }, { type: 'sine', harmonic: 2, gain: 0.006 }],
];
const tileSymbols = ['○','△','□','◇','⬡','＋','✕','☆'];
export function makeLetterSet(random = Math.random) { return shuffle([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], random).slice(0, 8); }
export function localEnglishVoice(voices) { return voices.find((voice) => voice.localService === true && /^en(?:-|$)/i.test(voice.lang)); }
export function tileMarkup(index) { return `<svg role="img" aria-label="牌面 ${index + 1}" width="100" height="125" viewBox="0 0 100 125"><rect x="4" y="4" width="92" height="117" rx="12" fill="white" stroke="#555" stroke-width="3"/><text x="50" y="79" text-anchor="middle" font-size="51" fill="#245db0">${tileSymbols[index]}</text></svg>`; }
export function playStimulus(audio, value, kind, sourceA = false) {
  if (kind === 'timbre') {
    for (const partial of timbres[value]) audio.tone({ frequency: 261.63 * partial.harmonic, type: partial.type, gain: partial.gain, duration: 0.65 });
  } else audio.tone({ frequency: sourceA ? [400, 500, 600, 700][value] : tones[value], duration: sourceA ? 0.4 : 0.5 });
}

export function mountTimed({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis, kind }) {
  const runtime = createRuntime({ onFinish, clock });
  const audio = createAudio();
  const dual = kind === 'dual';
  const letters = ['position-letter', 'letter-only'].includes(mode.id);
  const tiles = mode.id === 'tile-tone';
  const reference = ['position-letter', 'position-only', 'letter-only', 'tile-tone'].includes(mode.id);
  const sourceA = mode.id === 'position-tone' || !dual;
  const visualOn = dual && mode.id !== 'letter-only';
  const soundOn = mode.id !== 'position-only';
  const n = settings.n, count = settings.count - n, interval = settings.interval;
  const visualValues = Array.from({ length: tiles ? 8 : 9 }, (_, i) => i);
  const visual = visualOn ? sourceA ? uniformChannel(visualValues, n + count, random) : makeChannel({ values: visualValues, n, count, matchRate: 0.2 + 0.8 / visualValues.length, random }) : [];
  const soundLetters = letters ? makeLetterSet(random) : [];
  const soundValues = letters ? Array.from({ length: 8 }, (_, i) => i) : [0, 1, 2, 3];
  const sounds = soundOn ? sourceA ? uniformChannel(soundValues, n + count, random) : makeChannel({ values: soundValues, n, count, matchRate: 0.2 + 0.8 / soundValues.length, random }) : [];
  const responses = [Array(n + count).fill(null), Array(n + count).fill(null)];
  const responseTimes = [Array(n + count).fill(null), Array(n + count).fill(null)];
  const presentedAt = [], durations = [], visualDurations = [], speechEnded = [];
  const usedInputs = new Set();
  let index = -1, phase = 'ready', voice;
  const speech = globalThis.speechSynthesis;
  const failSound = (message) => {
    if (!runtime.active) return;
    phase = 'error';
    runtime.cleanup();
    audio.close();
    if (letters) speech?.cancel();
    root.innerHTML = `<p class="stage-note" role="alert">${message} 本轮未计分, 请返回设置重试或选择音调模式.</p>`;
  };
  const end = () => {
    phase = 'finished';
    const visualStats = visualOn ? scoreChannel(visual, n, responses[0], true) : null;
    const soundStats = soundOn ? scoreChannel(sounds, n, responses[1], dual) : null;
    const channels = [visualStats, soundStats].filter(Boolean);
    const correct = reference ? jointCorrectCount(visual, sounds, n, responses, visualOn, soundOn, count) : dual ? visualStats.hit + soundStats.hit : correctCount(soundStats);
    const total = reference ? count : dual ? count * 2 : count - soundStats.omitted;
    const accuracy = total ? Math.round(correct / total * 100) : null;
    audio.close();
    if (letters) speech?.cancel();
    const metrics = { 正确: correct, 总判断数: total };
    for (const [label, channel] of [['视觉', visualStats], ['声音', soundStats]].filter(([, item]) => item)) {
      metrics[`${label}命中`] = channel.hit;
      metrics[`${label}漏报`] = channel.miss;
      metrics[`${label}误报`] = channel.falseAlarm;
      metrics[`${label}正确拒绝`] = channel.correctRejection;
      metrics[`${label}漏答`] = channel.omitted;
    }
    const trials = Array.from({ length: count }, (_, offset) => {
      const i = offset + n;
      return { index: offset + 1, presentedAt: presentedAt[i], durationMs: durations[i], ...(visualOn ? { visual: visual[i], visualDurationMs: visualDurations[i], visualTarget: visual[i] === visual[i - n], visualResponse: responses[0][i] === true, visualResponseMs: responseTimes[0][i] } : {}), ...(soundOn ? { sound: sounds[i], soundTarget: sounds[i] === sounds[i - n], soundResponse: responses[1][i], soundResponseMs: responseTimes[1][i] } : {}) };
    });
    const input = usedInputs.size > 1 ? 'mixed' : [...usedInputs][0] ?? 'unknown';
    runtime.finish({ value: accuracy, detail: accuracy == null ? '没有有效作答, 本轮不计分' : `正确率 ${accuracy}%`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input, endReason: 'completed', scored: mode.scored !== false && accuracy != null, rankEligible: dual ? mode.id === 'position-letter' && n >= 2 && settings.count >= 20 && accuracy >= 80 : false, metrics, trials });
  };
  const show = () => {
    const next = index + 1;
    phase = 'transition';
    presentOnFrame(runtime, () => {
      if (next === n + count) { root.innerHTML = ''; return; }
      const warmup = next < n;
      const visualMarkup = !visualOn ? '<div class="stimulus">听</div>' : tiles ? `<div class="stimulus">${tileMarkup(visual[next])}</div>` : `<div class="play-grid sequence-grid" style="--columns:3;max-width:240px;margin:auto">${Array.from({ length: 9 }, (_, i) => `<div class="play-cell ${i === visual[next] ? 'lit' : ''}"></div>`).join('')}</div>`;
      root.innerHTML = `<div class="game-status"><span>${warmup ? '观察与聆听' : `第 ${next - n + 1} / ${count} 题`}</span><span>${n}-Back</span></div>${visualMarkup}<p class="stage-note">${warmup ? '先记住刺激' : dual ? '匹配时分别选择, 没有匹配则等待' : '判断声音与之前是否相同'}</p><div class="answer-options">${dual ? `${visualOn ? `<button type="button" class="answer-button" data-response="visual" ${warmup ? 'disabled' : ''}>${tiles ? '牌面' : '位置'}匹配 (A)</button>` : ''}${soundOn ? `<button type="button" class="answer-button" data-response="sound" ${warmup ? 'disabled' : ''}>声音匹配 (L)</button>` : ''}` : `<button type="button" class="answer-button" data-response="same" ${warmup ? 'disabled' : ''}>相同</button><button type="button" class="answer-button" data-response="different" ${warmup ? 'disabled' : ''}>不同</button>`}</div>`;
    }, (timestamp) => {
      if (index >= 0) {
        durations[index] = timestamp - presentedAt[index];
        if (letters && !speechEnded[index]) { failSound('本地语音未在响应窗口内正常播放.'); return; }
      }
      index = next;
      if (index === n + count) { end(); return; }
      presentedAt[index] = timestamp;
      phase = 'trial';
      if (sourceA && dual) {
        const current = index;
        runtime.later(() => {
          if (phase !== 'trial' || index !== current) return;
          presentOnFrame(runtime, () => root.querySelectorAll('.play-cell.lit').forEach((cell) => cell.classList.remove('lit')), (hiddenAt) => { visualDurations[current] = hiddenAt - presentedAt[current]; });
        }, 500);
      }
      try {
        if (letters) {
          const current = index;
          const utterance = new SpeechSynthesisUtterance(soundLetters[sounds[index]]);
          utterance.lang = voice.lang;
          utterance.voice = voice;
          utterance.onend = () => { speechEnded[current] = true; };
          utterance.onerror = () => { if (runtime.active && index === current && phase === 'trial') failSound('本地语音播放失败.'); };
          speech.speak(utterance);
        } else if (soundOn) playStimulus(audio, sounds[index], kind === 'timbre' ? 'timbre' : 'tone', sourceA);
        runtime.later(show, interval);
      } catch { failSound('声音播放失败.'); }
    });
  };
  const respond = (value, input, timestamp) => {
    if (phase !== 'trial' || index < n) return;
    if (dual) {
      const channel = value === 'visual' ? 0 : value === 'sound' ? 1 : -1;
      if (channel < 0 || (channel === 0 && !visualOn) || (channel === 1 && !soundOn) || responses[channel][index] !== null) return;
      responses[channel][index] = true;
      responseTimes[channel][index] = Math.max(0, timestamp - presentedAt[index]);
      root.querySelector(`[data-response="${value}"]`).disabled = true;
    } else {
      if (!['same', 'different'].includes(value) || responses[1][index] !== null) return;
      responses[1][index] = value === 'same';
      responseTimes[1][index] = Math.max(0, timestamp - presentedAt[index]);
      root.querySelectorAll('[data-response]').forEach((button) => { button.disabled = true; });
    }
    usedInputs.add(input);
  };
  runtime.listen(root, 'pointerdown', (event) => {
    const button = event.target.closest('[data-response]');
    if (button && !button.disabled) respond(button.dataset.response, event.pointerType === 'touch' ? 'touch' : 'pointer', inputTime(event, runtime.now));
  });
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
        if (letters) {
          if (!speech || !globalThis.SpeechSynthesisUtterance || !(voice = localEnglishVoice(speech.getVoices()))) throw new Error('本地英文语音不可用, 请返回设置选择音调模式.');
        }
        if (soundOn) await audio.enable();
        if (runtime.active) show();
      } catch (error) { if (runtime.active) { phase = 'ready'; root.querySelector('[data-error]').textContent = error.message || '声音无法启用, 请检查设备设置.'; } }
      return;
    }
    const button = event.target.closest('[data-response]');
    if (button && event.detail === 0) respond(button.dataset.response, 'keyboard', inputTime(event, runtime.now));
  });
  runtime.listen(document, 'keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (dual && (key === 'a' || key === 'l')) { event.preventDefault(); respond(key === 'a' ? 'visual' : 'sound', 'keyboard', inputTime(event, runtime.now)); }
  });
  if (letters && speech) runtime.listen(speech, 'voiceschanged', () => {
    if (phase === 'ready' && localEnglishVoice(speech.getVoices())) root.querySelector('[data-error]').textContent = '本地语音已就绪, 可开始.';
  });
  root.innerHTML = `<p class="stage-note">请开启设备声音. ${mode.id === 'tutorial' ? '本练习约 30 秒, 不计分.' : ''}</p>${kind === 'timbre' ? `<div class="answer-options">${['键盘音色', '铜管音色', '弦乐音色', '长笛音色'].map((name, i) => `<button type="button" class="answer-button" data-preview="${i}">试听${name}</button>`).join('')}</div>` : ''}<p class="stage-note" data-error role="alert"></p><button class="button primary centered" type="button" data-start>启用声音并开始</button>`;
  return () => { phase = 'closed'; runtime.cleanup(); audio.close(); if (letters) speech?.cancel(); };
}

export function mountTutorial({ root, mode, preset, settings, onFinish, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const audio = createAudio();
  const speech = globalThis.speechSynthesis;
  const input = trackInputs();
  const steps = [
    { name: '第一步: 位置', instruction: '比较方格位置. 位置相同时按位置匹配.', baseline: { position: 0, letter: 'C' }, cue: { position: 0, letter: 'H' }, expected: ['visual'] },
    { name: '第二步: 声音', instruction: '比较字母声音. 声音相同时按声音匹配.', baseline: { position: 0, letter: 'C' }, cue: { position: 1, letter: 'C' }, expected: ['sound'] },
    { name: '第三步: 同时判断', instruction: '位置和声音都相同, 请分别按两个按钮.', baseline: { position: 0, letter: 'C' }, cue: { position: 0, letter: 'C' }, expected: ['visual', 'sound'] },
  ];
  const trials = [];
  let phase = 'ready', stage = -1, voice, spoken = false;
  const fail = () => {
    if (!runtime.active) return;
    phase = 'error'; runtime.cleanup(); audio.close(); speech?.cancel();
    root.innerHTML = '<p class="stage-note" role="alert">本地语音播放失败, 本轮未计分. 请返回设置重试或选择音调模式.</p>';
  };
  const speak = (letter) => {
    spoken = false;
    const utterance = new SpeechSynthesisUtterance(letter);
    utterance.lang = voice.lang; utterance.voice = voice;
    utterance.onend = () => { spoken = true; };
    utterance.onerror = () => { if (runtime.active && phase !== 'finished') fail(); };
    try { speech.speak(utterance); } catch { fail(); }
  };
  const draw = (step, stimulus, hint, enabled) => {
    root.innerHTML = `<div class="game-status"><span>${step.name}</span><span>${stage + 1} / 3</span></div><p class="stage-note">${step.instruction}</p><div class="play-grid sequence-grid" style="--columns:3;max-width:240px;margin:auto">${Array.from({ length: 9 }, (_, i) => `<div class="play-cell ${i === stimulus.position ? 'lit' : ''}"></div>`).join('')}</div><p class="stage-note" data-feedback role="status">${hint}</p><div class="answer-options"><button type="button" class="answer-button" data-response="visual" ${enabled ? '' : 'disabled'}>位置匹配 (A)</button><button type="button" class="answer-button" data-response="sound" ${enabled ? '' : 'disabled'}>声音匹配 (L)</button></div>`;
  };
  const showStage = () => {
    stage++;
    if (stage === steps.length) {
      phase = 'finished'; audio.close(); speech.cancel();
      runtime.finish({ value: 0, detail: '已完成双通道引导练习, 本轮不计分.', mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: input.value, endReason: 'completed', scored: false, metrics: { 完成阶段: trials.filter((trial) => trial.correct).length }, trials });
      return;
    }
    const step = steps[stage];
    const trial = { stage: stage + 1, expected: step.expected, responses: [] };
    trials.push(trial);
    phase = 'baseline';
    presentOnFrame(runtime, () => draw(step, step.baseline, '先记住这一位置和声音.', false), (timestamp) => {
      trial.baselineAt = timestamp;
      speak(step.baseline.letter);
      runtime.later(() => {
        if (!spoken) { fail(); return; }
        phase = 'transition';
        presentOnFrame(runtime, () => draw(step, step.cue, '现在与刚才比较, 然后选择.', true), (shownAt) => {
          trial.presentedAt = shownAt;
          phase = 'answer';
          speak(step.cue.letter);
          runtime.later(() => {
            if (!spoken) { fail(); return; }
            phase = 'transition';
            presentOnFrame(runtime, () => {}, (endedAt) => {
              trial.durationMs = endedAt - shownAt;
              trial.correct = step.expected.every((channel) => trial.responses.includes(channel));
              showStage();
            });
          }, 8000);
        });
      }, 2000);
    });
  };
  const respond = (channel, event) => {
    if (phase !== 'answer') return;
    input.add(event);
    const step = steps[stage], trial = trials[stage];
    const feedback = root.querySelector('[data-feedback]');
    if (!step.expected.includes(channel)) { feedback.textContent = '这一步请按说明判断当前通道.'; return; }
    if (trial.responses.includes(channel)) return;
    trial.responses.push(channel);
    root.querySelector(`[data-response="${channel}"]`).disabled = true;
    feedback.textContent = step.expected.every((expected) => trial.responses.includes(expected)) ? '正确, 请等待下一步.' : '正确, 还需要判断另一通道.';
  };
  runtime.listen(root, 'pointerdown', (event) => {
    const button = event.target.closest('[data-response]');
    if (button && !button.disabled) respond(button.dataset.response, event);
  });
  runtime.listen(root, 'click', async (event) => {
    const button = event.target.closest('[data-response]');
    if (button && event.detail === 0) respond(button.dataset.response, event);
    if (!event.target.closest('[data-start]') || phase !== 'ready') return;
    phase = 'starting';
    try {
      if (!speech || !globalThis.SpeechSynthesisUtterance || !(voice = localEnglishVoice(speech.getVoices()))) throw new Error('本地英文语音不可用, 请返回设置选择音调模式.');
      await audio.enable();
      if (runtime.active) showStage();
    } catch (error) { if (runtime.active) { phase = 'ready'; root.querySelector('[data-error]').textContent = error.message || '声音无法启用.'; } }
  });
  runtime.listen(document, 'keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (key === 'a' || key === 'l') { event.preventDefault(); respond(key === 'a' ? 'visual' : 'sound', event); }
  });
  if (speech) runtime.listen(speech, 'voiceschanged', () => {
    if (phase === 'ready' && localEnglishVoice(speech.getVoices())) root.querySelector('[data-error]').textContent = '本地语音已就绪, 可开始.';
  });
  root.innerHTML = '<p class="stage-note">约 30 秒, 依次练习位置、声音和同时匹配, 本练习不计分.</p><p class="stage-note" data-error role="alert"></p><button class="button primary centered" type="button" data-start>启用声音并开始</button>';
  return () => { phase = 'closed'; runtime.cleanup(); audio.close(); speech?.cancel(); };
}

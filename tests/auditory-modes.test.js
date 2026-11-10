import test from 'node:test';
import assert from 'node:assert/strict';
import { definition as dual } from '../src/games/dual-n-back.js';
import { definition as auditory } from '../src/games/auditory-attention.js';
import { definition as timbre } from '../src/games/timbre-n-back.js';
import { playStimulus, localEnglishVoice, tileMarkup, makeLetterSet } from '../src/engines/nback.js';
test('双通道视觉身份与位置分模式, 练习不计分', () => {
  assert.ok(dual.modes.some((mode) => mode.id === 'tile-tone'));
  assert.ok(dual.modes.some((mode) => mode.id === 'position-letter'));
  const tutorial = dual.modes.find((mode) => mode.id === 'tutorial');
  assert.equal(tutorial.scored, false);
  const { n, count, interval } = tutorial.presets[0].settings;
  assert.equal((n + count) * interval, 30000);
  assert.equal(auditory.modes[0].presets.length, 3);
  assert.equal(timbre.modes[0].presets.length, 3);
});
test('四种音色有不同频谱, 不是仅改变基音', () => {
  const signatures = Array.from({ length: 4 }, (_, index) => {
    const calls = [];
    playStimulus({ tone: (options) => calls.push(options) }, index, 'timbre');
    assert.equal(calls[0].frequency, 261.63);
    return JSON.stringify(calls);
  });
  assert.equal(new Set(signatures).size, 4);
});

test('语音只选择本地英语音源, 牌面身份有八种', () => {
  const voices = [{ localService: false, lang: 'en-US' }, { localService: true, lang: 'zh-CN' }, { localService: true, lang: 'en-GB' }];
  assert.equal(localEnglishVoice(voices), voices[2]);
  assert.equal(localEnglishVoice(voices.slice(0, 2)), undefined);
  assert.equal(new Set(Array.from({ length: 8 }, (_, i) => tileMarkup(i))).size, 8);
});

test('教程逐步要求位置、声音、双通道响应且不计分', async () => {
  const { mountTutorial } = await import('../src/engines/nback.js');
  class Target {
    handlers = {};
    addEventListener(type, fn, options = {}) {
      (this.handlers[type] ??= []).push(fn);
      options.signal?.addEventListener('abort', () => { this.handlers[type] = this.handlers[type].filter((item) => item !== fn); });
    }
    fire(type, event) { return Promise.all((this.handlers[type] ?? []).map((fn) => fn(event))); }
  }
  class Root extends Target {
    nodes = {};
    set innerHTML(value) { this.html = value; this.nodes = {}; }
    get innerHTML() { return this.html; }
    querySelector(selector) { return this.nodes[selector] ??= { textContent: '', disabled: false }; }
  }
  class Clock {
    time = 0; jobs = new Map(); next = 0;
    performance = { now: () => this.time };
    setTimeout = (fn, delay) => { const id = ++this.next; this.jobs.set(id, { at: this.time + delay, fn }); return id; };
    clearTimeout = (id) => this.jobs.delete(id);
    requestAnimationFrame = (fn) => this.setTimeout(() => fn(this.time), 16);
    cancelAnimationFrame = this.clearTimeout;
    advance(to) {
      while (true) {
        const next = [...this.jobs].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > to) break;
        this.jobs.delete(next[0]); this.time = next[1].at; next[1].fn();
      }
      this.time = to;
    }
  }
  class Context { state = 'running'; async close() { this.state = 'closed'; } }
  const old = { document: globalThis.document, speechSynthesis: globalThis.speechSynthesis, SpeechSynthesisUtterance: globalThis.SpeechSynthesisUtterance, AudioContext: globalThis.AudioContext };
  const speech = new Target();
  speech.getVoices = () => [{ localService: true, lang: 'en-US' }];
  speech.speak = (utterance) => utterance.onend();
  speech.cancel = () => {};
  globalThis.document = new Target(); globalThis.speechSynthesis = speech; globalThis.SpeechSynthesisUtterance = class {}; globalThis.AudioContext = Context;
  try {
    const root = new Root(), clock = new Clock();
    const mode = dual.modes.find((item) => item.id === 'tutorial'), preset = mode.presets[0];
    let result;
    mountTutorial({ root, mode, preset, settings: preset.settings, onFinish: (value) => { result = value; }, clock });
    const target = (name) => ({ closest: (selector) => selector === name ? { dataset: { response: name === '[data-response]' ? target.channel : '' }, disabled: false } : null });
    await root.fire('click', { target: target('[data-start]') });
    clock.advance(2100);
    target.channel = 'visual'; await root.fire('pointerdown', { target: target('[data-response]'), pointerType: 'mouse', type: 'pointerdown' });
    assert.match(root.querySelector('[data-feedback]').textContent, /正确/);
    clock.advance(12200);
    target.channel = 'sound'; await root.fire('pointerdown', { target: target('[data-response]'), pointerType: 'touch', type: 'pointerdown' });
    clock.advance(22300);
    target.channel = 'visual'; await root.fire('pointerdown', { target: target('[data-response]'), pointerType: 'mouse', type: 'pointerdown' });
    target.channel = 'sound'; await root.fire('pointerdown', { target: target('[data-response]'), pointerType: 'mouse', type: 'pointerdown' });
    clock.advance(31000);
    assert.equal(result.scored, false);
    assert.equal(result.metrics.完成阶段, 3);
    assert.equal(result.trials.length, 3);
    assert.equal(result.input, 'mixed');
    const stoppedRoot = new Root(), stoppedClock = new Clock();
    let stoppedResult;
    const cleanup = mountTutorial({ root: stoppedRoot, mode, preset, settings: preset.settings, onFinish: (value) => { stoppedResult = value; }, clock: stoppedClock });
    await stoppedRoot.fire('click', { target: target('[data-start]') });
    stoppedClock.advance(100);
    cleanup();
    stoppedClock.advance(60000);
    assert.equal(stoppedResult, undefined);
  } finally { Object.assign(globalThis, old); }
});

test('每局字母集合可复现且含八个不同字母', () => {
  const letters = makeLetterSet(() => 0.25);
  assert.equal(letters.length, 8);
  assert.equal(new Set(letters).size, 8);
  assert.deepEqual(letters, makeLetterSet(() => 0.25));
});

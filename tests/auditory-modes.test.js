import test from 'node:test';
import assert from 'node:assert/strict';
import { definition as dual } from '../src/games/dual-n-back.js';
import { definition as auditory } from '../src/games/auditory-attention.js';
import { definition as timbre } from '../src/games/timbre-n-back.js';
import { playStimulus, localEnglishVoice, tileMarkup } from '../src/engines/nback.js';
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

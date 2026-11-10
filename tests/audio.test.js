import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/engines/audio.js';

class FakeContext {
  state = 'suspended';
  currentTime = 12;
  destination = {};
  oscillators = [];
  gains = [];
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
  createOscillator() {
    const oscillator = { frequency: parameter(), connect() {}, disconnect() { this.disconnected = true; }, start() { this.started = true; }, stop(at) { this.stops.push(at); }, stops: [] };
    this.oscillators.push(oscillator);
    return oscillator;
  }
  createGain() {
    const volume = { gain: parameter(), connect() {}, disconnect() { this.disconnected = true; } };
    this.gains.push(volume);
    return volume;
  }
}
function parameter() {
  return { setValueAtTime(value, time) { this.value = value; this.time = time; }, setTargetAtTime(value) { this.value = value; } };
}

test('用户启用后按音频时钟结束提示音, 关闭时停止所有声音', async () => {
  const audio = createAudio({ AudioContext: FakeContext });
  assert.throws(() => audio.tone(), /启用/);
  await audio.enable();
  audio.tone({ frequency: 523, duration: 0.2 });
  const continuous = audio.continuous({ frequency: 200, gain: 0.01 });
  continuous.set({ frequency: 300, gain: 0.05 });
  assert.deepEqual(audio.context.oscillators[0].stops, [12.2]);
  assert.equal(audio.context.oscillators[1].frequency.value, 300);
  assert.equal(audio.context.gains[1].gain.value, 0.05);
  await audio.close();
  assert.equal(audio.context.state, 'closed');
  assert.ok(audio.context.oscillators.every((item) => item.disconnected));
  await assert.rejects(audio.enable(), /关闭/);
});

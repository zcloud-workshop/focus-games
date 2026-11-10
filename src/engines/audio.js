export function createAudio({ AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext } = {}) {
  let context;
  let closed = false;
  const sounds = new Set();

  const enable = async () => {
    if (closed) throw new Error('声音已关闭');
    if (!AudioContext) throw new Error('此设备不支持声音');
    context ??= new AudioContext();
    if (context.state === 'suspended') await context.resume();
    if (closed || context.state !== 'running') throw new Error('无法启用声音');
  };

  const voice = ({ frequency = 440, type = 'sine', gain = 0.08, duration } = {}) => {
    if (!context || closed || context.state !== 'running') throw new Error('请先启用声音');
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    volume.gain.setValueAtTime(gain, context.currentTime);
    oscillator.connect(volume);
    volume.connect(context.destination);
    let stopped = false;
    const disconnect = () => {
      if (stopped) return;
      stopped = true;
      oscillator.disconnect();
      volume.disconnect();
      sounds.delete(stop);
    };
    const stop = () => {
      if (stopped) return;
      oscillator.stop();
      disconnect();
    };
    oscillator.onended = disconnect;
    sounds.add(stop);
    oscillator.start();
    if (duration !== undefined) oscillator.stop(context.currentTime + duration);
    return {
      set: ({ frequency: nextFrequency, gain: nextGain }) => {
        if (stopped) return;
        if (nextFrequency !== undefined) oscillator.frequency.setTargetAtTime(nextFrequency, context.currentTime, 0.02);
        if (nextGain !== undefined) volume.gain.setTargetAtTime(nextGain, context.currentTime, 0.02);
      },
      stop,
    };
  };

  const tone = ({ duration = 0.15, ...options } = {}) => voice({ ...options, duration });
  const continuous = (options) => voice(options);
  const close = () => {
    if (closed) return;
    closed = true;
    for (const stop of sounds) stop();
    if (context && context.state !== 'closed') return context.close();
  };

  return { enable, tone, continuous, close, get context() { return context; } };
}

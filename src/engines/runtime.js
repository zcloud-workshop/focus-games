export function createRuntime({ onFinish, clock = globalThis } = {}) {
  const controller = new AbortController();
  const timers = new Set();
  const frames = new Set();
  const now = () => clock.performance.now();
  const started = now();
  let active = true;

  const cleanup = () => {
    if (!active) return;
    active = false;
    controller.abort();
    for (const timer of timers) clock.clearTimeout(timer);
    for (const frame of frames) clock.cancelAnimationFrame(frame);
    timers.clear();
    frames.clear();
  };
  const later = (callback, delay) => {
    if (!active) return;
    const timer = clock.setTimeout(() => {
      timers.delete(timer);
      if (active) callback();
    }, delay);
    timers.add(timer);
    return timer;
  };
  const cancel = (timer) => {
    clock.clearTimeout(timer);
    timers.delete(timer);
  };
  const frame = (callback) => {
    if (!active) return;
    const id = clock.requestAnimationFrame((timestamp) => {
      frames.delete(id);
      if (active) callback(timestamp);
    });
    frames.add(id);
    return id;
  };
  const listen = (target, type, callback, options = {}) => {
    if (!active) return;
    target.addEventListener(type, callback, { ...options, signal: controller.signal });
  };
  const finish = (result) => {
    if (!active) return;
    const duration = Number.isFinite(result.duration) && result.duration >= 0 ? result.duration : (now() - started) / 1000;
    cleanup();
    onFinish({ ...result, duration });
  };
  return { now, later, cancel, frame, listen, finish, cleanup, get active() { return active; } };
}

export function inputTime(event, now) {
  return Number.isFinite(event.timeStamp) && event.timeStamp >= 0 ? event.timeStamp : now();
}

export function inputMethod(event) {
  if (!event || ['input', 'change', 'submit', 'compositionstart', 'compositionend'].includes(event.type) || event.isComposing || event.keyCode === 229) return 'unknown';
  if (event.type?.startsWith('key') || (event.type === 'click' && event.detail === 0)) return 'keyboard';
  return event.pointerType === 'touch' ? 'touch' : 'pointer';
}

export function trackInputs() {
  const methods = new Set();
  return {
    add(eventOrMethod) { methods.add(typeof eventOrMethod === 'string' ? eventOrMethod : inputMethod(eventOrMethod)); },
    get value() {
      const known = [...methods].filter((method) => method !== 'unknown');
      return known.length > 1 ? 'mixed' : methods.has('unknown') || !known.length ? 'unknown' : known[0];
    },
  };
}

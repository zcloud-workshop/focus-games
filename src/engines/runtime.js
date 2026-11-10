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
    const id = clock.requestAnimationFrame((timestamp) => {
      frames.delete(id);
      if (active) callback(timestamp);
    });
    frames.add(id);
    return id;
  };
  const listen = (target, type, callback, options = {}) => {
    target.addEventListener(type, callback, { ...options, signal: controller.signal });
  };
  const finish = (result) => {
    if (!active) return;
    const duration = (now() - started) / 1000;
    cleanup();
    onFinish({ ...result, duration });
  };
  return { now, later, cancel, frame, listen, finish, cleanup, get active() { return active; } };
}

export function inputTime(event, now) {
  return Number.isFinite(event.timeStamp) && event.timeStamp >= 0 ? event.timeStamp : now();
}

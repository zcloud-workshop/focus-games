export function advanceParticle(particle, seconds) {
  let { x, y, vx, vy } = particle;
  x += vx * seconds;
  y += vy * seconds;
  while (x < 0 || x > 1) { x = x < 0 ? -x : 2 - x; vx = -vx; }
  while (y < 0 || y > 1) { y = y < 0 ? -y : 2 - y; vy = -vy; }
  return { ...particle, x, y, vx, vy };
}

export const RINGS = [
  { count: 6, inner: 7, outer: 19, period: 20, direction: 1, offset: 4 },
  { count: 12, inner: 20, outer: 34, period: 26, direction: -1, offset: 12 },
  { count: 24, inner: 35, outer: 48, period: 33, direction: 1, offset: 21 },
];

export const ringRotation = (ring, seconds) => (seconds + RINGS[ring].offset) / RINGS[ring].period * 360 * RINGS[ring].direction;

export function animate(runtime, update) {
  let previous = runtime.now();
  const tick = (at) => {
    const seconds = Math.max(0, (at - previous) / 1000);
    previous = at;
    update(seconds, at);
    runtime.frame(tick);
  };
  runtime.frame(tick);
}

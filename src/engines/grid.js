import { shuffle } from '../core.js';

const linear = (v) => v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92;
const encode = (v) => Math.round(255 * Math.max(0, Math.min(1, v > 0.0031308 ? 1.055 * v ** (1 / 2.4) - 0.055 : 12.92 * v)));
const f = (v) => v > 216 / 24389 ? Math.cbrt(v) : v * 841 / 108 + 4 / 29;
const inverseF = (v) => v > 6 / 29 ? v ** 3 : (v - 4 / 29) * 108 / 841;

export function rgbToLab(rgb) {
  const [r, g, b] = rgb.map((v) => linear(v / 255));
  const x = f((r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047);
  const y = f(r * 0.2126729 + g * 0.7151522 + b * 0.072175);
  const z = f((r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export function labToRgb([l, a, b]) {
  const y = (l + 16) / 116;
  const x = 0.95047 * inverseF(y + a / 500);
  const yy = inverseF(y);
  const z = 1.08883 * inverseF(y - b / 200);
  return [encode(x * 3.2404542 - yy * 1.5371385 - z * 0.4985314), encode(-x * 0.969266 + yy * 1.8760108 + z * 0.041556), encode(x * 0.0556434 - yy * 0.2040259 + z * 1.0572252)];
}

export const deltaE = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));

export function colorPair(difference, random = Math.random) {
  const base = labToRgb([45 + random() * 15, random() * 30 - 15, random() * 30 - 15]);
  const lab = rgbToLab(base);
  const target = labToRgb([lab[0] + difference, lab[1], lab[2]]);
  return { base, target, delta: deltaE(rgbToLab(base), rgbToLab(target)) };
}

export const rgb = (value) => `rgb(${value.join(' ')})`;

export function scatter(count, random = Math.random, columns = 5) {
  const rows = Math.ceil(count / columns);
  return shuffle(Array.from({ length: columns * rows }, (_, i) => ({ x: (i % columns + 0.5) / columns, y: (Math.floor(i / columns) + 0.5) / rows })), random).slice(0, count).map(({ x, y }) => ({ x: x + (random() - 0.5) * 0.24 / columns, y: y + (random() - 0.5) * 0.24 / rows }));
}

export function trailSequence(part) {
  return part === 'A' ? Array.from({ length: 25 }, (_, i) => String(i + 1)) : Array.from({ length: 25 }, (_, i) => i % 2 ? String.fromCharCode(65 + (i - 1) / 2) : String(i / 2 + 1));
}

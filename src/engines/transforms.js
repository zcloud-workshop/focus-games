export function mirrorGrid(cells, width) {
  return cells.map((_, index) => cells[Math.floor(index / width) * width + width - 1 - index % width]);
}

export function normalizeShape(points) {
  const minX = Math.min(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  return points.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

export function rotateShape(points, turns = 1) {
  let result = points;
  for (let i = 0; i < turns; i++) result = result.map(([x, y]) => [-y, x]);
  return normalizeShape(result);
}

export function reflectShape(points) {
  return normalizeShape(points.map(([x, y]) => [-x, y]));
}

export function rotationsMatch(left, right) {
  const target = JSON.stringify(normalizeShape(right));
  return [0, 1, 2, 3].some((turns) => JSON.stringify(rotateShape(left, turns)) === target);
}
import { shuffle } from '../core.js';


export function rotationQuestion(shape, random = Math.random) {
  const correct = rotateShape(shape, Math.floor(random() * 4));
  const choices = shuffle([correct, ...[0, 1, 2].map((turns) => rotateShape(reflectShape(shape), turns))], random);
  return { shape: normalizeShape(shape), choices, answer: choices.indexOf(correct) };
}

export function rotationShape(size, count, random = Math.random) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const cells = new Set([Math.floor(random() * size * size)]);
    while (cells.size < count) {
      const frontier = new Set();
      for (const cell of cells) {
        const row = Math.floor(cell / size);
        const col = cell % size;
        for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && c >= 0 && r < size && c < size && !cells.has(r * size + c)) frontier.add(r * size + c);
        }
      }
      const choices = [...frontier];
      cells.add(choices[Math.floor(random() * choices.length)]);
    }
    const shape = normalizeShape([...cells].map((cell) => [cell % size, Math.floor(cell / size)]));
    const rotations = new Set([0, 1, 2, 3].map((turns) => JSON.stringify(rotateShape(shape, turns))));
    if (rotations.size === 4 && !rotationsMatch(shape, reflectShape(shape))) return shape;
  }
  return null;
}

export function unfoldHole(hole, folds) {
  let points = [hole];
  for (const { axis, line } of [...folds].reverse()) {
    points = [...points, ...points.map(([x, y]) => axis === 'x' ? [2 * line - 1 - x, y] : [x, 2 * line - 1 - y])];
  }
  return [...new Map(points.map((point) => [point.join(','), point])).values()].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

export function matrixQuestion(attributes, complex = false, random = Math.random) {
  const maps = Array.from({ length: attributes }, () => shuffle([0, 1, 2], random));
  const cells = Array.from({ length: 9 }, (_, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return maps.map((map, attribute) => map[(row + col * (complex && attribute % 2 ? 2 : 1)) % 3]);
  });
  const correct = cells[8];
  const options = [correct, ...Array.from({ length: 3 }, (_, index) => correct.map((value, attribute) => attribute === index % attributes ? (value + 1 + Math.floor(index / attributes)) % 3 : value))];
  const choices = shuffle(options, random);
  return { cells, choices, answer: choices.indexOf(correct) };
}

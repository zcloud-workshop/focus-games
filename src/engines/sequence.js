import { shuffle } from '../core.js';

export function randomDigits(length, random = Math.random) {
  return Array.from({ length }, () => Math.floor(random() * 10)).join('');
}

export function uniquePositions(size, count, random = Math.random) {
  return shuffle(Array.from({ length: size * size }, (_, index) => index), random).slice(0, count);
}

export function rotatePosition(index, size, turns) {
  let row = Math.floor(index / size);
  let column = index % size;
  for (let turn = 0; turn < turns; turn++) [row, column] = [column, size - 1 - row];
  return row * size + column;
}

export function makePath(size, length, random = Math.random, startPosition) {
  let position = startPosition ?? Math.floor(random() * size * size);
  const start = position;
  const steps = [];
  for (let index = 0; index < length; index++) {
    const row = Math.floor(position / size);
    const column = position % size;
    const options = [[-1, 0, '上'], [1, 0, '下'], [0, -1, '左'], [0, 1, '右']].filter(([dr, dc]) => row + dr >= 0 && row + dr < size && column + dc >= 0 && column + dc < size);
    const [dr, dc, label] = options[Math.floor(random() * options.length)];
    position = (row + dr) * size + column + dc;
    steps.push(label);
  }
  return { start, steps, end: position };
}

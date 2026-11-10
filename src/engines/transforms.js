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

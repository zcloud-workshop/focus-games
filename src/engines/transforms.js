export function mirrorGrid(cells, width) {
  return cells.map((_, index) => cells[Math.floor(index / width) * width + width - 1 - index % width]);
}

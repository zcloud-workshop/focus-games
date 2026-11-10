export function mergeLine(line) {
  const values = line.filter(Boolean);
  const merged = [];
  let score = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] === values[i + 1]) {
      const value = values[i] * 2;
      merged.push(value);
      score += value;
      i++;
    } else merged.push(values[i]);
  }
  while (merged.length < line.length) merged.push(0);
  return { line: merged, score };
}

export function moveMerge(board, direction, size = 4) {
  const next = [...board];
  let score = 0;
  for (let row = 0; row < size; row++) {
    const indices = Array.from({ length: size }, (_, col) => {
      if (direction === 'left') return row * size + col;
      if (direction === 'right') return row * size + size - 1 - col;
      if (direction === 'up') return col * size + row;
      return (size - 1 - col) * size + row;
    });
    const result = mergeLine(indices.map((index) => board[index]));
    score += result.score;
    indices.forEach((index, col) => { next[index] = result.line[col]; });
  }
  return { board: next, score, changed: next.some((value, index) => value !== board[index]) };
}

export function addMergeTile(board, random = Math.random) {
  const empty = board.flatMap((value, index) => value === 0 ? [index] : []);
  if (!empty.length) return [...board];
  const next = [...board];
  next[empty[Math.floor(random() * empty.length)]] = random() < 0.9 ? 2 : 4;
  return next;
}

export function canMergeMove(board, size = 4) {
  return ['left', 'right', 'up', 'down'].some((direction) => moveMerge(board, direction, size).changed);
}

export function slidingNeighbors(blank, size) {
  const row = Math.floor(blank / size);
  const col = blank % size;
  return [row > 0 ? blank - size : -1, row < size - 1 ? blank + size : -1, col > 0 ? blank - 1 : -1, col < size - 1 ? blank + 1 : -1].filter((index) => index >= 0);
}

export function moveSliding(board, index, size) {
  const blank = board.indexOf(0);
  if (!slidingNeighbors(blank, size).includes(index)) return null;
  const next = [...board];
  [next[index], next[blank]] = [next[blank], next[index]];
  return next;
}

export function solvedSliding(board) {
  return board.every((value, index) => value === (index + 1) % board.length);
}

export function createSliding(size, random = Math.random, steps = size * size * 40) {
  let board = Array.from({ length: size * size }, (_, index) => (index + 1) % (size * size));
  let previous = -1;
  for (let step = 0; step < steps || solvedSliding(board); step++) {
    const blank = board.indexOf(0);
    const neighbors = slidingNeighbors(blank, size).filter((index) => index !== previous);
    board = moveSliding(board, neighbors[Math.floor(random() * neighbors.length)], size);
    previous = blank;
  }
  return board;
}

export function createMaze(size, random = Math.random) {
  const cells = Array(size * size).fill(false);
  const start = size + 1;
  const stack = [start];
  cells[start] = true;
  while (stack.length) {
    const current = stack.at(-1);
    const row = Math.floor(current / size);
    const col = current % size;
    const neighbors = [[-2, 0], [2, 0], [0, -2], [0, 2]]
      .map(([dr, dc]) => [row + dr, col + dc])
      .filter(([r, c]) => r > 0 && c > 0 && r < size - 1 && c < size - 1 && !cells[r * size + c]);
    if (!neighbors.length) { stack.pop(); continue; }
    const [nextRow, nextCol] = neighbors[Math.floor(random() * neighbors.length)];
    const next = nextRow * size + nextCol;
    cells[((row + nextRow) / 2) * size + (col + nextCol) / 2] = true;
    cells[next] = true;
    stack.push(next);
  }
  return { cells, start, end: (size - 2) * size + size - 2, size };
}

export function moveMaze(maze, position, direction) {
  const row = Math.floor(position / maze.size);
  const col = position % maze.size;
  const [dr, dc] = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[direction];
  const nextRow = row + dr;
  const nextCol = col + dc;
  if (nextRow < 0 || nextCol < 0 || nextRow >= maze.size || nextCol >= maze.size) return position;
  const next = nextRow * maze.size + nextCol;
  return maze.cells[next] ? next : position;
}

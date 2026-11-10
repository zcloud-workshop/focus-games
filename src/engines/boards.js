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

export function toggleLights(board, index, size = 5) {
  const next = [...board];
  const row = Math.floor(index / size);
  const col = index % size;
  for (const [dr, dc] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && c >= 0 && r < size && c < size) next[r * size + c] = !next[r * size + c];
  }
  return next;
}

export function solveLights(board, size = 5) {
  let best = null;
  for (let first = 0; first < 2 ** size; first++) {
    let state = [...board];
    const moves = [];
    for (let col = 0; col < size; col++) {
      if (first & (1 << col)) { state = toggleLights(state, col, size); moves.push(col); }
    }
    for (let row = 1; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (state[(row - 1) * size + col]) {
          const index = row * size + col;
          state = toggleLights(state, index, size);
          moves.push(index);
        }
      }
    }
    if (!state.some(Boolean) && (!best || moves.length < best.length)) best = moves;
  }
  return best;
}

export function createLights(min, max, random = Math.random) {
  const size = 5;
  for (let attempt = 0; attempt < 2000; attempt++) {
    const positions = Array.from({ length: size * size }, (_, index) => index);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    const count = min + Math.floor(random() * (max - min + 1));
    let board = Array(size * size).fill(false);
    positions.slice(0, count).forEach((index) => { board = toggleLights(board, index, size); });
    const solution = solveLights(board, size);
    if (solution && solution.length >= min && solution.length <= max) return { board, solution };
  }
  throw new Error('未能生成符合难度的灯阵.');
}

export function matchingPositions(left, right) {
  return left.reduce((count, value, index) => count + Number(value === right[index]), 0);
}

export function swapAdjacent(order, index, direction) {
  const other = index + direction;
  if (other < 0 || other >= order.length) return null;
  const next = [...order];
  [next[index], next[other]] = [next[other], next[index]];
  return next;
}

export function sudokuCandidates(board, index) {
  if (board[index]) return [];
  const row = Math.floor(index / 9);
  const col = index % 9;
  const used = new Set();
  for (let i = 0; i < 9; i++) {
    used.add(board[row * 9 + i]);
    used.add(board[i * 9 + col]);
    used.add(board[(Math.floor(row / 3) * 3 + Math.floor(i / 3)) * 9 + Math.floor(col / 3) * 3 + i % 3]);
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((value) => !used.has(value));
}

export function solveSudoku(board, limit = 2) {
  const work = [...board];
  const solutions = [];
  for (let i = 0; i < 81; i++) {
    if (!work[i]) continue;
    const value = work[i];
    work[i] = 0;
    const legal = sudokuCandidates(work, i).includes(value);
    work[i] = value;
    if (!legal) return solutions;
  }
  const visit = () => {
    if (solutions.length >= limit) return;
    let best = -1;
    let options = null;
    for (let i = 0; i < 81; i++) {
      if (work[i]) continue;
      const candidates = sudokuCandidates(work, i);
      if (!candidates.length) return;
      if (!options || candidates.length < options.length) { best = i; options = candidates; }
    }
    if (best === -1) { solutions.push([...work]); return; }
    for (const value of options) { work[best] = value; visit(); work[best] = 0; }
  };
  visit();
  return solutions;
}

export function rateSudoku(board) {
  const work = [...board];
  let hidden = 0;
  const units = [
    ...Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, col) => row * 9 + col)),
    ...Array.from({ length: 9 }, (_, col) => Array.from({ length: 9 }, (_, row) => row * 9 + col)),
    ...Array.from({ length: 9 }, (_, box) => Array.from({ length: 9 }, (_, i) => (Math.floor(box / 3) * 3 + Math.floor(i / 3)) * 9 + box % 3 * 3 + i % 3)),
  ];
  while (work.includes(0)) {
    const candidates = work.map((_, index) => sudokuCandidates(work, index));
    const single = candidates.findIndex((values) => values.length === 1);
    if (single >= 0) { work[single] = candidates[single][0]; continue; }
    let found = false;
    for (const unit of units) {
      for (let value = 1; value <= 9; value++) {
        const positions = unit.filter((index) => candidates[index].includes(value));
        if (positions.length === 1) { work[positions[0]] = value; hidden++; found = true; break; }
      }
      if (found) break;
    }
    if (!found) return 'hard';
  }
  return hidden ? 'normal' : 'easy';
}

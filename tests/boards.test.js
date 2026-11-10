import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMergeTile, canMergeMove, createLights, createMaze, createSliding, mergeLine, moveMaze, moveMerge, moveSliding, slidingNeighbors, solveLights, solvedSliding, toggleLights } from '../src/engines/boards.js';

test('数字合并一回合中每个方块最多参与一次合并', () => {
  assert.deepEqual(mergeLine([2, 2, 2, 2]), { line: [4, 4, 0, 0], score: 8 });
  assert.deepEqual(mergeLine([4, 0, 4, 8]), { line: [8, 8, 0, 0], score: 8 });
  const board = [2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  assert.deepEqual(moveMerge(board, 'right').board.slice(0, 4), [0, 0, 4, 4]);
  assert.deepEqual(board.slice(0, 4), [2, 2, 2, 2]);
});

test('生成迷宫始终可从起点到达终点, 墙体阻止移动', () => {
  for (const size of [7, 9, 15, 21]) {
    let state = 42;
    const maze = createMaze(size, () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; });
    const seen = new Set([maze.start]);
    const queue = [maze.start];
    for (let i = 0; i < queue.length; i++) {
      for (const direction of ['up', 'down', 'left', 'right']) {
        const next = moveMaze(maze, queue[i], direction);
        if (!seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    assert.equal(seen.has(maze.end), true);
    assert.equal(moveMaze(maze, maze.start, 'up'), maze.start);
  }
});

test('熄灯盘面可解, 解的最短步数落在所选档位', () => {
  let state = 42;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
  for (const [min, max] of [[3, 5], [6, 8], [9, 15]]) {
    for (let sample = 0; sample < 10; sample++) {
      const { board, solution } = createLights(min, max, random);
      assert.ok(solution.length >= min && solution.length <= max);
      assert.equal(board.reduce((current, _, index) => solution.includes(index) ? toggleLights(current, index) : current, board).some(Boolean), false);
      assert.equal(solveLights(board).length, solution.length);
    }
  }
});

test('数字合并判断无效移动、生成空格和结束', () => {
  const full = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  assert.equal(canMergeMove(full), false);
  assert.equal(moveMerge(full, 'left').changed, false);
  assert.deepEqual(addMergeTile(full, () => 0), full);
  const empty = Array(16).fill(0);
  assert.equal(addMergeTile(empty, () => 0)[0], 2);
  assert.equal(addMergeTile(empty, () => 0.95)[15], 4);
});

test('滑块只能与相邻空位交换, 每次产生的棋盘可通过逆序移动还原', () => {
  for (const size of [3, 4, 5]) {
    const initial = Array.from({ length: size * size }, (_, index) => (index + 1) % (size * size));
    let board = initial;
    const path = [];
    for (let i = 0; i < 100; i++) {
      const blank = board.indexOf(0);
      const neighbors = slidingNeighbors(blank, size);
      const index = neighbors[i % neighbors.length];
      path.push(blank);
      board = moveSliding(board, index, size);
    }
    for (const index of path.reverse()) board = moveSliding(board, index, size);
    assert.deepEqual(board, initial);
    assert.equal(moveSliding(initial, 0, size), null);
    assert.equal(solvedSliding(createSliding(size, () => 0)), false);
  }
});

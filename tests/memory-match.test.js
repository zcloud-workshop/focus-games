import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard, definition } from '../src/games/memory-match.js';

function seeded(seed) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('各档棋盘每个图案恰有两张, 固定种子可复现', () => {
  for (const mode of definition.modes) for (const preset of mode.presets) {
    const { columns, rows } = preset.settings;
    const board = makeBoard(columns, rows, seeded(9));
    assert.equal(board.length, columns * rows);
    assert.deepEqual(board, makeBoard(columns, rows, seeded(9)));
    for (const value of new Set(board)) assert.equal(board.filter((card) => card === value).length, 2);
  }
});

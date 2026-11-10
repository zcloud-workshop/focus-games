import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveSudoku } from '../src/engines/boards.js';
import { createSudoku, definition, mount } from '../src/games/sudoku.js';

test('基础模式三错终止, 笔记模式继续且选中空格提示记一次错误', () => {
  const originalDocument = globalThis.document;
  globalThis.document = new EventTarget();
  try {
    for (const mode of definition.modes) {
      const root = new EventTarget();
      root.innerHTML = '';
      const preset = mode.presets[0];
      const initial = createSudoku('easy', () => 0);
      const solution = solveSudoku(initial, 1)[0];
      const index = initial.indexOf(0);
      const wrong = solution[index] % 9 + 1;
      let result;
      const cleanup = mount({ root, mode, preset, settings: preset.settings, random: () => 0, clock: { performance: { now: () => 0 } }, onFinish: (value) => { result = value; } });
      const press = (dataset) => {
        const event = new Event('pointerdown', { cancelable: true });
        for (const [key, value] of Object.entries({ target: { closest: () => ({ dataset }) }, button: 0, pointerType: 'touch', timeStamp: 100 })) Object.defineProperty(event, key, { value });
        root.dispatchEvent(event);
      };
      press({ cell: String(index) });
      for (let i = 0; i < 3; i++) press({ number: String(wrong) });
      if (mode.id === 'basic') {
        assert.equal(result.endReason, 'mistakes');
        assert.equal(result.scored, false);
      } else {
        assert.equal(result, undefined);
        assert.match(root.innerHTML, /错误 3 \/ 3/);
        press({ action: 'hint' });
        assert.match(root.innerHTML, /错误 4 \/ 3/);
      }
      cleanup();
    }
  } finally {
    globalThis.document = originalDocument;
  }
});

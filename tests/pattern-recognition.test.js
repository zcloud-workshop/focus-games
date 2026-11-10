import { test } from 'node:test';
import assert from 'node:assert/strict';
import { patternQuestion } from '../src/games/pattern-recognition.js';

test('三级数列遵循生成规则并提供四个不同选项', () => {
  let state = 42;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
  for (let difficulty = 0; difficulty < 3; difficulty++) {
    for (let i = 0; i < 30; i++) {
      const { series, answer, options } = patternQuestion(difficulty, random);
      const all = [...series, answer];
      assert.equal(new Set(options).size, 4);
      assert.equal(options.filter((option) => option === answer).length, 1);
      if (difficulty === 0) assert.equal(all[5] - all[4], all[1] - all[0]);
      if (difficulty === 1) assert.equal(all[5] - all[4] - (all[4] - all[3]), all[2] - 2 * all[1] + all[0]);
      if (difficulty === 2) assert.equal(all[5], all[4] + all[3]);
    }
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchNeighbors, matchQuestion, readEquation } from '../src/games/matchstick-math.js';

test('六年级组题均有解, 并枚举所有合法单根移动解', () => {
  let state = 42;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
  const lengths = [[1, 1, 1], [1, 1, 2], [2, 1, 2], [2, 2, 2], [2, 2, 3], [3, 3, 3]];
  let multi = false;
  for (let grade = 1; grade <= 6; grade++) {
    for (let i = 0; i < 20; i++) {
      const { tokens, solutions } = matchQuestion(grade, random);
      const equation = readEquation(tokens);
      assert.equal(equation.valid, false);
      assert.deepEqual([equation.a, equation.b, equation.c].map((value) => String(value).length), lengths[grade - 1]);
      assert.ok(solutions.length > 0);
      if (solutions.length > 1) multi = true;
      assert.deepEqual(solutions, matchNeighbors(tokens).filter((candidate) => readEquation(candidate).valid));
      for (const solution of solutions) {
        let removed = 0;
        let added = 0;
        tokens.forEach((token, index) => {
          for (let bit = 0; bit < 7; bit++) {
            if ((token.mask & (1 << bit)) && !(solution[index].mask & (1 << bit))) removed++;
            if (!(token.mask & (1 << bit)) && (solution[index].mask & (1 << bit))) added++;
          }
        });
        assert.equal(removed, 1);
        assert.equal(added, 1);
      }
    }
  }
  assert.equal(multi, true);
});

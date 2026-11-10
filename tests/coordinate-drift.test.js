import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRoutes } from '../src/games/coordinate-drift.js';
function seeded(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
test('双目标独立起点与路径固定种子可复现', () => {
  const routes = makeRoutes(5, 2, 10, seeded(1));
  assert.deepEqual(routes, makeRoutes(5, 2, 10, seeded(1)));
  assert.notEqual(routes[0].start, routes[1].start);
  assert.ok(routes.every((route) => route.steps.length === 10 && route.end >= 0 && route.end < 25));
});

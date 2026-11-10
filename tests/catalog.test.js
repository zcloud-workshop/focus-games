import { test } from 'node:test';
import assert from 'node:assert/strict';
import { games, categories, dailyChallenges } from '../src/core.js';

test('冻结目录包含55个训练与2项工具, 覆盖86训练入口和2工具入口', () => {
  assert.equal(games.filter((g) => g.kind === 'training').length,55);
  assert.equal(games.filter((g) => g.kind === 'tool').length,2);
  assert.equal(new Set(games.map((g) => g.id)).size,57);
  const sources = games.flatMap((g) => g.sources);
  assert.equal(sources.length,88);
  assert.equal(new Set(sources).size,88);
  assert.ok(!sources.includes('C27'));
  for (const game of games) assert.ok(categories.some((c) => c.id === game.category));
});

test('所有目录入口有独立模块、有效模式和预设, 每日挑战引用明确配置', async () => {
  const definitions = new Map();
  for (const game of games) {
    const module = await import(`../src/games/${game.id}.js`);
    assert.equal(typeof module.mount,'function',game.id);
    assert.equal(module.definition.id,game.id);
    definitions.set(game.id,module.definition);
    const modeIds = new Set();
    for (const mode of module.definition.modes) {
      assert.ok(!modeIds.has(mode.id),`${game.id} mode ${mode.id}`);
      modeIds.add(mode.id);
      assert.ok(Number.isInteger(mode.ruleVersion) && mode.ruleVersion >= 2);
      assert.ok(mode.presets.length);
      assert.ok(mode.score?.unit);
      assert.equal(typeof mode.score?.lower,'boolean');
      assert.ok(['invalidate','pause','continue'].includes(mode.hiddenPolicy));
      assert.ok(mode.inputs.length);
      for (const preset of mode.presets) assert.equal(typeof preset.settings,'object');
    }
  }
  for (const entry of dailyChallenges) {
    const game = games.find((g) => g.id === entry.game);
    assert.equal(game.kind,'training');
    const mode = definitions.get(game.id).modes.find((m) => m.id === entry.mode);
    assert.ok(mode,`${entry.game}/${entry.mode}`);
    assert.ok(mode.presets.some((p) => p.id === entry.preset));
    assert.notEqual(mode.scored,false);
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { games } from '../src/core.js';
import {
  STORAGE_KEY, LEGACY_KEY, DATA_VERSION, RECORD_LIMIT, TRIAL_SESSIONS, CLASSIC_MODE, CLASSIC_RULES,
  createStore, createId, emptyData, readData, writeData, addRecord, setFavorite, bestKey, classicBestKey, bestFor,
  visibleRecords, isUnlocked, markUnlocked, exportData,
} from '../src/storage.js';

function memoryStorage(initial = {}, { quota = Infinity } = {}) {
  const items = new Map(Object.entries(initial).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
  const storage = {
    writes: 0,
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem(key, value) {
      const text = String(value);
      let size = text.length;
      for (const [other, saved] of items) if (other !== key) size += saved.length;
      if (size > quota) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
      items.set(key, text);
      storage.writes++;
    },
  };
  return storage;
}

// 基线版本 (27010eb) 的读取和写入逻辑, 模拟仍在运行旧版本的标签页.
function legacyTab(storage) {
  const known = games.map((game) => game.id);
  const read = () => {
    const data = JSON.parse(storage.getItem(LEGACY_KEY) || '{}');
    return {
      records: Array.isArray(data.records) ? data.records.filter((record) => record && known.includes(record.game) && Number.isFinite(record.value) && record.value >= 0 && Number.isInteger(record.level) && record.level >= 0 && record.level < 3 && Number.isFinite(record.duration) && record.duration >= 0 && Number.isFinite(Date.parse(record.at))).slice(-500) : [],
      favorites: Array.isArray(data.favorites) ? data.favorites.filter((id) => known.includes(id)) : [],
    };
  };
  let saved = read();
  const persist = () => storage.setItem(LEGACY_KEY, JSON.stringify(saved));
  return {
    reload() { saved = read(); },
    finish(record) { saved.records.push(record); saved.records = saved.records.slice(-500); persist(); },
    toggleFavorite(id) { saved.favorites = saved.favorites.includes(id) ? saved.favorites.filter((item) => item !== id) : [...saved.favorites, id]; persist(); },
  };
}

const v1Record = (game, value, level = 0, at = new Date(2026, 10, 10, 12)) => ({ game, value, level, duration: 30, at: at.toISOString() });
let clock = Date.UTC(2026, 10, 10, 6);
function classicRecord(game, value, extra = {}) {
  const config = games.find((item) => item.id === game);
  clock += 60_000;
  return { id: createId(clock), game, mode: CLASSIC_MODE, rules: CLASSIC_RULES, level: 0, label: config.levels[0], value, unit: config.unit, duration: 30, at: new Date(clock).toISOString(), ...extra };
}
const stored = (storage) => JSON.parse(storage.getItem(STORAGE_KEY));
// 写入操作可能被重放, 记录在操作外创建, 保持同一 ID.
function save(game, value, extra) {
  const record = classicRecord(game, value, extra);
  return (data) => addRecord(data, record, { key: classicBestKey(game, 0), lower: games.find((item) => item.id === game).lower });
}

test('首次读取从 v1 迁移记录和收藏, v1 保持原样', () => {
  const v1 = { records: [v1Record('schulte', 10), v1Record('schulte', 8, 0, new Date(2026, 10, 10, 13)), v1Record('stroop', 95, 1, new Date(2026, 10, 10, 14))], favorites: ['schulte', 'stroop'] };
  const storage = memoryStorage({ [LEGACY_KEY]: v1 });
  const before = storage.getItem(LEGACY_KEY);
  const store = createStore(() => storage);
  assert.equal(store.load().records.length, 3);
  assert.equal(storage.writes, 0, '普通读取不写入');
  const data = store.load({ persist: true });
  assert.equal(storage.writes, 1);
  assert.equal(storage.getItem(LEGACY_KEY), before);
  assert.deepEqual(stored(storage).records, data.records);
  assert.deepEqual(data.favorites, ['schulte', 'stroop']);
  assert.deepEqual(data.records[0], { ...v1.records[0], id: data.records[0].id, mode: CLASSIC_MODE, rules: CLASSIC_RULES, origin: 'v1', unit: '秒', label: '3 × 3' });
  assert.equal(data.records[2].label, '4 色');
  assert.equal(visibleRecords(data.records).length, 3);
  store.load({ persist: true });
  assert.equal(storage.writes, 1, '没有新变化时不重复写入');
});

test('迁移时按游戏、难度和成绩方向建立个人最佳', () => {
  const v1 = { records: [v1Record('schulte', 10), v1Record('schulte', 4, 1), v1Record('schulte', 8), v1Record('stroop', 70), v1Record('stroop', 95), v1Record('sequence', 0), v1Record('sequence', 5)] };
  const data = createStore(() => memoryStorage({ [LEGACY_KEY]: v1 })).load();
  assert.equal(bestFor(data, classicBestKey('schulte', 0)).value, 8);
  assert.equal(bestFor(data, classicBestKey('schulte', 1)).value, 4);
  assert.equal(bestFor(data, classicBestKey('schulte', 2)), null);
  assert.equal(bestFor(data, classicBestKey('stroop', 0)).value, 95);
  assert.equal(bestFor(data, classicBestKey('sequence', 0)).value, 5);
  assert.equal(bestFor(data, classicBestKey('schulte', 0)).label, '3 × 3');
});

test('旧版本标签页写入 v1 后去重合并, 新数据不丢失', () => {
  const storage = memoryStorage({ [LEGACY_KEY]: { records: [v1Record('schulte', 10)], favorites: ['schulte'] } });
  const oldTab = legacyTab(storage);
  const store = createStore(() => storage);
  store.load({ persist: true });
  const reaction = store.mutate(save('reaction', 250)).result.record;
  oldTab.finish(v1Record('stroop', 90, 0, new Date(Date.parse(reaction.at) - 30_000)));
  oldTab.toggleFavorite('schulte');
  oldTab.toggleFavorite('math');
  store.load();
  const data = store.load();
  assert.deepEqual(data.records.map((record) => record.game), ['schulte', 'stroop', 'reaction'], '按时间插入, 重复读取不重复导入');
  assert.deepEqual(data.favorites, ['math']);
  store.mutate((data) => setFavorite(data, 'nback', true));
  assert.equal(stored(storage).records.length, 3);
  assert.deepEqual(stored(storage).favorites, ['math', 'nback']);

  oldTab.reload();
  oldTab.finish(v1Record('color', 80, 0, new Date(2026, 10, 10, 16)));
  assert.equal(stored(storage).records.length, 3, '旧版本标签页不会修改 v2');
  assert.equal(store.load().records.length, 4);
  assert.equal(bestFor(store.data, classicBestKey('color', 0)).value, 80);
});

test('迁移簿记丢失时, 已导入的 v1 记录不会重复导入', () => {
  const v1 = { records: [v1Record('schulte', 10), v1Record('stroop', 90)], favorites: [] };
  const storage = memoryStorage({ [LEGACY_KEY]: v1 });
  const store = createStore(() => storage);
  store.load({ persist: true });
  const lost = stored(storage);
  lost.legacy = { seen: [], favorites: [] };
  storage.setItem(STORAGE_KEY, JSON.stringify(lost));
  assert.equal(store.load().records.length, 2);
  assert.equal(store.data.legacy.seen.length, 2);
});

test('每次写入前重新读取, 两个标签页的记录和收藏都保留', () => {
  const storage = memoryStorage();
  const tabA = createStore(() => storage);
  const tabB = createStore(() => storage);
  tabA.load();
  tabB.load();
  tabA.mutate(save('schulte', 9));
  const outcome = tabB.mutate(save('schulte', 7)).result;
  tabB.mutate((data) => setFavorite(data, 'schulte', true));
  tabA.mutate((data) => setFavorite(data, 'stroop', true));
  const saved = stored(storage);
  assert.deepEqual(saved.records.map((record) => record.value), [9, 7]);
  assert.deepEqual(saved.favorites, ['schulte', 'stroop']);
  assert.equal(outcome.isBest, true);
  assert.equal(outcome.previous.value, 9);
  assert.equal(bestFor(saved, classicBestKey('schulte', 0)).value, 7);
});

test('保留无法识别的记录、字段和最佳, 只在展示时跳过', () => {
  const future = { id: 'future-1', game: 'pvt', mode: 'pvt-b', rules: 1, value: 280, unit: 'ms', duration: 180, at: '2026-11-10T01:00:00.000Z', metrics: { lapses: 1 } };
  const revised = { ...classicRecord('reaction', 240), mode: 'start-lights', rules: 2 };
  const extra = { ...classicRecord('schulte', 12), note: 'kept' };
  const initial = { version: 2, records: [null, future, revised, extra], favorites: ['pvt', 'schulte'], bests: { 'pvt|pvt-b|1|null|any': { value: 280 } }, profile: { goal: 3 }, legacy: { seen: [], favorites: [], note: 'kept' } };
  const storage = memoryStorage({ [STORAGE_KEY]: initial });
  const store = createStore(() => storage);
  assert.deepEqual(visibleRecords(store.load().records), [extra]);
  store.mutate(save('stroop', 80));
  const saved = stored(storage);
  assert.deepEqual(saved.records.slice(0, 4), initial.records);
  assert.equal(saved.records.length, 5);
  assert.deepEqual(saved.favorites, ['pvt', 'schulte']);
  assert.deepEqual(saved.bests['pvt|pvt-b|1|null|any'], { value: 280 });
  assert.deepEqual(saved.profile, { goal: 3 });
  assert.equal(saved.legacy.note, 'kept');
});

test('个人最佳单独保存, 记录滚动超过 500 条后仍然保留', () => {
  const storage = memoryStorage();
  const store = createStore(() => storage);
  const key = classicBestKey('reaction', 0);
  const best = classicRecord('reaction', 180);
  store.mutate((data) => addRecord(data, best, { key, lower: true }));
  store.mutate((data) => { for (let i = 0; i < RECORD_LIMIT + 10; i++) addRecord(data, classicRecord('reaction', 300 + i), { key, lower: true }); });
  const saved = stored(storage);
  assert.equal(saved.records.length, RECORD_LIMIT);
  assert.equal(saved.records[0].value, 310);
  assert.equal(saved.records.some((record) => record.id === best.id), false);
  assert.deepEqual(bestFor(saved, key), { value: 180, unit: 'ms', lower: true, record: best.id, at: best.at, label: '轻松' });
});

test('记录上限遵循数据中更大的上限设置', () => {
  const data = { ...emptyData(), limits: { records: 600 } };
  for (let i = 0; i < 610; i++) addRecord(data, classicRecord('reaction', 200 + i));
  assert.equal(data.records.length, 600);
  assert.equal(data.records[0].value, 210);
});

test('不计分记录照常保存, 但不产生新纪录', () => {
  const data = emptyData();
  const key = classicBestKey('reaction', 0);
  addRecord(data, classicRecord('reaction', 300), { key, lower: true });
  const outcome = addRecord(data, classicRecord('reaction', 150, { scored: false }), { key, lower: true });
  assert.equal(outcome.isBest, false);
  assert.equal(outcome.previous.value, 300);
  assert.equal(bestFor(data, key).value, 300);
  assert.equal(data.records.length, 2);
});

test('拒绝保存 NaN 和无穷成绩', () => {
  const data = emptyData();
  for (const value of [NaN, Infinity, -Infinity, undefined]) assert.throws(() => addRecord(data, classicRecord('reaction', value)), TypeError);
  assert.equal(data.records.length, 0);
});

test('原始试次每个模式只保留最近 5 次, 超出配额时先丢弃最旧试次', () => {
  const data = emptyData();
  const records = Array.from({ length: 7 }, (_, i) => classicRecord('reaction', 200 + i));
  records.forEach((record) => addRecord(data, record, { trials: [{ rt: 200 }, { rt: 210 }] }));
  addRecord(data, classicRecord('schulte', 9), { trials: [{ time: 1.2 }] });
  const reactionTrials = Object.keys(data.trials).filter((id) => data.trials[id].game === 'reaction');
  assert.equal(TRIAL_SESSIONS, 5);
  assert.deepEqual(reactionTrials, records.slice(-TRIAL_SESSIONS).map((record) => record.id));

  const storage = memoryStorage({}, { quota: JSON.stringify(data).length - 1 });
  writeData(storage, data);
  const saved = stored(storage);
  assert.equal(saved.records.length, 8);
  assert.equal(Object.keys(saved.trials).length, TRIAL_SESSIONS);
  assert.equal(saved.trials[records[2].id], undefined);
  assert.throws(() => writeData(memoryStorage({}, { quota: 10 }), emptyData()), { name: 'QuotaExceededError' });
});

test('记录滚动出上限时一并删除对应的原始试次', () => {
  const data = emptyData();
  const first = classicRecord('reaction', 200);
  addRecord(data, first, { trials: [{ rt: 200 }] });
  for (let i = 0; i < RECORD_LIMIT; i++) addRecord(data, classicRecord('schulte', 9));
  assert.equal(data.trials[first.id], undefined);
});

test('本机存储不可用时成绩保留在本次打开期间', () => {
  const store = createStore(() => { throw new Error('SecurityError'); });
  assert.deepEqual(store.load().records, []);
  const first = store.mutate(save('schulte', 9));
  const second = store.mutate(save('schulte', 8));
  assert.equal(first.ok, false);
  assert.equal(second.ok, false);
  assert.deepEqual(store.data.records.map((record) => record.value), [9, 8]);
  assert.equal(second.result.isBest, true);
});

test('写入失败的操作在存储恢复后补写, 不重复保存', () => {
  const storage = memoryStorage();
  let broken = true;
  const flaky = {
    getItem: (key) => storage.getItem(key),
    setItem(key, value) {
      if (broken) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
      storage.setItem(key, value);
    },
  };
  const store = createStore(() => flaky);
  store.load();
  assert.equal(store.mutate(save('schulte', 9)).ok, false);
  assert.equal(store.load().records.length, 1, '其他标签页触发读取时仍显示未写入的成绩');
  broken = false;
  assert.equal(store.mutate((data) => setFavorite(data, 'schulte', true)).ok, true);
  assert.equal(store.mutate((data) => setFavorite(data, 'stroop', true)).ok, true);
  assert.equal(stored(storage).records.length, 1);
  assert.deepEqual(stored(storage).favorites, ['schulte', 'stroop']);
});

test('v2 数据损坏时重新从 v1 迁移, v1 缺失或损坏时从空数据开始', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: '{broken', [LEGACY_KEY]: { records: [v1Record('schulte', 10)], favorites: ['schulte'] } });
  const data = createStore(() => storage).load({ persist: true });
  assert.equal(data.records.length, 1);
  assert.deepEqual(data.favorites, ['schulte']);
  assert.equal(stored(storage).records.length, 1);
  assert.deepEqual(readData(memoryStorage({ [LEGACY_KEY]: '{broken' })), { data: emptyData(), changed: false });
  assert.deepEqual(readData(memoryStorage()), { data: emptyData(), changed: false });
});

test('导出包含数据版本、记录、最佳、解锁和工具记录, 不含迁移簿记', () => {
  const data = createStore(() => memoryStorage({ [LEGACY_KEY]: { records: [v1Record('schulte', 10)], favorites: [] } })).load();
  markUnlocked(data, 'breath|box|0', '2026-11-10T00:00:00.000Z');
  data.tools.push({ tool: 'pomodoro', minutes: 25 });
  const exported = exportData(data, new Date('2026-11-10T08:00:00.000Z'));
  assert.equal(exported.app, 'focus-lab');
  assert.equal(exported.version, DATA_VERSION);
  assert.equal(exported.exportedAt, '2026-11-10T08:00:00.000Z');
  assert.equal(exported.records.length, 1);
  assert.equal(bestFor(exported, classicBestKey('schulte', 0)).value, 10);
  assert.deepEqual(exported.unlocks, { 'breath|box|0': { at: '2026-11-10T00:00:00.000Z' } });
  assert.deepEqual(exported.tools, [{ tool: 'pomodoro', minutes: 25 }]);
  assert.equal('legacy' in exported, false);
});

test('解锁状态单独保存, 重复解锁保留首次时间', () => {
  const data = emptyData();
  assert.equal(isUnlocked(data, 'breath|box|0'), false);
  markUnlocked(data, 'breath|box|0', '2026-11-10T00:00:00.000Z');
  markUnlocked(data, 'breath|box|0', '2026-11-11T00:00:00.000Z');
  assert.equal(isUnlocked(data, 'breath|box|0'), true);
  assert.equal(data.unlocks['breath|box|0'].at, '2026-11-10T00:00:00.000Z');
});

test('最佳成绩键按设置内容分组, 与字段顺序无关, 并区分输入方式', () => {
  const base = { game: 'reaction', mode: 'custom', rules: 2 };
  assert.equal(bestKey({ ...base, settings: { trials: 10, wait: [1, 3] } }), bestKey({ ...base, settings: { wait: [1, 3], trials: 10 } }));
  assert.notEqual(bestKey({ ...base, settings: { trials: 10 } }), bestKey({ ...base, settings: { trials: 12 } }));
  assert.notEqual(bestKey({ ...base, settings: 'L0', input: 'keyboard' }), bestKey({ ...base, settings: 'L0', input: 'touch' }));
  assert.equal(classicBestKey('schulte', 1), 'schulte|classic|1|L1|any');
});

test('按经典规则的合法值域过滤展示记录', () => {
  const valid = [classicRecord('color', 100), classicRecord('sequence', 20), classicRecord('reaction', 0)];
  const invalid = [classicRecord('color', 101), classicRecord('sequence', 21), classicRecord('schulte', -1), { ...classicRecord('schulte', 9), level: 3 }, { ...classicRecord('schulte', 9), at: 'invalid' }, { ...classicRecord('schulte', 9), duration: -1 }];
  assert.deepEqual(visibleRecords([...valid, ...invalid]), valid);
});

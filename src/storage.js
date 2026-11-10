import { games } from './core.js';

export const STORAGE_KEY = 'focus-lab-v2';
export const LEGACY_KEY = 'focus-lab-v1';
export const DATA_VERSION = 2;
export const RECORD_LIMIT = 500;
export const TRIAL_SESSIONS = 5;
export const CLASSIC_MODE = 'classic';
export const CLASSIC_RULES = 1;
const SEEN_LIMIT = 1000;

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const gameById = (id) => games.find((game) => game.id === id);
const parse = (text) => {
  if (typeof text !== 'string') return null;
  try { return JSON.parse(text); }
  catch { return null; }
};
const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : isObject(value) ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value);

export function emptyData() {
  return { version: DATA_VERSION, records: [], favorites: [], bests: {}, unlocks: {}, tools: [], trials: {}, legacy: { seen: [], favorites: [] } };
}

// 保留无法识别的顶层字段、记录和最佳, 只修正容器类型.
function normalize(raw) {
  const data = isObject(raw) ? { ...raw } : {};
  data.version = Number.isInteger(data.version) && data.version > DATA_VERSION ? data.version : DATA_VERSION;
  for (const key of ['records', 'favorites', 'tools']) if (!Array.isArray(data[key])) data[key] = [];
  for (const key of ['bests', 'unlocks', 'trials']) if (!isObject(data[key])) data[key] = {};
  const legacy = isObject(data.legacy) ? data.legacy : {};
  data.legacy = { ...legacy, seen: Array.isArray(legacy.seen) ? legacy.seen : [], favorites: Array.isArray(legacy.favorites) ? legacy.favorites : [] };
  return data;
}

// v1 记录没有 ID, 用全部字段的 64 位指纹去重.
function fingerprint(record) {
  const text = [record.game, record.level, record.value, record.duration, record.at].join('|');
  let a = 0x811c9dc5;
  let b = 0x9747b28c;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 0x01000193);
    b = Math.imul(b ^ text.charCodeAt(i), 0x5bd1e995);
  }
  a = Math.imul(a ^ (a >>> 15), 0x2c1b3c6d);
  b = Math.imul(b ^ (b >>> 13), 0x297a2d39);
  return (a >>> 0).toString(36) + (b >>> 0).toString(36);
}

function insertChronologically(records, record) {
  const time = Date.parse(record.at);
  let index = records.length;
  if (Number.isFinite(time)) while (index > 0 && Date.parse(records[index - 1]?.at) > time) index--;
  records.splice(index, 0, record);
}

export function createId(now = Date.now(), random = Math.random) {
  return `${now.toString(36)}${Math.floor(random() * 36 ** 6).toString(36).padStart(6, '0')}`;
}

export function bestKey({ game, mode, rules, settings, input = 'any' }) {
  return [game, mode, rules, typeof settings === 'string' ? settings : canonical(settings ?? null), input].join('|');
}

export const classicBestKey = (game, level) => bestKey({ game, mode: CLASSIC_MODE, rules: CLASSIC_RULES, settings: `L${level}` });

export function bestFor(data, key) {
  const best = data.bests[key];
  return isObject(best) && Number.isFinite(best.value) ? best : null;
}

function validClassic(record, game) {
  return Number.isFinite(record.value) && record.value >= 0 && record.value <= (game.max ?? Infinity)
    && Number.isInteger(record.level) && record.level >= 0 && record.level < game.levels.length
    && Number.isFinite(record.duration) && record.duration >= 0 && Number.isFinite(Date.parse(record.at));
}

// 展示时只显示当前版本能识别的记录, 其余原样保存.
export function visibleRecords(records) {
  return records.filter((record) => {
    if (!isObject(record) || record.mode !== CLASSIC_MODE || record.rules !== CLASSIC_RULES) return false;
    const game = gameById(record.game);
    return Boolean(game) && validClassic(record, game);
  });
}

function updateBest(data, key, record, lower) {
  const previous = bestFor(data, key);
  const isBest = !previous || (lower ? record.value < previous.value : record.value > previous.value);
  if (isBest) data.bests[key] = { value: record.value, unit: record.unit, lower, record: record.id, at: record.at, ...(record.label ? { label: record.label } : {}) };
  return { isBest, previous };
}

function pruneTrials(data) {
  const ids = new Set(data.records.map((record) => record?.id));
  for (const id of Object.keys(data.trials)) if (!ids.has(id)) delete data.trials[id];
}

function trimRecords(data) {
  const limit = Math.max(RECORD_LIMIT, Number.isInteger(data.limits?.records) ? data.limits.records : 0);
  if (data.records.length <= limit) return;
  data.records = data.records.slice(-limit);
  pruneTrials(data);
}

function importLegacy(data, legacy) {
  if (!isObject(legacy)) return false;
  let changed = false;
  if (Array.isArray(legacy.records)) {
    const seen = new Set(data.legacy.seen);
    const imported = new Set(data.records.map((record) => record?.id));
    for (const old of legacy.records) {
      if (!isObject(old)) continue;
      const id = fingerprint(old);
      if (seen.has(id)) continue;
      seen.add(id);
      data.legacy.seen.push(id);
      changed = true;
      if (imported.has(`v1-${id}`)) continue;
      const game = gameById(old.game);
      const record = { ...old, id: `v1-${id}`, mode: CLASSIC_MODE, rules: CLASSIC_RULES, origin: 'v1' };
      if (game) {
        record.unit = game.unit;
        if (typeof game.levels[old.level] === 'string') record.label = game.levels[old.level];
      }
      insertChronologically(data.records, record);
      if (game && validClassic(record, game)) updateBest(data, classicBestKey(record.game, record.level), record, game.lower);
    }
    if (data.legacy.seen.length > SEEN_LIMIT) data.legacy.seen = data.legacy.seen.slice(-SEEN_LIMIT);
    if (changed) trimRecords(data);
  }
  if (Array.isArray(legacy.favorites)) {
    const current = [...new Set(legacy.favorites.filter((id) => typeof id === 'string'))];
    const before = new Set(data.legacy.favorites);
    const now = new Set(current);
    // 只同步旧版本标签页新增或取消的收藏, 不覆盖本版本的操作.
    for (const id of current) if (!before.has(id)) changed = setFavorite(data, id, true) || changed;
    for (const id of before) if (!now.has(id)) changed = setFavorite(data, id, false) || changed;
    if (before.size !== now.size || current.some((id) => !before.has(id))) {
      data.legacy.favorites = current;
      changed = true;
    }
  }
  return changed;
}

export function readData(storage) {
  const data = normalize(parse(storage.getItem(STORAGE_KEY)));
  const changed = importLegacy(data, parse(storage.getItem(LEGACY_KEY)));
  return { data, changed };
}

const isQuotaError = (error) => ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].includes(error?.name) || [22, 1014].includes(error?.code);

function dropOldestTrial(data) {
  const oldest = Object.entries(data.trials).sort(([, a], [, b]) => (Date.parse(a?.at) || 0) - (Date.parse(b?.at) || 0))[0];
  if (!oldest) return false;
  delete data.trials[oldest[0]];
  return true;
}

// 超出配额时先丢弃最旧的原始试次.
export function writeData(storage, data) {
  for (;;) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
      return;
    } catch (error) {
      if (!isQuotaError(error) || !dropOldestTrial(data)) throw error;
    }
  }
}

// 同一记录 ID 只写入一次, 写入失败后可以安全重放.
export function addRecord(data, record, { key, lower = false, trials } = {}) {
  if (!Number.isFinite(record.value)) throw new TypeError('成绩必须是有限数值.');
  const saved = record.id ? data.records.find((item) => item?.id === record.id) : null;
  if (saved) return { record: saved, isBest: false, previous: key ? bestFor(data, key) : null };
  const entry = record.id ? record : { ...record, id: createId() };
  data.records.push(entry);
  if (Array.isArray(trials) && trials.length) {
    data.trials[entry.id] = { game: entry.game, mode: entry.mode, at: entry.at, items: trials };
    const sessions = Object.entries(data.trials)
      .filter(([, item]) => item?.game === entry.game && item?.mode === entry.mode)
      .sort(([, a], [, b]) => Date.parse(a.at) - Date.parse(b.at));
    for (const [id] of sessions.slice(0, -TRIAL_SESSIONS)) delete data.trials[id];
  }
  trimRecords(data);
  if (!key || entry.scored === false) return { record: entry, isBest: false, previous: key ? bestFor(data, key) : null };
  return { record: entry, ...updateBest(data, key, entry, lower) };
}

export function setFavorite(data, id, on) {
  const has = data.favorites.includes(id);
  if (on && !has) data.favorites.push(id);
  else if (!on && has) data.favorites = data.favorites.filter((item) => item !== id);
  else return false;
  return true;
}

export const isUnlocked = (data, key) => isObject(data.unlocks[key]);

export function markUnlocked(data, key, at = new Date().toISOString()) {
  if (!isUnlocked(data, key)) data.unlocks[key] = { at };
  return data.unlocks[key];
}

export function exportData(data, now = new Date()) {
  const { legacy, ...rest } = data;
  return { app: 'focus-lab', version: data.version, exportedAt: now.toISOString(), ...rest };
}

// 每次写入前重新读取并重放本次操作, 不用内存中的旧副本覆盖其他标签页的写入.
// 写入失败的操作保留到下次写入时重放, 因此操作必须可重复执行: 记录在操作外创建并带 ID, 收藏用目标状态而非切换.
export function createStore(getStorage = () => globalThis.localStorage) {
  let data = emptyData();
  let pending = [];
  const write = () => {
    try {
      writeData(getStorage(), data);
      pending = [];
      return true;
    } catch {
      return false;
    }
  };
  return {
    get data() { return data; },
    load({ persist = false } = {}) {
      let fresh;
      try { fresh = readData(getStorage()); }
      catch { return data; }
      pending.forEach((operation) => operation(fresh.data));
      data = fresh.data;
      if (persist && (fresh.changed || pending.length)) write();
      return data;
    },
    mutate(operation) {
      try { data = readData(getStorage()).data; }
      catch { /* 存储不可用时沿用内存中的数据. */ }
      pending.push(operation);
      let result;
      pending.forEach((queued) => { result = queued(data); });
      return { ok: write(), result };
    },
  };
}

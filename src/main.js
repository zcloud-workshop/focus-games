import './style.css';
import { games, categories, dailyGames, dailyChallenges, legacyRules, localDate, summarize } from './core.js';
import { STORAGE_KEY, LEGACY_KEY, CLASSIC_RULES, createStore, createId, addRecord, setFavorite, classicBestKey, bestKey, bestFor, visibleRecords, visibleBests, visibleTools, exportData, registerDefinition, validScore, markUnlocked, addToolRecord } from './storage.js';
import { icon } from './icons.js';
import { mountGame, loadGame } from './games.js';

const app = document.querySelector('#app');
const store = createStore();
let saved = store.load({ persist: true });
let view = 'training';
let category = 'all';
let search = '';
let selection;
let dialogVersion = 0;
let recordGame = '';
let recordMode = '';
const loaded = new Map();
let stopGame = () => {};
let running = false;
let dailySession = null;
let toastTimer;
let returnFocus;
let theme = 'light';
try { theme = window.localStorage.getItem('focus-lab-theme') === 'dark' ? 'dark' : 'light'; }
catch { theme = 'light'; }

function applyTheme() {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#000000' : '#f5f5f7';
  const button = document.querySelector('[data-action="theme"]');
  if (button) {
    button.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
    button.setAttribute('aria-label', theme === 'dark' ? '切换明亮主题' : '切换深色主题');
    button.title = theme === 'dark' ? '明亮' : '深色';
  }
}

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('visible'), 3200);
}

function update(operation) {
  const outcome = store.mutate(operation);
  saved = store.data;
  if (!outcome.ok) toast('本机存储不可用, 当前成绩仅在本次打开期间保留.');
  return outcome;
}

const favoriteIds = () => saved.favorites.filter((id) => games.some((game) => game.id === id));

const formatValue = (value, unit, precision) => `${Number.isInteger(precision) && precision >= 0 && precision <= 6 ? value.toFixed(precision) : Number.isInteger(value) ? value : value.toFixed(2)} <small>${unit}</small>`;
const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const inputNames = { pointer: '鼠标', touch: '触屏', keyboard: '键盘', mixed: '混合输入', unknown: '未识别', any: '未区分', 'right-mouse': '鼠标右键', motion: '动作感应' };
const inputName = (value) => inputNames[value] ?? value;

function navigation() {
  return `<header class="site-header"><div class="header-inner">
    <a class="brand" href="#training" aria-label="Focus Lab 首页">${icon('focus')}<span>Focus Lab</span></a>
    <nav aria-label="主导航">
      <a class="nav-link ${view === 'training' ? 'active' : ''}" href="#training" ${view === 'training' ? 'aria-current="page"' : ''}>训练</a>
      <a class="nav-link ${view === 'favorites' ? 'active' : ''}" href="#favorites" ${view === 'favorites' ? 'aria-current="page"' : ''}>收藏<span class="nav-count">${favoriteIds().length || ''}</span></a>
      <a class="nav-link ${view === 'records' ? 'active' : ''}" href="#records" ${view === 'records' ? 'aria-current="page"' : ''}>记录</a>
    </nav>
    <button class="theme-toggle" data-action="theme" aria-label="${theme === 'dark' ? '切换明亮主题' : '切换深色主题'}" title="${theme === 'dark' ? '明亮' : '深色'}">${icon(theme === 'dark' ? 'sun' : 'moon')}</button>
  </div></header>`;
}

function hero() {
  return `<section class="hero" aria-labelledby="hero-title"><h1 id="hero-title">专注, 现在.</h1><p>给大脑一点空间.</p><div class="hero-actions"><button class="button primary" data-action="daily">每日挑战</button><button class="text-button" data-action="explore">探索训练 ${icon('chevron')}</button></div></section>`;
}

function cardPreview(game) {
  if (game.id === 'schulte') return `<div class="mini-grid">${[6, 2, 9, 4, 1, 7, 3, 8, 5].map((n) => `<span class="${n === 1 ? 'selected' : ''}">${n}</span>`).join('')}</div>`;
  if (game.id === 'difference') return '<div class="mini-characters">未 未 未<br>未 <b>末</b> 未<br>未 未 未</div>';
  if (game.id === 'color') return `<div class="mini-colors">${Array.from({ length: 9 }, (_, i) => `<span class="${i === 4 ? 'different' : ''}"></span>`).join('')}</div>`;
  if (game.id === 'sequence') return `<div class="mini-sequence">${Array.from({ length: 9 }, (_, i) => `<span class="${[0, 4, 7].includes(i) ? 'selected' : ''}"></span>`).join('')}</div>`;
  if (game.id === 'numbers') return '<div class="mini-number">7<span>2</span>9<span>4</span></div>';
  if (game.id === 'nback') return '<div class="mini-back"><span>B</span><span>F</span><b>B</b><i></i></div>';
  if (game.id === 'stroop') return '<div class="mini-stroop"><span>蓝</span><b>红</b><span>绿</span></div>';
  if (game.id === 'reaction') return `<div class="mini-bolt">${icon('bolt')}</div>`;
  if (game.id === 'gonogo') return '<div class="mini-go"><span>●</span><span>×</span></div>';
  if (game.id === 'math') return '<div class="mini-math">12 <span>+</span> 8 <b>= ?</b></div>';
  if (game.id === 'time') return `<div class="mini-clock">${icon('clock')}</div>`;
  if (game.id === 'breath') return '<div class="mini-breath"><span></span><span></span><span></span></div>';
  return `<div class="mini-generic">${icon(game.icon)}</div>`;
}

function card(game) {
  const favorite = saved.favorites.includes(game.id);
  return `<article class="game-card"><a class="card-main" href="#game/${game.id}"><div class="card-content"><h3>${game.name}</h3><p>${game.tag}</p></div><div class="card-preview" aria-hidden="true">${cardPreview(game)}</div><div class="card-footer"><span>${game.kind === 'tool' ? '专注辅助' : '自由练习'}</span><span class="card-arrow">${icon('arrow')}</span></div></a><button class="favorite-button ${favorite ? 'is-favorite' : ''}" data-action="favorite" data-id="${game.id}" aria-label="${favorite ? '取消收藏' : '收藏'}${game.name}" aria-pressed="${favorite}">${icon('star')}</button></article>`;
}

function filteredGames() {
  return games.filter((game) => (view !== 'favorites' || saved.favorites.includes(game.id)) && (category === 'all' || category === game.category) && `${game.name} ${game.id} ${game.tag}`.toLowerCase().includes(search.toLowerCase()));
}

function trainingContent() {
  return `${view === 'training' ? hero() : ''}<section class="training-section" id="training-list" aria-labelledby="training-title"><div class="section-heading"><h2 id="training-title">${view === 'favorites' ? '收藏' : '训练'}<span id="game-count">${filteredGames().length}</span></h2></div><div class="training-toolbar"><div class="filter-tabs" role="group" aria-label="训练分类">${categories.map((item) => `<button class="filter-tab ${category === item.id ? 'active' : ''}" data-action="filter" data-category="${item.id}" aria-pressed="${category === item.id}">${item.name}${item.id === 'all' ? `<span class="filter-count">${view === 'favorites' ? favoriteIds().length : games.length}</span>` : ''}</button>`).join('')}</div><label class="search-field">${icon('search')}<input id="game-search" type="search" placeholder="搜索" aria-label="搜索训练" value="${escapeHtml(search)}"></label></div><div class="game-grid" id="game-grid">${cardsContent()}</div></section>`;
}

function cardsContent() {
  const items = filteredGames();
  return items.length ? ['training', 'tool'].map((kind) => { const group = items.filter((game) => game.kind === kind); return group.length ? `${kind === 'tool' ? '<h3 class="group-heading">工具</h3>' : ''}${group.map(card).join('')}` : ''; }).join('') : `<div class="empty-state">${icon(view === 'favorites' ? 'star' : 'search')}<h3>${view === 'favorites' && !favoriteIds().length ? '暂无收藏.' : '未找到训练.'}</h3><button class="button secondary" data-action="reset-search">全部训练</button></div>`;
}

function recordLabel(record) {
  if (record.rules === CLASSIC_RULES) return `旧规则 · ${record.label ?? legacyRules[record.game]?.levels[record.level] ?? ''}`;
  return `${record.oldRule ? `旧规则 v${record.rules} · ` : ''}${record.modeLabel ?? record.mode} · ${record.label ?? record.preset ?? ''}`;
}

function settingsText(settings) {
  return Object.entries(settings ?? {}).map(([key, value]) => `${key}: ${value}`).join(', ');
}

function recordsContent(stats) {
  const max = Math.max(3, ...stats.week.map((day) => day.count));
  const all = visibleRecords(saved.records);
  const modes = [...new Set(all.filter((r) => !recordGame || r.game === recordGame).map((r) => r.mode))];
  const records = all.filter((r) => (!recordGame || r.game === recordGame) && (!recordMode || r.mode === recordMode)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const bests = visibleBests(saved).filter((r) => r.scored !== false && (!recordGame || r.game === recordGame) && (!recordMode || r.mode === recordMode));
  const tools = visibleTools(saved.tools);
  const filters = `<div class="record-filters"><label>训练<select id="record-game"><option value="">全部训练</option>${games.filter((g) => g.kind === 'training').map((g) => `<option value="${g.id}" ${g.id === recordGame ? 'selected' : ''}>${g.name}</option>`).join('')}</select></label><label>模式<select id="record-mode"><option value="">全部模式</option>${modes.map((id) => `<option value="${escapeHtml(id)}" ${id === recordMode ? 'selected' : ''}>${escapeHtml(all.find((r) => r.mode === id)?.modeLabel ?? (id === 'classic' ? '旧规则' : id))}</option>`).join('')}</select></label></div>`;
  return `<section class="records-summary"><div class="summary-tile"><span>训练</span><b>${all.filter((r) => r.scored !== false).length}<small> 次</small></b></div><div class="summary-tile"><span>时间</span><b>${Math.floor(all.filter((r) => r.scored !== false).reduce((sum, r) => sum + r.duration, 0) / 60)}<small> 分钟</small></b></div><div class="summary-tile"><span>连续</span><b>${stats.streak}<small> 天</small></b></div></section><section class="week-panel"><h2>近 7 天</h2><div class="week-chart">${stats.week.map((day) => `<div class="week-day" title="${day.date}: ${day.count} 次"><span class="week-value">${day.count}</span><div class="week-bar-track"><div class="week-bar ${day.date === localDate() ? 'today' : ''}" style="height:${Math.max(day.count / max * 100, 3)}%"></div></div><span>${day.date === localDate() ? '今天' : `周${day.label}`}</span></div>`).join('')}</div></section><section class="history-section"><div class="section-heading"><h2>历史 <span>${records.length}</span></h2><button class="text-button" data-action="export">导出 ${icon('download')}</button></div>${filters}${records.length ? `<div class="table-wrap"><table><thead><tr><th>训练 / 模式</th><th>设置</th><th>成绩</th><th>输入 / 资格</th><th>日期</th></tr></thead><tbody>${records.map((record) => { const game = games.find((item) => item.id === record.game); return `<tr><td>${game.name}<small class="record-subtitle">${escapeHtml(recordLabel(record))}</small></td><td title="${escapeHtml(settingsText(record.settings))}">${escapeHtml(record.label ?? '')}<small class="record-subtitle">${Math.round(record.duration)} 秒</small></td><td class="record-score">${formatValue(record.value, escapeHtml(record.unit ?? ''), record.precision)}</td><td>${escapeHtml(inputName(record.input ?? '旧版'))}<small class="record-subtitle">${record.scored === false ? '练习, 不计分' : record.rankEligible === false ? '本地有效' : '有效结算'}</small></td><td>${new Date(record.at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty-state">${icon('chart')}<h3>暂无记录.</h3><a class="button primary" href="#training">开始训练</a></div>`}${bests.length ? `<details class="local-bests"><summary>本机最佳 (${bests.length} 个独立分组)</summary>${bests.map((r) => `<p>${games.find((g) => g.id === r.game)?.name ?? ''} · ${escapeHtml(recordLabel(r))} · ${escapeHtml(inputName(r.input ?? 'any'))} <b>${formatValue(r.value, escapeHtml(r.unit ?? ''), r.precision)}</b><small class="record-subtitle">${escapeHtml(settingsText(r.settings))}</small></p>`).join('')}</details>` : ''}<p class="storage-note">仅存于此设备, 保留最近 500 条. 最佳和解锁长期保留. 模式、设置、输入方式与规则版本分别比较.</p>${tools.length ? `<details class="tool-history"><summary>工具记录 (${tools.length})</summary>${tools.slice(-30).reverse().map((r) => `<p>${escapeHtml(games.find((g) => g.id === r.game)?.name ?? r.game)} · ${escapeHtml(r.detail ?? '')} · ${new Date(r.at).toLocaleDateString('zh-CN')}</p>`).join('')}</details>` : ''}</section>`;
}

function guideContent() {
  return `<div class="guide-grid">${[
    ['从简单开始', '熟悉后, 再提高难度.'],
    ['适度休息', '累了, 就停一会儿.'],
    ['与自己比较', '比较同项目、同难度的成绩.'],
    ['数据在本机', '可导出, 不跨设备同步.'],
  ].map(([title, desc]) => `<article class="guide-card"><h2>${title}</h2><p>${desc}</p></article>`).join('')}</div><section class="about-panel"><h2>Focus Lab</h2><p>免费, 无需登录. 仅供练习, 不用于诊断.</p><p>训练按各自规则处理切页. 工具记录单独保存, 不计入训练统计.</p></section>`;
}

function render() {
  stopGame();
  saved = store.load();
  dialogVersion++;
  running = false;
  const route = location.hash.slice(1) || 'training';
  const isGame = route.startsWith('game/');
  if (!isGame) view = ['training', 'favorites', 'records', 'guide'].includes(route) ? route : 'training';
  const stats = summarize(visibleRecords(saved.records));
  const heading = { training: '训练', favorites: '收藏', records: '记录', guide: '关于' }[view];
  app.innerHTML = `${navigation()}<main id="main-content">${view === 'records' || view === 'guide' ? `<div class="page-heading"><h1>${heading}.</h1></div>` : ''}${view === 'records' ? recordsContent(stats) : view === 'guide' ? guideContent() : trainingContent()}<footer class="footer"><span>© 2026 Zcloud Workshop</span><a href="https://github.com/zcloud-workshop/focus-games" target="_blank" rel="noopener noreferrer">GitHub</a><a href="#guide">关于 ${icon('chevron')}</a></footer></main><dialog id="game-dialog" aria-labelledby="dialog-title"><div id="dialog-content"></div></dialog>`;
  document.querySelector('#game-search')?.addEventListener('input', (event) => { search = event.target.value; updateCards(); });
  document.querySelector('#record-game')?.addEventListener('change', (event) => { recordGame = event.target.value; recordMode = ''; render(); });
  document.querySelector('#record-mode')?.addEventListener('change', (event) => { recordMode = event.target.value; render(); });
  const dialog = document.querySelector('#game-dialog');
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeGame(); });
  if (isGame) {
    const game = games.find((item) => item.id === route.split('/')[1]);
    if (game) openGame(game);
    else { toast('没有找到这项训练.'); location.hash = '#training'; }
  } else if (returnFocus) {
    document.querySelector(`a[href="#game/${returnFocus}"]`)?.focus({ preventScroll: true });
    returnFocus = null;
  }
}

function updateCards() {
  document.querySelector('#game-grid').innerHTML = cardsContent();
  document.querySelector('#game-count').textContent = filteredGames().length;
  document.querySelectorAll('.filter-tab').forEach((button) => {
    const active = button.dataset.category === category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
}

function dialogHeader(game) {
  return `<div class="dialog-header"><span class="dialog-game-icon ${game.color}">${icon(game.icon)}</span><h2 id="dialog-title">${game.name}</h2><button class="close-button" data-action="close" aria-label="退出训练, 本轮未完成时不保存">${icon('close')}</button></div>`;
}

async function definitionFor(id) {
  if (!loaded.has(id)) {
    const module = await loadGame(id);
    loaded.set(id, module.definition);
    registerDefinition(module.definition);
  }
  return loaded.get(id);
}

function modeScore() {
  return selection.preset.score ?? selection.mode.score;
}

function fieldsFor() {
  return (selection.preset.fields ?? selection.mode.fields ?? []).map((field) => {
    const resolved = { ...field };
    for (const bound of ['min','max']) {
      const limits = (field[`${bound}ByUnlock`] ?? []).map((limit) => limit[bound]).filter(Number.isFinite);
      if (limits.length) resolved[bound] = bound === 'max' ? Math.max(field.max, ...limits) : Math.min(field.min, ...limits);
    }
    return resolved;
  });
}

function defaultSettings(mode, preset) {
  const defaults = Object.fromEntries((preset.fields ?? mode.fields ?? []).map((field) => [field.key, field.default ?? (field.type === 'checkbox' ? false : field.type === 'select' ? field.options[0]?.value : field.min)]));
  return { ...defaults, ...preset.settings, ...mode.defaultSettings?.(saved,preset) };
}

function selectionKey(input) {
  const { game, mode, preset, settings } = selection;
  if (mode.ruleVersion === 1) return classicBestKey(game.id, preset.level ?? preset.settings?.level ?? 0);
  return bestKey({ game: game.id, mode: mode.id, rules: mode.ruleVersion, config: preset.id, settings, input: input ?? (mode.inputs?.length === 1 ? mode.inputs[0] : 'any') });
}

async function openGame(game) {
  running = false;
  const version = ++dialogVersion;
  const dialog = document.querySelector('#game-dialog');
  dialog.querySelector('#dialog-content').innerHTML = dialogHeader(game) + '<p class="loading-note" role="status">正在加载...</p>';
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('modal-open');
  try {
    const definition = await definitionFor(game.id);
    if (version !== dialogVersion || !dialog.open) return;
    saved = store.load();
    const challenge = dailySession ? dailyChallenges[dailySession.index] : null;
    const mode = challenge ? definition.modes.find((m) => m.id === challenge.mode) : definition.modes[0];
    const preset = challenge ? mode?.presets.find((p) => p.id === challenge.preset) : mode?.presets[0];
    if (!mode || !preset) throw new Error('训练配置不可用');
    selection = { game, definition, mode, preset, settings: defaultSettings(mode, preset) };
    renderSettings();
  } catch {
    if (version !== dialogVersion) return;
    dialog.querySelector('#dialog-content').innerHTML = dialogHeader(game) + `<div class="empty-state"><h3>加载失败.</h3><button class="button primary" data-action="retry" data-id="${game.id}">重试</button></div>`;
  }
}

function renderSettings() {
  saved = store.load();
  const { game, definition, mode, preset, settings } = selection;
  const fields = fieldsFor();
  document.querySelector('#dialog-content').innerHTML = dialogHeader(game) + `<div class="game-intro"><div class="intro-visual">${cardPreview(game)}</div>${dailySession ? `<div class="challenge-progress">今日挑战 <b>${dailySession.index + 1} / ${dailyGames.length}</b></div>` : ''}<label class="mode-label">模式<select id="game-mode">${definition.modes.map((m) => `<option value="${m.id}" ${m.id === mode.id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')}</select></label><p class="game-rule">${escapeHtml(mode.rule)}</p><fieldset class="difficulty-fieldset"><legend>配置</legend><div class="difficulty-options">${mode.presets.map((p) => `<button data-action="preset" data-preset="${p.id}" class="difficulty-option ${p.id === preset.id ? 'active' : ''}" aria-pressed="${p.id === preset.id}">${escapeHtml(p.name)}</button>`).join('')}</div></fieldset>${fields.length ? `<div class="settings-fields">${fields.map((f) => `<label>${escapeHtml(f.label)}${f.type === 'select' ? `<select data-setting="${f.key}">${f.options.map((o) => `<option value="${o.value}" ${String(settings[f.key] ?? f.default) === String(o.value) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}</select>` : f.type === 'checkbox' ? `<input type="checkbox" data-setting="${f.key}" ${(settings[f.key] ?? f.default) ? 'checked' : ''}>` : `<input type="number" data-setting="${f.key}" min="${f.min}" max="${f.max}" step="${f.step ?? 1}" value="${settings[f.key] ?? f.default}">`}${f.unit ? `<small>${escapeHtml(f.unit)}</small>` : ''}</label>`).join('')}</div>` : ''}<p class="settings-error" id="settings-error" role="alert"></p><p class="personal-best" id="personal-best">${bestText()}</p><button class="button primary start-game" data-action="start" data-id="${game.id}">开始 ${icon('arrow')}</button><span class="intro-footnote">${game.kind === 'tool' ? '工具记录单独保存' : mode.scored === false || preset.scored === false ? '练习模式, 不计成绩' : '有效结算后自动保存'}${mode.warning ? `<br>${escapeHtml(mode.warning)}` : ''}</span></div>`;
  document.querySelector('#game-mode').addEventListener('change', (event) => {
    selection.mode = definition.modes.find((m) => m.id === event.target.value);
    selection.preset = selection.mode.presets[0];
    selection.settings = defaultSettings(selection.mode, selection.preset);
    renderSettings();
  });
  document.querySelectorAll('[data-setting]').forEach((input) => input.addEventListener('change', () => {
    const field = fields.find((f) => f.key === input.dataset.setting);
    if (field.type === 'checkbox') settings[field.key] = input.checked;
    else if (field.type === 'select') settings[field.key] = field.options.find((o) => String(o.value) === input.value)?.value;
    else if (input.value.trim() === '' || !Number.isFinite(Number(input.value))) {
      settings[field.key] = field.default ?? field.min;
      input.value = settings[field.key];
    } else settings[field.key] = Number(input.value);
    document.querySelector('#personal-best').innerHTML = bestText();
  }));
  document.querySelector('.start-game').focus();
}

function bestText() {
  if (selection.game.kind === 'tool' || selection.mode.scored === false || selection.preset.scored === false) return '不计训练成绩';
  const best = bestFor(saved, selectionKey());
  if (best) return `最佳 <b>${formatValue(best.value, escapeHtml(modeScore().unit), modeScore().precision)}</b>`;
  const prefix = selectionKey('');
  const inputBests = Object.keys(saved.bests).filter((key) => key.startsWith(prefix)).map((key) => [key.slice(prefix.length), bestFor(saved, key)]).filter(([,best]) => best);
  return inputBests.length ? inputBests.map(([input,best]) => `${escapeHtml(inputName(input))}: ${formatValue(best.value, escapeHtml(best.unit), best.precision)}`).join(' · ') : '暂无同配置记录';
}

function closeGame() {
  dialogVersion++;
  const id = location.hash.split('/')[1];
  stopGame();
  running = false;
  dailySession = null;
  document.querySelector('#game-dialog')?.close();
  document.body.classList.remove('modal-open');
  returnFocus = id;
  location.hash = `#${view}`;
}

function start(game) {
  const { mode, preset, settings } = selection;
  for (const input of document.querySelectorAll('[data-setting]')) {
    if (!input.checkValidity()) { input.reportValidity(); return; }
  }
  const issue = mode.validateSettings?.(settings, store.data) ?? selection.definition.validateSettings?.(settings, mode);
  if (issue) { document.querySelector('#settings-error').textContent = issue; return; }
  stopGame();
  running = true;
  const version = ++dialogVersion;
  const snapshot = { ...selection, settings: { ...settings } };
  document.querySelector('#dialog-content').innerHTML = dialogHeader(game) + `<div class="active-game"><div class="active-game-meta"><span class="live-dot"></span>进行中<span>${escapeHtml(mode.name)} · ${escapeHtml(preset.name)}</span><button class="text-button" data-action="configure">设置</button><button class="text-button" data-action="restart">重开</button></div><div id="play-stage"></div><p class="game-bottom-hint">${icon('info')} ${mode.hiddenPolicy === 'continue' ? '切页后按实际时间继续.' : mode.hiddenPolicy === 'pause' ? '切页时暂停.' : '离开页面将中断本轮.'}</p></div>`;
  stopGame = mountGame({ id: game.id, level: preset.level ?? preset.settings?.level ?? 0, root: document.querySelector('#play-stage'), mode, preset, settings: snapshot.settings, store, onFinish: (result) => { if (version === dialogVersion) showResult(snapshot, result); } });
}

function showResult(config, result) {
  running = false;
  const { game, mode, preset, settings } = config;
  const score = preset.score ?? mode.score;
  const scored = result.scored !== false && mode.scored !== false && preset.scored !== false;
  const valid = validScore(result.value, score);
  let outcome;
  let record;
  if (game.kind === 'tool') {
    if (result.completed !== false && Number.isFinite(result.duration)) {
      record = { ...result, id: createId(), game: game.id, at: new Date().toISOString(), kind: 'tool' };
      outcome = update((data) => addToolRecord(data, record));
    }
  } else if (valid && scored) {
    const rules = result.rules ?? mode.ruleVersion;
    record = { ...result, id: createId(), game: game.id, mode: mode.id, modeLabel: mode.name, rules, config: preset.id, preset: preset.id, settings: result.settings ?? settings, label: preset.name, input: result.input ?? (mode.inputs?.length === 1 ? mode.inputs[0] : 'any'), value: result.value, unit: score.unit, precision: score.precision, lower: score.lower, duration: result.duration, endReason: result.endReason ?? 'completed', scored, at: new Date().toISOString() };
    delete record.trials;
    if (rules === CLASSIC_RULES) record.level = preset.level ?? preset.settings?.level ?? 0;
    const key = rules === CLASSIC_RULES ? classicBestKey(game.id, record.level) : bestKey(record);
    outcome = update((data) => {
      const added = addRecord(data, record, { key, lower: score.lower, score, trials: result.trials });
      if (result.endReason !== 'invalidated') for (const key of result.unlocks ?? []) markUnlocked(data, key);
      return added;
    });
  }
  const isBest = outcome?.result?.isBest;
  const hasNext = scored && valid && dailySession && dailySession.index < dailyGames.length - 1;
  const flattenMetrics = (value, prefix = '', depth = 0) => Object.entries(value ?? {}).flatMap(([key, entry]) => {
    const label = prefix ? `${prefix} · ${key}` : key;
    if (entry === null) return [[label, '无有效样本']];
    if (typeof entry === 'string' || typeof entry === 'number') return [[label, entry]];
    return entry && !Array.isArray(entry) && typeof entry === 'object' && depth < 3 ? flattenMetrics(entry, label, depth + 1) : [];
  });
  const metrics = flattenMetrics(result.metrics);
  document.querySelector('#dialog-content').innerHTML = dialogHeader(game) + `<div class="result-content"><span class="result-check">${icon('check')}</span><h3>${!valid && game.kind !== 'tool' ? '没有有效结果.' : '本轮完成.'}</h3><p>${escapeHtml(result.detail)}</p>${valid ? `<div class="result-value">${formatValue(result.value, escapeHtml(score.unit), score.precision)}</div>` : ''}${isBest ? '<span class="result-badge">新纪录</span>' : ''}<div class="result-details"><span>用时 <b>${Math.round(result.duration ?? 0)} 秒</b></span><span>模式 <b>${escapeHtml(mode.name)}</b></span></div>${metrics.length ? `<details class="result-metrics"><summary>分项结果</summary><dl>${metrics.map(([k,v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(typeof v === 'number' ? Math.round(v * 10000) / 10000 : v)}</dd></div>`).join('')}</dl></details>` : ''}<p class="saved-message">${record ? outcome.ok ? '已保存在本机' : '仅本次打开保留' : scored ? '本轮未保存' : '练习完成, 不计分'}${result.rankEligible === false && record ? ' · 仅本地有效' : ''}</p><div class="result-actions">${hasNext ? '<button class="button primary" data-action="next-daily">下一项 '+icon('arrow')+'</button>' : `<button class="button primary" data-action="retry" data-id="${game.id}">再来一次 ${icon('arrow')}</button>`}<button class="button secondary" data-action="close">返回</button></div></div>`;
  document.querySelector('.result-actions button').focus();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'filter') { category = button.dataset.category; updateCards(); }
  if (action === 'favorite') {
    const id = button.dataset.id;
    const favorite = button.getAttribute('aria-pressed') !== 'true';
    update((data) => setFavorite(data, id, favorite));
    updateCards();
    document.querySelector('.nav-count').textContent = favoriteIds().length || '';
    document.querySelector('.favorite-button[data-id="'+id+'"]')?.focus({ preventScroll: true });
    if (view === 'favorites') document.querySelector('.filter-tab[data-category="all"] span').textContent = favoriteIds().length;
  }
  if (action === 'theme') {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme();
    try { window.localStorage.setItem('focus-lab-theme', theme); }
    catch { toast('主题已切换, 无法保存偏好.'); }
  }
  if (action === 'explore') document.querySelector('#training-list').scrollIntoView();
  if (action === 'reset-search') {
    category = 'all';
    search = '';
    if (view === 'favorites') location.hash = '#training';
    else { document.querySelector('#game-search').value = ''; updateCards(); }
  }
  if (action === 'daily') { dailySession = { index: 0 }; location.hash = `#game/${dailyGames[0]}`; }
  if (action === 'next-daily') { dailySession.index++; location.hash = `#game/${dailyGames[dailySession.index]}`; }
  if (action === 'close') closeGame();
  if (action === 'preset') {
    selection.preset = selection.mode.presets.find((p) => p.id === button.dataset.preset);
    selection.settings = defaultSettings(selection.mode, selection.preset);
    renderSettings();
  }
  if (action === 'configure') { stopGame(); running = false; dialogVersion++; renderSettings(); }
  if (action === 'restart') start(selection.game);
  if (action === 'start') start(games.find((game) => game.id === button.dataset.id));
  if (action === 'retry') { dailySession = null; openGame(games.find((game) => game.id === button.dataset.id)); }
  if (action === 'export') {
    const blob = new Blob([JSON.stringify(exportData(saved), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `focus-lab-${localDate()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('训练记录已导出.');
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden || !running || selection?.mode.hiddenPolicy === 'continue' || selection?.mode.hiddenPolicy === 'pause') return;
  stopGame();
  dialogVersion++;
  running = false;
  const game = games.find((item) => item.id === location.hash.split('/')[1]);
  if (game) {
    document.querySelector('#dialog-content').innerHTML = dialogHeader(game) + `<div class="empty-state">${icon('moon')}<h3>已中断.</h3><p>本轮未保存.</p><button class="button primary" data-action="retry" data-id="${game.id}">重新开始 ${icon('arrow')}</button></div>`;
  }
});

window.addEventListener('hashchange', () => {
  document.body.classList.remove('modal-open');
  if (!location.hash.startsWith('#game/')) dailySession = null;
  render();
});
window.addEventListener('storage', async (event) => {
  if (event.key === 'focus-lab-theme') {
    theme = event.newValue === 'dark' ? 'dark' : 'light';
    applyTheme();
    return;
  }
  if (event.key !== null && event.key !== STORAGE_KEY && event.key !== LEGACY_KEY) return;
  saved = store.load();
  await loadRecordDefinitions();
  if (!location.hash.startsWith('#game/')) render();
});
applyTheme();
render();
function loadRecordDefinitions() {
  const ids = [...saved.records.map((r) => r?.game),...Object.entries(saved.bests).map(([key,best]) => best?.game ?? key.split('|')[0])];
  return Promise.allSettled([...new Set(ids.filter((id) => games.some((g) => g.id === id)))].map(definitionFor));
}
loadRecordDefinitions().then(() => { if (!location.hash.startsWith('#game/')) render(); });

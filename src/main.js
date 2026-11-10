import './style.css';
import { games, categories, dailyGames, localDate, summarize, bestRecord, readSaved } from './core.js';
import { icon } from './icons.js';
import { mountGame } from './games.js';

const app = document.querySelector('#app');
let saved = readSaved();
let view = 'training';
let category = 'all';
let search = '';
let level = 0;
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

function persist() {
  try { window.localStorage.setItem('focus-lab-v1', JSON.stringify(saved)); }
  catch { toast('本机存储不可用, 当前成绩仅在本次打开期间保留.'); }
}

const formatValue = (value, unit) => `${Number.isInteger(value) ? value : value.toFixed(2)} <small>${unit}</small>`;
const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function navigation() {
  return `<header class="site-header"><div class="header-inner">
    <a class="brand" href="#training" aria-label="Focus Lab 首页">${icon('focus')}<span>Focus Lab</span></a>
    <nav aria-label="主导航">
      <a class="nav-link ${view === 'training' ? 'active' : ''}" href="#training" ${view === 'training' ? 'aria-current="page"' : ''}>训练</a>
      <a class="nav-link ${view === 'favorites' ? 'active' : ''}" href="#favorites" ${view === 'favorites' ? 'aria-current="page"' : ''}>收藏<span class="nav-count">${saved.favorites.length || ''}</span></a>
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
  return '<div class="mini-breath"><span></span><span></span><span></span></div>';
}

function card(game) {
  const favorite = saved.favorites.includes(game.id);
  return `<article class="game-card"><a class="card-main" href="#game/${game.id}"><div class="card-content"><h3>${game.name}</h3><p>${game.tag}</p></div><div class="card-preview" aria-hidden="true">${cardPreview(game)}</div><div class="card-footer"><span>${game.time}</span><span class="card-arrow">${icon('arrow')}</span></div></a><button class="favorite-button ${favorite ? 'is-favorite' : ''}" data-action="favorite" data-id="${game.id}" aria-label="${favorite ? '取消收藏' : '收藏'}${game.name}" aria-pressed="${favorite}">${icon('star')}</button></article>`;
}

function filteredGames() {
  return games.filter((game) => (view !== 'favorites' || saved.favorites.includes(game.id)) && (category === 'all' || category === game.category) && `${game.name} ${game.en} ${game.tag}`.toLowerCase().includes(search.toLowerCase()));
}

function trainingContent() {
  return `${view === 'training' ? hero() : ''}<section class="training-section" id="training-list" aria-labelledby="training-title"><div class="section-heading"><h2 id="training-title">${view === 'favorites' ? '收藏' : '训练'}<span id="game-count">${filteredGames().length}</span></h2></div><div class="training-toolbar"><div class="filter-tabs" role="group" aria-label="训练分类">${categories.map((item) => `<button class="filter-tab ${category === item.id ? 'active' : ''}" data-action="filter" data-category="${item.id}" aria-pressed="${category === item.id}">${item.name}${item.id === 'all' ? `<span class="filter-count">${view === 'favorites' ? saved.favorites.length : games.length}</span>` : ''}</button>`).join('')}</div><label class="search-field">${icon('search')}<input id="game-search" type="search" placeholder="搜索" aria-label="搜索训练" value="${escapeHtml(search)}"></label></div><div class="game-grid" id="game-grid">${cardsContent()}</div></section>`;
}

function cardsContent() {
  const items = filteredGames();
  return items.length ? items.map(card).join('') : `<div class="empty-state">${icon(view === 'favorites' ? 'star' : 'search')}<h3>${view === 'favorites' && !saved.favorites.length ? '暂无收藏.' : '未找到训练.'}</h3><button class="button secondary" data-action="reset-search">全部训练</button></div>`;
}

function recordsContent(stats) {
  const max = Math.max(3, ...stats.week.map((day) => day.count));
  const records = [...saved.records].reverse();
  return `<section class="records-summary"><div class="summary-tile"><span>训练</span><b>${records.length}<small> 次</small></b></div><div class="summary-tile"><span>时间</span><b>${Math.floor(records.reduce((sum, r) => sum + r.duration, 0) / 60)}<small> 分钟</small></b></div><div class="summary-tile"><span>连续</span><b>${stats.streak}<small> 天</small></b></div></section><section class="week-panel"><h2>近 7 天</h2><div class="week-chart">${stats.week.map((day) => `<div class="week-day" title="${day.date}: ${day.count} 次"><span class="week-value">${day.count}</span><div class="week-bar-track"><div class="week-bar ${day.date === localDate() ? 'today' : ''}" style="height:${Math.max(day.count / max * 100, 3)}%"></div></div><span>${day.date === localDate() ? '今天' : `周${day.label}`}</span></div>`).join('')}</div></section><section class="history-section"><div class="section-heading"><h2>历史 <span>${records.length}</span></h2><button class="text-button" data-action="export" ${records.length ? '' : 'disabled'}>导出 ${icon('download')}</button></div>${records.length ? `<div class="table-wrap"><table><thead><tr><th>训练</th><th>难度</th><th>成绩</th><th>用时</th><th>日期</th></tr></thead><tbody>${records.map((record) => { const game = games.find((item) => item.id === record.game); return `<tr><td>${game.name}</td><td>${game.levels[record.level]}</td><td class="record-score">${formatValue(record.value, game.unit)}</td><td>${Math.round(record.duration)} 秒</td><td>${new Date(record.at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty-state">${icon('chart')}<h3>暂无记录.</h3><a class="button primary" href="#training">开始训练</a></div>`}<p class="storage-note">仅存于此设备, 保留最近 500 条.</p></section>`;
}

function guideContent() {
  return `<div class="guide-grid">${[
    ['从简单开始', '熟悉后, 再提高难度.'],
    ['适度休息', '累了, 就停一会儿.'],
    ['与自己比较', '比较同项目、同难度的成绩.'],
    ['数据在本机', '可导出, 不跨设备同步.'],
  ].map(([title, desc]) => `<article class="guide-card"><h2>${title}</h2><p>${desc}</p></article>`).join('')}</div><section class="about-panel"><h2>Focus Lab</h2><p>免费, 无需登录. 仅供练习, 不用于诊断.</p><p>离开页面会中断本轮, 不保存成绩.</p></section>`;
}

function render() {
  stopGame();
  running = false;
  const route = location.hash.slice(1) || 'training';
  const isGame = route.startsWith('game/');
  if (!isGame) view = ['training', 'favorites', 'records', 'guide'].includes(route) ? route : 'training';
  const stats = summarize(saved.records);
  const heading = { training: '训练', favorites: '收藏', records: '记录', guide: '关于' }[view];
  app.innerHTML = `${navigation()}<main id="main-content">${view === 'records' || view === 'guide' ? `<div class="page-heading"><h1>${heading}.</h1></div>` : ''}${view === 'records' ? recordsContent(stats) : view === 'guide' ? guideContent() : trainingContent()}<footer class="footer"><span>© 2026 Zcloud Workshop</span><a href="#guide">关于 ${icon('chevron')}</a></footer></main><dialog id="game-dialog" aria-labelledby="dialog-title"><div id="dialog-content"></div></dialog>`;
  document.querySelector('#game-search')?.addEventListener('input', (event) => { search = event.target.value; updateCards(); });
  const dialog = document.querySelector('#game-dialog');
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeGame(); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog && !running) closeGame(); });
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

function openGame(game) {
  running = false;
  level = 0;
  const dialog = document.querySelector('#game-dialog');
  dialog.querySelector('#dialog-content').innerHTML = dialogHeader(game) + `<div class="game-intro"><div class="intro-visual ${game.color}">${cardPreview(game)}</div>${dailySession ? `<div class="challenge-progress">今日挑战 <b>${dailySession.index + 1} / ${dailyGames.length}</b></div>` : ''}<p class="game-rule">${game.rule}</p><fieldset class="difficulty-fieldset"><legend>难度</legend><div class="difficulty-options">${game.levels.map((label, i) => `<button data-action="level" data-level="${i}" class="difficulty-option ${i === level ? 'active' : ''}" aria-pressed="${i === level}">${label}</button>`).join('')}</div></fieldset><p class="personal-best" id="personal-best">${bestText(game)}</p><button class="button primary start-game" data-action="start" data-id="${game.id}">开始 ${icon('arrow')}</button><span class="intro-footnote">完成后自动保存</span></div>`;
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('modal-open');
  dialog.querySelector('.start-game').focus();
}

function bestText(game) {
  const best = bestRecord(saved.records, game.id, level);
  return best ? `最佳 <b>${formatValue(best.value, game.unit)}</b>` : '暂无记录';
}

function closeGame() {
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
  stopGame();
  running = true;
  document.querySelector('#dialog-content').innerHTML = dialogHeader(game) + `<div class="active-game"><div class="active-game-meta"><span class="live-dot"></span>进行中<span>${game.levels[level]}</span></div><div id="play-stage"></div><p class="game-bottom-hint">${icon('info')} 离开页面将中断本轮.</p></div>`;
  stopGame = mountGame({ id: game.id, level, root: document.querySelector('#play-stage'), onFinish: (result) => showResult(game, result) });
}

function showResult(game, result) {
  running = false;
  const oldBest = bestRecord(saved.records, game.id, level);
  const isBest = !oldBest || (game.lower ? result.value < oldBest.value : result.value > oldBest.value);
  saved.records.push({ game: game.id, level, value: result.value, duration: result.duration, at: new Date().toISOString() });
  saved.records = saved.records.slice(-500);
  persist();
  const hasNext = dailySession && dailySession.index < dailyGames.length - 1;
  const challengeDone = dailySession && !hasNext;
  document.querySelector('#dialog-content').innerHTML = dialogHeader(game) + `<div class="result-content"><span class="result-check">${icon('check')}</span><h3>${challengeDone ? '挑战完成.' : '完成.'}</h3><p>${result.detail}</p><div class="result-value">${formatValue(result.value, game.unit)}</div><span class="result-badge">${isBest ? '新纪录' : `最佳 ${oldBest.value} ${game.unit}`}</span><div class="result-details"><span>用时 <b>${Math.round(result.duration)} 秒</b></span><span>难度 <b>${game.levels[level]}</b></span></div><p class="saved-message">${icon('check')}已保存</p><div class="result-actions">${hasNext ? '<button class="button primary" data-action="next-daily">下一项 '+icon('arrow')+'</button>' : `<button class="button primary" data-action="retry" data-id="${game.id}">再来一次 ${icon('arrow')}</button>`}<button class="button secondary" data-action="close">返回</button></div></div>`;
  document.querySelector('.result-actions button').focus();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'filter') { category = button.dataset.category; updateCards(); }
  if (action === 'favorite') {
    const id = button.dataset.id;
    saved.favorites = saved.favorites.includes(id) ? saved.favorites.filter((item) => item !== id) : [...saved.favorites, id];
    persist();
    updateCards();
    document.querySelector('.nav-count').textContent = saved.favorites.length || '';
    document.querySelector('.favorite-button[data-id="'+id+'"]')?.focus({ preventScroll: true });
    if (view === 'favorites') document.querySelector('.filter-tab[data-category="all"] span').textContent = saved.favorites.length;
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
  if (action === 'level') {
    level = Number(button.dataset.level);
    document.querySelectorAll('.difficulty-option').forEach((option) => { const active = Number(option.dataset.level) === level; option.classList.toggle('active', active); option.setAttribute('aria-pressed', active); });
    const game = games.find((item) => item.id === location.hash.split('/')[1]);
    document.querySelector('#personal-best').innerHTML = bestText(game);
  }
  if (action === 'start') start(games.find((game) => game.id === button.dataset.id));
  if (action === 'retry') { dailySession = null; openGame(games.find((game) => game.id === button.dataset.id)); }
  if (action === 'export') {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), records: saved.records }, null, 2)], { type: 'application/json' });
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
  if (!document.hidden || !running) return;
  stopGame();
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
window.addEventListener('storage', (event) => {
  if (event.key === 'focus-lab-theme') {
    theme = event.newValue === 'dark' ? 'dark' : 'light';
    applyTheme();
    return;
  }
  if (event.key !== 'focus-lab-v1' || running) return;
  saved = readSaved();
  if (!location.hash.startsWith('#game/')) render();
});
applyTheme();
render();

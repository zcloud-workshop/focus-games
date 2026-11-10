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

function sidebar(stats) {
  return `<aside class="sidebar">
    <a class="brand" href="#training" aria-label="Focus Lab 首页"><span class="brand-mark">${icon('focus')}</span><span>focus<span class="brand-light">lab</span><small>专注练习室</small></span></a>
    <div class="sidebar-label">你的专注空间</div>
    <nav aria-label="主导航">
      <a class="nav-link ${view === 'training' ? 'active' : ''}" href="#training" ${view === 'training' ? 'aria-current="page"' : ''}>${icon('home')}<span>训练大厅</span><span class="nav-dot"></span></a>
      <a class="nav-link ${view === 'favorites' ? 'active' : ''}" href="#favorites" ${view === 'favorites' ? 'aria-current="page"' : ''}>${icon('star')}<span>我的收藏</span><span class="nav-count">${saved.favorites.length}</span></a>
      <a class="nav-link ${view === 'records' ? 'active' : ''}" href="#records" ${view === 'records' ? 'aria-current="page"' : ''}>${icon('chart')}<span>训练记录</span></a>
    </nav>
    <div class="sidebar-divider"></div>
    <a class="nav-link ${view === 'guide' ? 'active' : ''}" href="#guide">${icon('info')}<span>练习指南</span></a>
    <div class="sidebar-bottom">
      <div class="daily-goal"><div class="goal-heading"><span class="tiny-dot"></span>今天也专注一点</div><div class="goal-progress"><span><b>${Math.min(stats.today, 3)}</b> / 3 <small>次训练</small></span><span>${Math.min(Math.round(stats.today / 3 * 100), 100)}%</span></div><div class="progress-track"><span style="width:${Math.min(stats.today / 3 * 100, 100)}%"></span></div><p>${stats.today >= 3 ? '今日小目标完成, 做得很好.' : '从一次小练习开始, 慢慢来.'}</p></div>
      <div class="sidebar-note">${icon('leaf')} 给自己一段安静的时间</div>
    </div>
  </aside>`;
}

function hero(stats) {
  return `<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><div class="hero-eyebrow"><span></span> A LITTLE FOCUS, EVERY DAY</div><h2 id="hero-title">世界很吵,<br>把专注留给自己.</h2><p>用几个小练习, 让思绪归位.<br>无需准备, 从此刻开始就好.</p><button class="button lime" data-action="daily">开始今日挑战 ${icon('arrow')}</button><span class="hero-footnote">3 项精选训练 · 按自己的节奏完成</span></div>
    <div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><div class="orbit-cross cross-one">+</div><div class="orbit-cross cross-two">+</div><div class="art-dot dot-one"></div><div class="art-dot dot-two"></div><div class="floating-label label-one">stay in the moment</div><div class="focus-object"><div class="focus-object-inner">${icon('focus')}</div></div><div class="floating-grid">${[8, 3, 7, 4, 1, 6, 9, 2, 5].map((n) => `<span class="${n === 1 ? 'highlight' : ''}">${n}</span>`).join('')}</div><div class="floating-label label-two">one step at a time ${icon('arrow')}</div></div>
  </section>
  <section class="quick-stats" aria-label="我的训练概览"><div>${icon('clock')}<span>今日专注 <b>${Math.floor(stats.seconds / 60)}<small> 分钟</small></b></span></div><span class="stat-divider"></span><div>${icon('bolt')}<span>连续练习 <b>${stats.streak}<small> 天</small></b></span></div><span class="stat-divider"></span><div>${icon('check')}<span>累计完成 <b>${saved.records.length}<small> 次</small></b></span></div><span class="stats-note">每一次开始, 都算数.</span></section>`;
}

function cardPreview(game) {
  if (game.id === 'schulte') return `<div class="mini-grid">${[6, 2, 9, 4, 1, 7, 3, 8, 5].map((n) => `<span class="${n === 1 ? 'selected' : ''}">${n}</span>`).join('')}</div>`;
  if (game.id === 'difference') return '<div class="mini-characters">未 未 未<br>未 <b>末</b> 未<br>未 未 未</div>';
  if (game.id === 'color') return `<div class="mini-colors">${Array.from({ length: 9 }, (_, i) => `<span class="${i === 4 ? 'different' : ''}"></span>`).join('')}</div>`;
  if (game.id === 'sequence') return `<div class="mini-sequence">${Array.from({ length: 9 }, (_, i) => `<span class="${[0, 4, 7].includes(i) ? 'selected' : ''}"></span>`).join('')}</div>`;
  if (game.id === 'numbers') return '<div class="mini-number">7<span>2</span>9<span>4</span></div>';
  if (game.id === 'nback') return '<div class="mini-back"><span>B</span><span>F</span><b>B</b><i></i></div>';
  if (game.id === 'stroop') return '<div class="mini-stroop"><span>蓝</span><b>红</b><span>绿</span></div>';
  if (game.id === 'reaction') return `<div class="mini-bolt">${icon('bolt')}<span>ready?</span></div>`;
  if (game.id === 'gonogo') return '<div class="mini-go"><span>●</span><span>×</span></div>';
  if (game.id === 'math') return '<div class="mini-math">12 <span>+</span> 8 <b>= ?</b></div>';
  if (game.id === 'time') return `<div class="mini-clock">${icon('clock')}<span>feel the time</span></div>`;
  return '<div class="mini-breath"><span></span><span></span><span></span></div>';
}

function card(game) {
  const favorite = saved.favorites.includes(game.id);
  const played = saved.records.some((record) => record.game === game.id);
  return `<article class="game-card"><a class="card-main" href="#game/${game.id}"><div class="card-preview ${game.color}"><span class="preview-label">${game.en}</span>${cardPreview(game)}<span class="preview-icon">${icon(game.icon)}</span></div><div class="card-content"><div class="card-title"><h3>${game.name}</h3>${played ? '<span class="played-dot" title="已练习"></span>' : ''}</div><p>${game.desc}</p><div class="card-footer"><span class="skill-tag">${game.tag}</span><span class="card-duration">${icon('clock')}${game.time}</span><span class="card-arrow">${icon('arrow')}</span></div></div></a><button class="favorite-button ${favorite ? 'is-favorite' : ''}" data-action="favorite" data-id="${game.id}" aria-label="${favorite ? '取消收藏' : '收藏'}${game.name}" aria-pressed="${favorite}">${icon('star')}</button></article>`;
}

function filteredGames() {
  return games.filter((game) => (view !== 'favorites' || saved.favorites.includes(game.id)) && (category === 'all' || category === game.category) && `${game.name} ${game.en} ${game.tag}`.toLowerCase().includes(search.toLowerCase()));
}

function trainingContent(stats) {
  return `${view === 'training' ? hero(stats) : '<div class="page-intro"><span class="eyebrow">YOUR COLLECTION</span><h2>喜欢的练习, 随时回来.</h2><p>点亮训练卡片上的星标, 在这里找到你的专注节奏.</p></div>'}
    <section class="training-section" aria-labelledby="training-title"><div class="section-heading"><div><span class="eyebrow">EXPLORE YOUR MIND</span><h2 id="training-title">${view === 'favorites' ? '我的收藏' : '找到今天的专注方式'}<span id="game-count">${filteredGames().length}</span></h2></div><p>小小的练习, 大脑的新鲜感.</p></div><div class="training-toolbar"><div class="filter-tabs" role="group" aria-label="训练分类">${categories.map((item) => `<button class="filter-tab ${category === item.id ? 'active' : ''}" data-action="filter" data-category="${item.id}" aria-pressed="${category === item.id}">${item.name}${item.id === 'all' ? `<span>${view === 'favorites' ? saved.favorites.length : games.length}</span>` : ''}</button>`).join('')}</div><label class="search-field">${icon('search')}<input id="game-search" type="search" placeholder="搜索训练" aria-label="搜索训练" value="${escapeHtml(search)}"></label></div><div class="game-grid" id="game-grid">${cardsContent()}</div></section>
    <div class="gentle-reminder">${icon('leaf')}<p>专注不是一直紧绷, 也要记得给大脑留白.<span>练习之间休息片刻, 按照自己舒适的节奏进行.</span></p><button data-action="breathe">试试呼吸空间 ${icon('arrow')}</button></div>`;
}

function cardsContent() {
  const items = filteredGames();
  return items.length ? items.map(card).join('') : `<div class="empty-state">${icon(view === 'favorites' ? 'star' : 'search')}<h3>${view === 'favorites' && !saved.favorites.length ? '把喜欢的训练留在这里' : '没有找到匹配的训练'}</h3><p>${view === 'favorites' && !saved.favorites.length ? '点击训练卡片上的星标, 开始你的专属收藏.' : '试试其他关键词, 或选择全部训练.'}</p><a class="button secondary" href="#training">浏览全部训练 ${icon('arrow')}</a></div>`;
}

function recordsContent(stats) {
  const max = Math.max(3, ...stats.week.map((day) => day.count));
  const records = [...saved.records].reverse();
  return `<section class="page-intro"><span class="eyebrow">YOUR FOCUS JOURNEY</span><h2>每一份专注, 都有迹可循.</h2><p>看看自己走过的路. 不必和别人比较, 按自己的节奏成长.</p></section><section class="records-summary"><div class="summary-tile"><span>累计训练</span><b>${records.length}<small> 次</small></b>${icon('check')}</div><div class="summary-tile"><span>累计练习时间</span><b>${Math.floor(records.reduce((sum, r) => sum + r.duration, 0) / 60)}<small> 分钟</small></b>${icon('clock')}</div><div class="summary-tile"><span>连续练习</span><b>${stats.streak}<small> 天</small></b>${icon('bolt')}</div></section><section class="week-panel"><div><span class="eyebrow">ONE DAY AT A TIME</span><h3>最近 7 天</h3><p>从一次小小的开始, 慢慢积累.</p></div><div class="week-chart">${stats.week.map((day) => `<div class="week-day" title="${day.date}: ${day.count} 次"><span class="week-value">${day.count}</span><div class="week-bar-track"><div class="week-bar ${day.date === localDate() ? 'today' : ''}" style="height:${Math.max(day.count / max * 100, 3)}%"></div></div><span>${day.date === localDate() ? '今天' : `周${day.label}`}</span></div>`).join('')}</div></section><section class="history-section"><div class="section-heading"><h2>练习记录 <span>${records.length}</span></h2><button class="text-button" data-action="export" ${records.length ? '' : 'disabled'}>${icon('download')}导出记录</button></div>${records.length ? `<div class="table-wrap"><table><thead><tr><th>训练项目</th><th>难度</th><th>成绩</th><th>练习用时</th><th>完成时间</th></tr></thead><tbody>${records.map((record) => { const game = games.find((item) => item.id === record.game); return `<tr><td><span class="table-game-icon ${game.color}">${icon(game.icon)}</span>${game.name}</td><td>${game.levels[record.level]}</td><td class="record-score">${formatValue(record.value, game.unit)}</td><td>${Math.round(record.duration)} 秒</td><td>${new Date(record.at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty-state">${icon('chart')}<h3>你的第一条记录, 从现在开始</h3><p>完成任意一项训练, 就能在这里看到成绩.</p><a class="button primary" href="#training">去练习 ${icon('arrow')}</a></div>`}<p class="storage-note">记录保存在当前浏览器中, 最多保留最近 500 次. 清除浏览器数据会删除记录, 可导出备份.</p></section>`;
}

function guideContent() {
  return `<section class="page-intro"><span class="eyebrow">MAKE ROOM FOR FOCUS</span><h2>给专注一点空间.</h2><p>开始之前, 不需要准备太多. 找一个舒适的位置, 先做一个小练习.</p></section><div class="guide-grid">${[
    ['01', '从简单开始', '初次练习选择最低难度, 熟悉规则后再逐步增加挑战. 舒尔特方格和找不同的字都是不错的起点.'],
    ['02', '换一种思考方式', '搭配视觉、记忆和反应类练习, 或直接选择每日挑战. 不同游戏的分数不能相互比较, 看同一难度下的变化就好.'],
    ['03', '留出休息的时间', '疲劳时就停下来, 看看远处或做几轮自然呼吸. 训练无需追求时长, 以舒适为准.'],
    ['04', '记录属于自己的节奏', '完成训练后自动保存成绩. 个人最佳按训练和难度分别记录, 在训练记录中可以回顾和导出.'],
  ].map(([n, title, desc]) => `<article class="guide-card"><span>${n}</span><h3>${title}</h3><p>${desc}</p></article>`).join('')}</div><section class="about-panel">${icon('focus')}<div><h3>关于 Focus Lab</h3><p>一个轻量、免费的注意力练习空间, 无需注册, 没有广告. 训练结构参考经典的认知任务, 适合日常小游戏和自我观察. 练习表现不代表临床能力评估, 本站不提供诊断或治疗.</p><p>所有练习在浏览器中完成, 训练记录保存在你的设备上. 切换到其他标签页或应用会中断当前训练, 本轮不保存, 避免影响计时和成绩.</p></div></section><a class="button primary" href="#training">开始我的第一项练习 ${icon('arrow')}</a>`;
}

function render() {
  stopGame();
  running = false;
  const route = location.hash.slice(1) || 'training';
  const isGame = route.startsWith('game/');
  if (!isGame) view = ['training', 'favorites', 'records', 'guide'].includes(route) ? route : 'training';
  const stats = summarize(saved.records);
  const heading = { training: '训练大厅', favorites: '我的收藏', records: '训练记录', guide: '练习指南' }[view];
  app.innerHTML = `${sidebar(stats)}<div class="main-shell"><header class="topbar"><span class="breadcrumb">我的空间 ${icon('chevron')} <b>${heading}</b></span><div class="topbar-right"><span class="free-badge"><span></span>免费 · 无需注册</span><span class="avatar">F</span></div></header><main id="main-content"><div class="page-heading"><div><span class="eyebrow">YOUR DAILY MENTAL RESET</span><h1>${heading}<span class="title-dot">.</span></h1></div><span class="today-date">${new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</span></div>${view === 'records' ? recordsContent(stats) : view === 'guide' ? guideContent() : trainingContent(stats)}<footer class="footer"><a href="#training">focuslab <span>专注练习室</span></a><span>慢慢来, 专注会发生.</span><a href="#guide">关于与练习指南 ${icon('arrow')}</a></footer></main></div><dialog id="game-dialog" aria-labelledby="dialog-title"><div id="dialog-content"></div></dialog>`;
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
  return `<div class="dialog-header"><span class="dialog-game-icon ${game.color}">${icon(game.icon)}</span><div><span class="eyebrow">${game.en}</span><h2 id="dialog-title">${game.name}</h2></div><button class="close-button" data-action="close" aria-label="退出训练, 本轮未完成时不保存">${icon('close')}</button></div>`;
}

function openGame(game) {
  running = false;
  level = 0;
  const dialog = document.querySelector('#game-dialog');
  dialog.querySelector('#dialog-content').innerHTML = dialogHeader(game) + `<div class="game-intro"><div class="intro-visual ${game.color}">${cardPreview(game)}</div>${dailySession ? `<div class="challenge-progress">今日挑战 <b>${dailySession.index + 1} / ${dailyGames.length}</b></div>` : ''}<h3>给大脑一点新挑战.</h3><p class="game-rule">${game.rule}</p><fieldset class="difficulty-fieldset"><legend>选择难度</legend><div class="difficulty-options">${game.levels.map((label, i) => `<button data-action="level" data-level="${i}" class="difficulty-option ${i === level ? 'active' : ''}" aria-pressed="${i === level}">${label}</button>`).join('')}</div></fieldset><p class="personal-best" id="personal-best">${bestText(game)}</p><button class="button primary start-game" data-action="start" data-id="${game.id}">开始训练 ${icon('arrow')}</button><span class="intro-footnote">完成后自动记录成绩 · 随时可以退出</span></div>`;
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('modal-open');
  dialog.querySelector('.start-game').focus();
}

function bestText(game) {
  const best = bestRecord(saved.records, game.id, level);
  return best ? `当前难度个人最佳 <b>${formatValue(best.value, game.unit)}</b>` : '当前难度还没有记录, 开始你的第一次吧.';
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
  document.querySelector('#dialog-content').innerHTML = dialogHeader(game) + `<div class="active-game"><div class="active-game-meta"><span class="live-dot"></span>训练进行中<span>${game.levels[level]}</span></div><div id="play-stage"></div><p class="game-bottom-hint">${icon('info')} 保持自然节奏, 离开页面会中断本轮训练.</p></div>`;
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
  document.querySelector('#dialog-content').innerHTML = dialogHeader(game) + `<div class="result-content"><span class="result-check">${icon('check')}</span><span class="eyebrow">${challengeDone ? 'DAILY CHALLENGE COMPLETE' : 'A LITTLE PROGRESS'}</span><h3>${challengeDone ? '今日挑战, 完成了.' : '又完成了一次专注.'}</h3><p>${result.detail}</p><div class="result-value">${formatValue(result.value, game.unit)}</div><span class="result-badge">${isBest ? '当前难度个人新纪录' : `当前难度最佳: ${oldBest.value} ${game.unit}`}</span><div class="result-details"><span>练习用时 <b>${Math.round(result.duration)} 秒</b></span><span>训练难度 <b>${game.levels[level]}</b></span></div><p class="saved-message">${icon('check')}已记录本次成绩</p><div class="result-actions">${hasNext ? '<button class="button primary" data-action="next-daily">继续下一项 '+icon('arrow')+'</button>' : `<button class="button primary" data-action="retry" data-id="${game.id}">再练一次 ${icon('arrow')}</button>`}<button class="button secondary" data-action="close">返回训练大厅</button></div></div>`;
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
    document.querySelector('.nav-count').textContent = saved.favorites.length;
    document.querySelector('.favorite-button[data-id="'+id+'"]')?.focus({ preventScroll: true });
    if (view === 'favorites') document.querySelector('.filter-tab[data-category="all"] span').textContent = saved.favorites.length;
  }
  if (action === 'breathe') location.hash = '#game/breath';
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
    document.querySelector('#dialog-content').innerHTML = dialogHeader(game) + `<div class="empty-state">${icon('moon')}<h3>练习暂时中断了</h3><p>你离开了页面, 本轮成绩未保存.<br>准备好后, 重新开始就好.</p><button class="button primary" data-action="retry" data-id="${game.id}">重新开始 ${icon('arrow')}</button></div>`;
  }
});

window.addEventListener('hashchange', () => {
  document.body.classList.remove('modal-open');
  if (!location.hash.startsWith('#game/')) dailySession = null;
  render();
});
window.addEventListener('storage', (event) => {
  if (event.key !== 'focus-lab-v1' || running) return;
  saved = readSaved();
  if (!location.hash.startsWith('#game/')) render();
});
render();

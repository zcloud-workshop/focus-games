import { createRuntime, inputTime, trackInputs } from '../engines/runtime.js';

const pairs = [['己', '已'], ['未', '末'], ['土', '士'], ['日', '目'], ['人', '入'], ['千', '干'], ['大', '太'], ['木', '本'], ['问', '间'], ['晴', '睛']];
export const definition = { id: 'difference', modes: [
  { id: 'rounds', name: '五局搜索', sources: ['A02'], ruleVersion: 3, presets: [6, 8, 10].map((size) => ({ id: `${size}`, name: `${size} × ${size}`, settings: { size, rounds: 5 }, ...(size > 6 ? { unlock: { requires: [`difference:${size}`] } } : {}) })).concat({ id: 'custom', name: '自定义', unlock: { requires: ['difference:8'] }, settings: { size: 6, rounds: 5 }, fields: [{ key: 'size', label: '网格大小', type: 'number', min: 4, max: 6, maxByUnlock: [{ key: 'difference:8', max: 8 }, { key: 'difference:10', max: 10 }], step: 1 }] }), score: { unit: '秒', lower: true, min: 0, precision: 1 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '每局只有一个不同的字. 五局平均时间为主成绩, 局间休息不计时. 初级平均低于 8 秒解锁中级, 中级低于 12 秒解锁高级.' },
  { id: 'timed', name: '限时找字', sources: ['T06'], ruleVersion: 2, presets: [{ id: 'challenge', name: '限时闯关', settings: { size: 6, seconds: 60, lives: 3, hint: false } }, { id: 'hint', name: '显示目标', settings: { size: 6, seconds: 60, lives: 3, hint: true } }], score: { unit: '关', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '在倒计时内找出不同的字. 每次点错消耗一次机会. 用尽机会或到时结算, 显示目标的成绩单独保存.' },
] };

export function differentBoard(size, round, random = Math.random) {
  const pair = pairs[round % pairs.length];
  const target = Math.floor(random() * size ** 2);
  return { target, cells: Array.from({ length: size ** 2 }, (_, i) => pair[i === target ? 1 : 0]) };
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const inputs = trackInputs();
  let started;
  const timed = mode.id === 'timed';
  let round = 0;
  let errors = 0;
  let board;
  let accepting = false;
  let lastSuccess = 0;
  let presented;
  const times = [];
  const finish = (reason, at = runtime.now()) => {
    const average = times.reduce((sum, value) => sum + value, 0) / times.length;
    runtime.finish({ value: timed ? round : average, duration: timed ? (at - started) / 1000 : times.reduce((sum, value) => sum + value, 0), detail: `找到 ${round} 组, 错误 ${errors} 次`, input: inputs.value, endReason: reason, metrics: { 完成局数: round, 错误次数: errors, 最后成功用时秒: lastSuccess, ...(!timed ? { 单局最佳秒: Math.min(...times), 平均用时秒: average } : {}) }, trials: times.map((seconds) => ({ seconds })), unlocks: !timed && preset.id === '6' && average < 8 ? ['difference:8'] : !timed && preset.id === '8' && average < 12 ? ['difference:10'] : [] });
  };
  const show = () => {
    accepting = false;
    const size = timed ? Math.min(10, settings.size + Math.floor(round / 5)) : settings.size;
    board = differentBoard(size, round, random);
    runtime.frame((at) => {
      presented = at;
      if (started === undefined) {
        started = at;
        if (timed) runtime.later(() => finish('deadline', started + settings.seconds * 1000), Math.max(0, started + settings.seconds * 1000 - runtime.now()));
      }
      root.innerHTML = `<div class="game-status"><span>第 ${round + 1}${timed ? '' : ` / ${settings.rounds}`} 局</span><span data-clock>${timed ? `机会 ${settings.lives - errors}` : `错误 ${errors}`}</span></div>${settings.hint ? `<p class="stage-note">寻找 ${board.cells[board.target]}</p>` : ''}<div class="play-grid character-grid" style="--columns:${size}">${board.cells.map((c,i) => `<button type="button" class="play-cell" data-index="${i}">${c}</button>`).join('')}</div>`;
      accepting = true;
    });
  };
  const respond = (button, event, source) => {
    if (!accepting) return;
    inputs.add(source);
    const at = inputTime(event, runtime.now);
    if (timed && at >= started + settings.seconds * 1000) { finish('deadline',started + settings.seconds * 1000); return; }
    if (Number(button.dataset.index) !== board.target) {
      errors++;
      if (timed) root.querySelector('[data-clock]').textContent = `机会 ${Math.max(0,settings.lives - errors)}`;
      button.classList.add('incorrect');
      runtime.later(() => button.classList.remove('incorrect'), 180);
      if (timed && errors >= settings.lives) finish('lives-exhausted',at);
      return;
    }
    accepting = false;
    round++;
    times.push(Math.round(Math.max(0, at - presented) / 100) / 10);
    lastSuccess = (at - started) / 1000;
    if (timed) show();
    else { button.classList.add('correct'); runtime.later(() => round === settings.rounds ? finish('completed', at) : show(), 700); }
  };
  runtime.listen(root, 'pointerdown', (event) => { const b = event.target.closest('[data-index]'); if (b && event.button === 0) { event.preventDefault(); respond(b, event, event.pointerType === 'touch' ? 'touch' : 'pointer'); } });
  runtime.listen(root, 'keydown', (event) => { if (['Space', 'Enter'].includes(event.code) && !event.repeat && event.target.matches('[data-index]')) { event.preventDefault(); respond(event.target, event, 'keyboard'); } });
  show();
  return runtime.cleanup;
}

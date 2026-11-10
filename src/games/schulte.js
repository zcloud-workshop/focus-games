import { shuffle } from '../core.js';
import { createRuntime, inputTime } from '../engines/runtime.js';
import { animate, RINGS, ringRotation } from '../engines/animation.js';

const sizeField = { key: 'size', label: '每边格数', type: 'number', default: 5, min: 3, max: 7, step: 1 };
const aPresets = () => [5, 6, 7].map((size, i) => ({ id: ['beginner', 'intermediate', 'advanced'][i], name: `${size} × ${size}`, settings: { size } })).concat({ id: 'custom', name: '自定义', settings: { size: 5 }, fields: [sizeField] });
const common = { ruleVersion: 2, score: { unit: '秒', lower: true, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'] };
export const definition = {
  id: 'schulte',
  modes: [
    ...['numbers', 'verse', 'idioms'].map((id, i) => ({ ...common, id, name: ['数字顺序', '短句顺序', '成语顺序'][i], sources: ['A01'], presets: aPresets(), rule: i ? '按提示文字的顺序点击. 重复的字可点击任意一个尚未选中的相同字. 完成后记录用时.' : '从 1 开始按顺序点击所有数字. 点错不前进, 计时继续.' })),
    { ...common, id: 'shapes', name: '多形态搜索', sources: ['T05'], presets: [4, 5, 6, 7, 8, 9].map((size) => ({ id: `${size}`, name: `${size} × ${size}`, settings: { size, shape: 'classic', order: 'ascending', colorful: false } })), fields: [{ key: 'shape', label: '形态', type: 'select', options: ['classic', 'irregular', 'pebbles', 'honeycomb', 'ring'].map((value, i) => ({ value, label: ['方格', '不规则', '鹅卵石', '蜂巢', '圆环'][i] })) }, { key: 'order', label: '顺序', type: 'select', options: ['ascending', 'descending', 'odd', 'even', 'drift'].map((value, i) => ({ value, label: ['顺序', '倒序', '奇数', '偶数', '漂移'][i] })) }, { key: 'colorful', label: '多色数字', type: 'checkbox', default: false }], rule: '依照选定顺序搜索数字. 点错不推进. 奇数和偶数只需完成对应数字, 漂移会改变数字位置.' },
    { ...common, ruleVersion: 3, id: 'penalty-grid', name: '标准方格', sources: ['C03'], presets: [{ id: '5x5', name: '5 × 5', settings: { size: 5, penalty: 2 } }], rule: '按 1-25 顺序点击. 错误不前进, 每次错误加 2 秒. 原始用时和罚时分别记录.' },
    { ...common, ruleVersion: 3, id: 'rotating-rings', name: '旋转圆环', sources: ['C04'], presets: [{ id: '42', name: '三个圆环 · 42 数字', settings: { size: 42, penalty: 2 } }], warning: '此训练需要持续移动画面.', rule: '三个圆环独立旋转. 依次点击 1-42, 每次错误加 2 秒.' },
  ],
};

export function schulteItems(mode, size, random = Math.random) {
  const count = mode === 'rotating-rings' ? 42 : size ** 2;
  const text = mode === 'verse' ? '晨光照进小窗微风轻拂树梢我们放慢脚步静听林间鸟鸣抬头望见远山低头发现新芽' : '专心致志循序渐进持之以恒从容不迫聚精会神脚踏实地温故知新学而不厌熟能生巧';
  const labels = Array.from({ length: count }, (_, i) => ['verse', 'idioms'].includes(mode) ? text[i % text.length] : String(i + 1));
  return { labels, cells: shuffle(labels.map((label, index) => ({ label, index })), random) };
}

export function targetOrder(size, order) {
  const values = Array.from({ length: size ** 2 }, (_, i) => i);
  if (order === 'descending') return values.reverse();
  if (order === 'odd') return values.filter((v) => v % 2 === 0);
  if (order === 'even') return values.filter((v) => v % 2 === 1);
  return values;
}

export function circularSlots(count) {
  let rings = 1;
  while (3 * rings * (rings + 1) < count) rings++;
  const slots = [];
  for (let ring = 1; slots.length < count; ring++) {
    const ringCount = Math.min(6 * ring,count - slots.length);
    for (let i = 0; i < ringCount; i++) {
      const angle = i / ringCount * Math.PI * 2;
      const radius = ring / rings * 0.45;
      slots.push({x:0.5 + Math.cos(angle) * radius,y:0.5 + Math.sin(angle) * radius});
    }
  }
  return slots;
}

function ringBoard(cells) {
  let index = 0;
  const point = (radius, angle) => [50 + Math.sin(angle) * radius,50 - Math.cos(angle) * radius];
  return `<svg viewBox="0 0 100 100" class="rotating-board">${RINGS.map((ring,r) => `<g data-ring="${r}">${Array.from({length:ring.count},(_,i) => {
    const half = Math.PI / ring.count - 0.012;
    const angle = i / ring.count * Math.PI * 2;
    const a = point(ring.inner,angle - half), b = point(ring.outer,angle - half), c = point(ring.outer,angle + half), d = point(ring.inner,angle + half);
    const label = point((ring.inner + ring.outer) / 2,angle);
    const number = cells[index].label;
    return `<g data-index="${index++}" tabindex="0" role="button" aria-label="数字 ${number}"><path d="M${a}L${b}A${ring.outer} ${ring.outer} 0 0 1 ${c}L${d}A${ring.inner} ${ring.inner} 0 0 0 ${a}Z"/><text x="${label[0]}" y="${label[1]}" text-anchor="middle" dominant-baseline="central">${number}</text></g>`;
  }).join('')}</g>`).join('')}</svg>`;
}

export function mount({ root, mode, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const rotating = mode.id === 'rotating-rings';
  const { labels, cells } = schulteItems(mode.id, settings.size, random);
  const order = rotating ? Array.from({ length: 42 }, (_, i) => i) : targetOrder(settings.size, settings.order);
  const textMode = ['verse', 'idioms'].includes(mode.id);
  let position = 0;
  let errors = 0;
  let started;
  let pausedAt = null;
  let pausedMs = 0;
  let driftAt = 0;
  const inputs = new Set();
  root.innerHTML = `<div class="game-status"><span>下一个 <b data-next>${labels[order[0]]}</b></span><span data-elapsed>0.0 秒</span></div>${textMode ? `<p class="sequence-prompt">${labels.join('')}</p>` : ''}<div class="${rotating || settings.shape === 'ring' ? 'ring-board' : 'play-grid schulte-grid'} shape-${settings.shape ?? 'classic'}" style="--columns:${rotating ? 7 : settings.size};--cell-count:${cells.length}">${rotating ? ringBoard(cells) : cells.map((cell, i) => `<button type="button" class="play-cell" data-index="${i}" ${settings.colorful ? `style="color:hsl(${i * 137.5 % 360} 60% 40%)"` : ''}>${cell.label}</button>`).join('')}</div>`;
  const board = root.querySelector('.play-grid, .ring-board');
  const buttons = [...board.querySelectorAll('[data-index]')];
  if (mode.id === 'penalty-grid') {
    board.insertAdjacentHTML('afterend','<button type="button" class="button secondary centered" data-pause disabled>暂停</button>');
    board.style.visibility = 'hidden';
  }
  const ringSlots = settings.shape === 'ring' ? circularSlots(cells.length) : [];
  const place = (button, point) => { button.style.left = `${point.x * 100}%`; button.style.top = `${point.y * 100}%`; };
  if (settings.shape === 'ring') buttons.forEach((button, i) => {
    place(button,ringSlots[i]);
    button.classList.add('ring-cell');
  });
  const updateNext = () => { root.querySelector('[data-next]').textContent = labels[order[position]]; };
  const respond = (button, event, input) => {
    if (button.disabled || started === undefined || pausedAt !== null) return;
    inputs.add(input);
    const cell = cells[Number(button.dataset.index)];
    if (mode.id === 'penalty-grid' && cell.index < order[position]) return;
    const correct = textMode ? cell.label === labels[order[position]] : cell.index === order[position];
    if (!correct) { errors++; button.classList.add('incorrect'); runtime.later(() => button.classList.remove('incorrect'), 180); return; }
    if (mode.id === 'penalty-grid') {
      button.classList.add('correct');
      runtime.later(() => button.classList.remove('correct'),150);
    } else {
      button.disabled = true;
      button.setAttribute('aria-disabled','true');
      button.classList.add('found');
    }
    position++;
    if (position === order.length) {
      const raw = Math.max(0, inputTime(event, runtime.now) - started - pausedMs) / 1000;
      const penalty = errors * (settings.penalty ?? 0);
      runtime.finish({ value: raw + penalty, duration: raw, detail: `完成 ${position} 项, 误触 ${errors} 次`, input: inputs.size === 1 ? [...inputs][0] : 'mixed', endReason: 'completed', rankEligible: !rotating || raw + penalty <= 180, metrics: { 原始用时秒: raw, 错误次数: errors, 罚时秒: penalty, 调整后秒: raw + penalty } });
      return;
    }
    updateNext();
  };
  runtime.listen(board, 'pointerdown', (event) => { const button = event.target.closest('[data-index]'); if (button && event.button === 0) { event.preventDefault(); respond(button, event, event.pointerType === 'touch' ? 'touch' : 'pointer'); } });
  runtime.listen(board, 'keydown', (event) => { if (['Enter', 'Space'].includes(event.code) && !event.repeat && event.target.matches('[data-index]')) { event.preventDefault(); respond(event.target, event, 'keyboard'); } });
  runtime.listen(root,'click',(event) => {
    const pause = event.target.closest('[data-pause]');
    if (!pause || started === undefined) return;
    if (pausedAt === null) pausedAt = inputTime(event,runtime.now);
    else { pausedMs += inputTime(event,runtime.now) - pausedAt; pausedAt = null; }
    board.classList.toggle('board-paused',pausedAt !== null);
    pause.textContent = pausedAt === null ? '暂停' : '继续';
  });
  const begin = () => runtime.frame((at) => {
    started = at;
    board.style.visibility = '';
    const pause = root.querySelector('[data-pause]');
    if (pause) pause.disabled = false;
    animate(runtime, (_, now) => {
      root.querySelector('[data-elapsed]').textContent = `${(((pausedAt ?? now) - started - pausedMs) / 1000).toFixed(1)} 秒`;
      if (rotating) board.querySelectorAll('[data-ring]').forEach((ring,i) => ring.setAttribute('transform',`rotate(${ringRotation(i,(now - started) / 1000)} 50 50)`));
      if (settings.order === 'drift' && now - driftAt > 1600) {
        driftAt = now;
        if (ringSlots.length) shuffle(ringSlots,random).forEach((point,i) => place(buttons[i],point));
        else shuffle(buttons, random).forEach((button) => board.append(button));
      }
    });
  });
  if (mode.id === 'penalty-grid') runtime.later(begin,1000);
  else begin();
  return runtime.cleanup;
}

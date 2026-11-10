import { createRuntime, inputTime, trackInputs } from '../engines/runtime.js';
import { scatter, trailSequence } from '../engines/grid.js';
import { printSheets } from '../engines/print.js';

const common = { sources: ['C29'], ruleVersion: 2, score: { unit: '秒', lower: true, min: 0, precision: 3 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'] };
export const definition = { id: 'trail-making', modes: [
  { ...common, id: 'ab', name: '数字与交替', presets: [{ id: 'both', name: 'A + B', settings: { parts: ['A','B'] } }], rule: 'A 按 1-25 连接; B 按 1-A-2-B 直到 13. 圆点出现开始计时, 错误不前进, 中间休息不计时.' },
  { ...common, id: 'a', name: '数字连线', presets: [{ id: 'a', name: '1-25', settings: { parts: ['A'] } }], rule: '从 1 到 25 点击散点, 点错不前进, 计时继续.' },
  { ...common, id: 'b', name: '数字字母交替', presets: [{ id: 'b', name: '1-A-2-B', settings: { parts: ['B'] } }], rule: '按数字和字母交替连接: 1-A-2-B, 直到 12-L-13.' },
  { ...common, id: 'practice', name: '五点练习', scored: false, presets: [{ id: 'five', name: '5 点', settings: { parts: ['A'], count: 5 } }], rule: '按顺序连接五个点. 练习不计成绩.' },
  { ...common, id: 'print', name: '打印练习', scored: false, presets: [{ id: 'worksheets', name: 'A + B 练习表', settings: { parts: ['A','B'], print: true } }], rule: '使用同一组散点生成练习题和单独的答案页. 可打印或另存 PDF, 不计成绩.' },
] };

function trailSvg(points, labels, connected = 0) {
  return `<svg class="trail-lines" viewBox="0 0 100 100" aria-hidden="true">${points.slice(1,connected).map((p,i) => `<line x1="${points[i].x * 100}" y1="${points[i].y * 100}" x2="${p.x * 100}" y2="${p.y * 100}"/>`).join('')}</svg>${points.map((p,i) => `<button type="button" class="trail-point ${i < connected ? 'found' : ''}" data-point="${i}" style="left:${p.x * 100}%;top:${p.y * 100}%" aria-label="${labels[i]}">${labels[i]}</button>`).join('')}`;
}

export function mount({ root, mode, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const inputs = trackInputs();
  const layouts = settings.parts.map((part) => ({ part, labels: trailSequence(part).slice(0,settings.count ?? 25), points: scatter(settings.count ?? 25,random,5) }));
  let partIndex = 0;
  let position = 0;
  let errors = 0;
  let partErrors = 0;
  let started;
  let phase = 'ready';
  let cleanupPrint = () => {};
  const trials = [];
  const show = () => {
    phase = 'rendering';
    position = 0;
    partErrors = 0;
    const layout = layouts[partIndex];
    runtime.frame((at) => {
      root.innerHTML = `<div class="game-status"><span>${layout.part} · 下一个 <b data-next>${layout.labels[0]}</b></span><span>错误 <b data-errors>${errors}</b></span></div><div class="trail-board">${trailSvg(layout.points,layout.labels)}</div>`;
      started = at;
      phase = 'answering';
    });
  };
  const answer = (button,event,input) => {
    if (phase !== 'answering') return;
    inputs.add(input);
    if (Number(button.dataset.point) !== position) { errors++; partErrors++; root.querySelector('[data-errors]').textContent = errors; button.classList.add('incorrect'); runtime.later(() => button.classList.remove('incorrect'),180); return; }
    position++;
    const layout = layouts[partIndex];
    if (position === layout.labels.length) {
      phase = 'break';
      trials.push({ part: layout.part, seconds: Math.max(0,inputTime(event,runtime.now) - started) / 1000, errors: partErrors });
      partIndex++;
      if (partIndex === layouts.length) runtime.finish({ value: trials.reduce((s,t) => s + t.seconds,0), duration: trials.reduce((s,t) => s + t.seconds,0), input: inputs.value, endReason: 'completed', scored: mode.scored !== false, detail: `${settings.parts.join(' + ')} 完成, 误触 ${errors} 次, 段间休息未计时`, metrics: { A用时秒: trials.find((t) => t.part === 'A')?.seconds, B用时秒: trials.find((t) => t.part === 'B')?.seconds, 错误次数: errors }, trials });
      else root.innerHTML = '<div class="stimulus">稍作休息</div><p class="stage-note">休息时间不计入成绩</p><button type="button" class="button primary centered" data-continue>开始 B</button>';
      return;
    }
    root.querySelector('.trail-board').innerHTML = trailSvg(layout.points,layout.labels,position);
    root.querySelector('[data-next]').textContent = layout.labels[position];
  };
  runtime.listen(root,'pointerdown',(event) => { const b = event.target.closest('[data-point]'); if (b && event.button === 0) { event.preventDefault(); answer(b,event,event.pointerType === 'touch' ? 'touch' : 'pointer'); } });
  runtime.listen(root,'keydown',(event) => { if (['Enter','Space'].includes(event.code) && !event.repeat && event.target.matches('[data-point]')) { event.preventDefault(); answer(event.target,event,'keyboard'); } });
  runtime.listen(root,'click',(event) => {
    if (event.target.closest('[data-continue]') && phase === 'break') show();
    if (event.target.closest('[data-print]')) {
      cleanupPrint();
      cleanupPrint = printSheets({ title: '交替连线练习', pages: layouts.flatMap((layout) => [`<h2>${layout.part} · 练习</h2><div class="trail-board print-trail">${trailSvg(layout.points,layout.labels)}</div>`, `<h2>${layout.part} · 答案</h2><div class="trail-board print-trail">${trailSvg(layout.points,layout.labels,layout.labels.length)}</div>`]) });
    }
  });
  runtime.listen(window,'resize',() => { if (phase === 'answering') runtime.finish({ value: null, scored: false, endReason: 'resized', detail: '画面尺寸已改变, 本轮不保存.' }); });
  if (settings.print) root.innerHTML = `<p class="stage-note">练习题和答案分别成页.</p><div class="trail-board">${trailSvg(layouts[0].points,layouts[0].labels)}</div><button type="button" class="button primary centered" data-print>打印 / 另存 PDF</button>`;
  else show();
  return () => { cleanupPrint(); runtime.cleanup(); };
}

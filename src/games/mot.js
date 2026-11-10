import { shuffle } from '../core.js';
import { createRuntime, trackInputs } from '../engines/runtime.js';
import { advanceParticle, animate } from '../engines/animation.js';
import { scatter } from '../engines/grid.js';

const common = { ruleVersion: 2, score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], warning: '此训练需要持续移动画面.' };
export const definition = { id: 'mot', modes: [
  { ...common, id: 'fixed', name: '单局追踪', sources: ['A05'], ruleVersion: 3, score: { unit: '个', lower: false, min: 0 }, presets: [[8,3,5],[10,4,6],[12,5,8]].map(([count,targets,seconds]) => ({ id: `${count}-${targets}`, name: `${count} 追 ${targets}`, settings: { count, targets, seconds, speed: 0.18 }, ...(count > 8 ? { unlock: { requires: [`mot:${count}`] } } : {}) })).concat({ id: 'custom', name: '自定义', unlock: { requires: ['mot:10'] }, settings: { count: 8, targets: 3, seconds: 6, speed: 0.18 }, fields: [{ key: 'count', label: '对象数量', type: 'number', min: 6, max: 8, maxByUnlock: [{ key: 'mot:10', max: 10 }, { key: 'mot:12', max: 12 }], step: 1 }, { key: 'targets', label: '追踪数量', type: 'number', min: 2, max: 3, maxByUnlock: [{ key: 'mot:10', max: 4 }, { key: 'mot:12', max: 5 }], step: 1 }, { key: 'seconds', label: '移动时长', type: 'number', min: 5, minByUnlock: [{ key: 'mot:10', min: 6 }, { key: 'mot:12', min: 8 }], max: 10, step: 1, unit: '秒' }] }), defaultSettings: (data, preset) => preset.id === 'custom' ? { seconds: data.unlocks['mot:12'] ? 8 : data.unlocks['mot:10'] ? 6 : 5 } : {}, validateSettings: (s) => s.targets > s.count ? '追踪数量不能超过对象数量.' : null, rule: '记住高亮 2 秒的目标, 在移动停止后依次指认. 每个选择立即确认, 选满后结算正确个数. 全对解锁下一预设.' },
  { ...common, id: 'levels', name: '逐关追踪', sources: ['T09'], presets: [1,2,3,4].map((targets) => ({ id: `${targets}`, name: `追踪 ${targets} 个`, settings: { count: 8, targets, seconds: 5, speed: 0.16 } })), score: { unit: '关', lower: false, min: 0 }, rule: '记住目标并在移动后指认. 每过一关速度增加, 选错结束.' },
  { ...common, id: 'glow', name: '光点追踪', sources: ['C16'], ruleVersion: 3, presets: [{ id: 'progressive', name: '渐进追踪', settings: { startLevel: 1 }, fields: [{ key: 'startLevel', label: '起始关卡', type: 'number', min: 1, max: 20, step: 1 }] }], score: { unit: '分', lower: false, min: 0 }, rule: '高亮观察 3.5 秒后继续追踪, 停止后选择目标并确认. 命中每个 100 分, 误选每个扣 50 分, 全对另加当前关卡 × 50 分. 全对自动进下一关, 其他情况结算.' },
] };

export function trackingTargets(count, targets, random = Math.random) {
  return new Set(shuffle(Array.from({ length: count }, (_, i) => i), random).slice(0, targets));
}

export function glowParameters(level) {
  return { count: Math.min(4 + level, 20), targets: Math.min(1 + Math.floor(level / 3), 6), speed: Math.min(0.8 + level * 0.1, 3), seconds: Math.min(3 + level * 0.5, 10) };
}

export function trackingPoints(correct, wrong, missed, level) {
  return Math.max(0, correct * 100 + (wrong === 0 && missed === 0 ? level * 50 : 0) - wrong * 50);
}

export function moveTargets(particles, seconds, width, height, diameter = 36) {
  const steps = Math.max(1,Math.ceil(seconds / 0.02));
  const dt = seconds / steps;
  let result = particles.map((p) => ({ ...p }));
  for (let step = 0; step < steps; step++) {
    result = result.map((p) => advanceParticle(p,dt));
    for (let pass = 0; pass < 5; pass++) for (let i = 0; i < result.length; i++) for (let j = i + 1; j < result.length; j++) {
      const a = result[i], b = result[j];
      const dx = (a.x - b.x) * width, dy = (a.y - b.y) * height;
      const distance = Math.hypot(dx,dy);
      if (distance >= diameter) continue;
      const nx = distance ? dx / distance : 1, ny = distance ? dy / distance : 0;
      const push = (diameter - distance) / 2 + 0.001;
      a.x = Math.max(0,Math.min(1,a.x + nx * push / width));
      a.y = Math.max(0,Math.min(1,a.y + ny * push / height));
      b.x = Math.max(0,Math.min(1,b.x - nx * push / width));
      b.y = Math.max(0,Math.min(1,b.y - ny * push / height));
      const approach = (a.vx - b.vx) * width * nx + (a.vy - b.vy) * height * ny;
      if (approach < 0) {
        a.vx -= approach * nx / width; a.vy -= approach * ny / height;
        b.vx += approach * nx / width; b.vy += approach * ny / height;
      }
    }
  }
  return result;
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const inputs = trackInputs();
  let round = 0;
  let phase = 'study';
  let target;
  let selected;
  let particles;
  let targetCount;
  let hits = 0;
  let total = 0;
  let points = 0;
  let level = settings.startLevel ?? 1;
  const trials = [];
  const finish = (reason) => runtime.finish({ value: mode.id === 'fixed' ? hits : mode.id === 'glow' ? points : round, detail: `${round} 轮, 正确指认 ${hits} / ${total} 个目标`, input: inputs.value, endReason: reason, metrics: { 命中目标: hits, 总目标: total, 完成关数: round }, trials, unlocks: mode.id === 'fixed' && hits === total ? preset.id === '8-3' ? ['mot:10'] : preset.id === '10-4' ? ['mot:12'] : [] : [] });
  const show = () => {
    phase = mode.id === 'glow' ? 'watching' : 'study';
    const config = mode.id === 'glow' ? glowParameters(level) : settings;
    targetCount = config.targets;
    target = trackingTargets(config.count, targetCount, random);
    selected = new Set();
    const speed = mode.id === 'glow' ? config.speed * 0.08 : settings.speed + (mode.id === 'fixed' ? 0 : round * 0.015);
    particles = scatter(config.count, random, 4).map((point) => { const angle = random() * Math.PI * 2; return { ...point, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }; });
    root.innerHTML = `<div class="game-status"><span>第 ${round + 1} 轮 · 追踪 ${targetCount} 个</span><span data-phase>记住高亮目标</span></div><div class="motion-board tracking-board">${particles.map((p,i) => `<button type="button" class="tracking-dot ${target.has(i) ? 'target' : ''} ${mode.id === 'glow' ? 'glow-object' : ''}" data-index="${i}" aria-label="对象 ${i + 1}" style="left:${6 + p.x * 88}%;top:${6 + p.y * 88}%" disabled></button>`).join('')}</div><button type="button" class="button primary centered" data-submit disabled>确认目标</button>`;
    const board = root.querySelector('.tracking-board');
    particles = moveTargets(particles, 0, board.clientWidth * 0.88, board.clientHeight * 0.88);
    root.querySelectorAll('.tracking-dot').forEach((b,i) => { b.style.left = `${6 + particles[i].x * 88}%`; b.style.top = `${6 + particles[i].y * 88}%`; });
    root.querySelector('[data-submit]').hidden = mode.id === 'fixed';
    root.querySelector('[data-submit]').disabled = mode.id !== 'glow';
    runtime.later(() => {
      phase = 'moving';
      root.querySelector('[data-phase]').textContent = '继续追踪';
      root.querySelectorAll('.tracking-dot').forEach((b) => b.classList.remove('target'));
      runtime.later(() => { phase = 'select'; root.querySelector('[data-phase]').textContent = `选择 ${targetCount} 个目标`; root.querySelectorAll('.tracking-dot').forEach((b) => { b.disabled = false; }); }, config.seconds * 1000);
    }, mode.id === 'glow' ? 3500 : 2000);
  };
  const settle = () => {
    phase = 'feedback';
    const correct = [...selected].filter((i) => target.has(i)).length;
    hits += correct;
    total += targetCount;
    trials.push({ targets: [...target], selected: [...selected], hits: correct });
    const wrong = selected.size - correct;
    const missed = targetCount - correct;
    const success = wrong === 0 && missed === 0;
    if (mode.id === 'glow') points += trackingPoints(correct, wrong, missed, level);
    if (mode.id === 'fixed' || success) round++;
    if (mode.id === 'fixed') runtime.later(() => finish('completed'), 400);
    else if (!success) finish('incorrect');
    else { root.querySelector('[data-phase]').textContent = `${correct} / ${targetCount} 正确`; if (mode.id === 'glow') level++; runtime.later(show, mode.id === 'glow' ? 2300 : 900); }
  };
  const select = (button) => {
    if (phase !== 'select') return;
    const index = Number(button.dataset.index);
    if (mode.id === 'fixed' && selected.has(index)) return;
    if (selected.has(index)) selected.delete(index);
    else if (mode.id === 'glow' || selected.size < targetCount) selected.add(index);
    button.classList.toggle('selected', selected.has(index));
    button.setAttribute('aria-pressed', selected.has(index));
    root.querySelector('[data-submit]').disabled = mode.id !== 'glow' && selected.size !== targetCount;
    if (mode.id === 'fixed' && selected.size === targetCount) settle();
  };
  runtime.listen(root, 'click', (event) => {
    const button = event.target.closest('[data-index]');
    if (button && phase === 'select') { inputs.add(event); select(button); }
    if (!event.target.closest('[data-submit]') || phase !== 'select' || (mode.id !== 'glow' && selected.size !== targetCount)) return;
    inputs.add(event);
    settle();
  });
  animate(runtime, (seconds) => {
    if (phase !== 'moving' && phase !== 'watching') return;
    const board = root.querySelector('.tracking-board');
    particles = moveTargets(particles,seconds,board.clientWidth * 0.88,board.clientHeight * 0.88);
    root.querySelectorAll('.tracking-dot').forEach((b,i) => { b.style.left = `${6 + particles[i].x * 88}%`; b.style.top = `${6 + particles[i].y * 88}%`; });
  });
  show();
  return runtime.cleanup;
}

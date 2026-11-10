import { createRuntime, inputTime, trackInputs } from '../engines/runtime.js';
import { colorPair, rgb } from '../engines/grid.js';
import { advanceParticle, animate } from '../engines/animation.js';

export const definition = { id: 'dynamic-color', modes: [{ id: 'forty', name: '移动辨色', sources: ['T22'], ruleVersion: 2, presets: [{ id: 'standard', name: '40 关', settings: { rounds: 40 } }], score: { unit: '关', lower: false, min: 0, max: 40 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch'], warning: '此训练需要持续移动画面.', rule: '在背景中找到并点击移动的低对比色块. 共四十关, 点错背景结束, 记录最后成功的关卡、色差和用时.' }] };

export function mount({ root, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const inputs = trackInputs();
  let round = 0;
  let pair;
  let particle;
  let accepting = false;
  let lastSuccess = 0;
  let lastDelta = null;
  const started = runtime.now();
  const show = () => {
    accepting = false;
    pair = colorPair(Math.max(0.8, 30 * 0.91 ** round), random);
    const angle = random() * Math.PI * 2;
    const speed = 0.14 + round * 0.008;
    particle = { x: random(), y: random(), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
    root.innerHTML = `<div class="game-status"><span>第 ${round + 1} / ${settings.rounds} 关</span><span>找到移动色块</span></div><div class="motion-board color-motion" style="background:${rgb(pair.base)}"><button type="button" class="moving-color" aria-label="移动色块" style="background:${rgb(pair.target)};left:${particle.x * 82}%;top:${particle.y * 82}%"></button></div>`;
    runtime.frame(() => { accepting = true; });
  };
  runtime.listen(root, 'pointerdown', (event) => {
    const board = event.target.closest('.motion-board');
    if (!board || !accepting || event.button !== 0) return;
    event.preventDefault();
    inputs.add(event);
    accepting = false;
    const correct = Boolean(event.target.closest('.moving-color'));
    if (correct) { round++; lastSuccess = (inputTime(event,runtime.now) - started) / 1000; lastDelta = pair.delta; }
    if (!correct || round === settings.rounds) runtime.finish({ value: round, detail: `完成 ${round} 关`, input: inputs.value, endReason: correct ? 'completed' : 'incorrect', metrics: { 最后成功用时秒: lastSuccess, 最后成功色差: lastDelta } });
    else show();
  });
  show();
  animate(runtime, (seconds) => { if (!accepting) return; particle = advanceParticle(particle, seconds); const button = root.querySelector('.moving-color'); button.style.left = `${particle.x * 82}%`; button.style.top = `${particle.y * 82}%`; });
  return runtime.cleanup;
}

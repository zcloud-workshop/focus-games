import { shuffle } from '../core.js';
import { matchingPositions } from '../engines/boards.js';
import { bindBoardButtons, trackInputs } from '../engines/board-input.js';

export const definition = {
  id: 'bottle-color-matching',
  modes: [{
    id: 'matching', name: '瓶色匹配', ruleVersion: 2,
    presets: [4, 5, 6].map((count) => ({ id: `${count}`, name: `${count} 瓶`, settings: { count } })),
    score: { unit: '秒', lower: true, min: 0 }, hiddenPolicy: 'invalidate',
    inputs: ['pointer', 'touch', 'keyboard', 'mixed'], rule: '交换上排瓶子, 根据匹配数量推断下排隐藏顺序.'
  }]
};

const colors = [
  ['红', '#b84141'], ['蓝', '#3376c5'], ['绿', '#28845f'],
  ['橙', '#c47424'], ['紫', '#8150a5'], ['黄', '#b29920'],
];

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const target = shuffle(Array.from({ length: settings.count }, (_, index) => index), random);
  let current = Array.from({ length: settings.count }, (_, index) => index);
  if (matchingPositions(current, target) === settings.count) current = [...current.slice(1), current[0]];
  let selected = null;
  let started = null;
  let moves = 0;
  let active = true;
  const inputs = trackInputs();
  const cleanup = () => { active = false; controller.abort(); };
  const draw = () => {
    root.innerHTML = `<div class="game-status"><span>位置正确 ${matchingPositions(current, target)} / ${settings.count}</span><span>交换 ${moves} 次</span></div><p class="stage-note">依次选择两个瓶子交换位置</p><div class="play-grid" style="--columns:${settings.count}">${current.map((value, index) => `<button class="play-cell" data-index="${index}" aria-pressed="${selected === index}" aria-label="${colors[value][0]}色瓶" style="background:${colors[value][1]};color:white;${selected === index ? 'outline:3px solid #222' : ''}">${colors[value][0]}</button>`).join('')}</div><div class="play-grid" style="--columns:${settings.count};margin-top:12px">${current.map(() => '<div class="play-cell">?</div>').join('')}</div>`;
  };
  bindBoardButtons(root, 'button[data-index]', (button, input, at) => {
    if (!active) return;
    inputs.add(input);
    const index = Number(button.dataset.index);
    if (selected === null) { selected = index; draw(); return; }
    if (selected === index) { selected = null; draw(); return; }
    if (started === null) started = at;
    [current[index], current[selected]] = [current[selected], current[index]];
    selected = null;
    moves++;
    draw();
    if (matchingPositions(current, target) === settings.count) {
      const duration = Math.max(0, at - started) / 1000;
      cleanup();
      onFinish({ value: duration, detail: `完成 ${settings.count} 瓶匹配, 交换 ${moves} 次`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: inputs.value, endReason: 'complete', scored: true, metrics: { moves }, trials: [] });
    }
  }, controller.signal, () => clock.performance.now());
  draw();
  return cleanup;
}

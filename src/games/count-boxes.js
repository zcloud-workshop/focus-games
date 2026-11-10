export const definition = {
  id: 'count-boxes',
  modes: [{
    id: 'levels', name: '数箱子', ruleVersion: 2,
    presets: [{ id: 'standard', name: '逐关挑战', settings: {} }],
    score: { unit: '关', lower: false, min: 0 }, hiddenPolicy: 'invalidate',
    inputs: ['keyboard', 'pointer'], warning: '本训练会短暂显示图形.',
    rule: '观察立方体堆叠, 消失后输入总数, 被遮挡的下层也要计入.'
  }]
};

export function createBoxScene(level, random = Math.random) {
  const heights = Array(9).fill(0);
  const count = Math.min(27, level + 2);
  for (let i = 0; i < count; i++) {
    const available = heights.flatMap((height, index) => height < 3 ? [index] : []);
    heights[available[Math.floor(random() * available.length)]]++;
  }
  return { heights, count };
}

function sceneSvg(heights) {
  const cubes = [];
  for (let sum = 0; sum <= 4; sum++) {
    for (let row = 0; row < 3; row++) {
      const col = sum - row;
      if (col < 0 || col > 2) continue;
      for (let z = 0; z < heights[row * 3 + col]; z++) {
        const x = 80 + (col - row) * 18;
        const y = 65 + (col + row) * 9 - z * 18;
        cubes.push(`<path d="M ${x} ${y} l 18 -9 18 9 -18 9 Z" fill="#b8d5ed" stroke="#536b7c"/><path d="M ${x} ${y} l 18 9 0 18 -18 -9 Z" fill="#81add0" stroke="#536b7c"/><path d="M ${x + 18} ${y + 9} l 18 -9 0 18 -18 9 Z" fill="#5b8fb7" stroke="#536b7c"/>`);
      }
    }
  }
  return `<svg viewBox="0 0 196 150" width="260" height="200" role="img" aria-label="箱子堆叠">${cubes.join('')}</svg>`;
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const controller = new AbortController();
  const started = clock.performance.now();
  let scene;
  let completed = 0;
  let displayedAt;
  let timer;
  let frame;
  let active = true;
  let accepting = false;
  let lastInput = 'pointer';
  const exposures = [];
  const cleanup = () => { active = false; controller.abort(); clock.clearTimeout(timer); clock.cancelAnimationFrame(frame); };
  const next = () => {
    accepting = false;
    scene = createBoxScene(completed + 1, random);
    root.innerHTML = `<div class="game-status"><span>第 ${completed + 1} 关</span><span>观察箱子</span></div><div style="text-align:center" data-scene></div>`;
    frame = clock.requestAnimationFrame(() => {
      if (!active) return;
      root.querySelector('[data-scene]').innerHTML = sceneSvg(scene.heights);
      displayedAt = clock.performance.now();
      timer = clock.setTimeout(() => { frame = clock.requestAnimationFrame(() => {
        if (!active) return;
        exposures.push(clock.performance.now() - displayedAt);
        accepting = true;
        root.innerHTML = `<div class="game-status"><span>第 ${completed + 1} 关</span><span>输入箱子总数</span></div><form class="number-form"><label>共有多少箱?<input type="number" min="1" max="27" inputmode="numeric" required></label><button class="button primary">确认</button></form>`;
        root.querySelector('input').focus();
      }); }, 2000);
    });
  };
  root.addEventListener('pointerdown', () => { lastInput = 'pointer'; }, { signal: controller.signal });
  root.addEventListener('keydown', () => { lastInput = 'keyboard'; }, { signal: controller.signal });
  root.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!accepting || !active) return;
    accepting = false;
    if (Number(root.querySelector('input').value) === scene.count) { completed++; next(); return; }
    const duration = (clock.performance.now() - started) / 1000;
    cleanup();
    onFinish({ value: completed, detail: `完成 ${completed} 关, 本关共有 ${scene.count} 箱`, duration, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: lastInput, endReason: 'incorrect', scored: true, metrics: { completed }, trials: exposures.map((exposureMs) => ({ exposureMs })) });
  }, { signal: controller.signal });
  next();
  return cleanup;
}

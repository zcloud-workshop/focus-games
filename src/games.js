import { legacyRules } from './core.js';

const modules = import.meta.glob('./games/*.js');

export async function loadGame(id) {
  const loader = modules[`./games/${id}.js`];
  if (loader) return loader();
  const game = legacyRules[id];
  if (!game) throw new Error('训练不存在');
  const legacy = await import('./games/legacy.js');
  return {
    definition: {
      id,
      modes: [{
        id: 'classic', name: '经典', ruleVersion: 1,
        presets: game.levels.map((name, index) => ({ id: String(index), name, settings: { level: index } })),
        score: { unit: game.unit, lower: game.lower, min: 0, max: game.max },
        hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard'], rule: legacy.rules[id],
      }],
    },
    mount: ({ root, preset, settings, onFinish }) => legacy.mountGame({
      id, level: settings?.level ?? Number(preset?.id ?? 0), root, onFinish,
    }),
  };
}

export function mountGame(options) {
  let active = true;
  let stop = () => {};
  const start = async () => {
    options.root.innerHTML = '<p class="stage-note">正在加载训练...</p>';
    try {
      const module = options.module ?? await loadGame(options.id);
      if (!active) return;
      let finished = false;
      stop = module.mount({ ...options, random: options.random ?? Math.random, onFinish: (result) => {
        if (!active || finished) return;
        finished = true;
        options.onFinish(result);
      } }) || (() => {});
    } catch {
      if (!active) return;
      options.root.innerHTML = '<p class="stage-note">训练加载失败.</p><button class="button primary centered" type="button">重试</button>';
      options.root.querySelector('button').addEventListener('click', start, { once: true });
    }
  };
  start();
  return () => { active = false; stop(); };
}

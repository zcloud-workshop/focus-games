import { shuffle } from '../core.js';
import { createRuntime } from '../engines/runtime.js';

const objects = [
  { name: '苹果', aliases: [], drawing: '<path d="M24 14c-3-6-10-3-10 3 0 7 5 12 10 10 5 2 10-3 10-10 0-6-7-9-10-3ZM24 14c0-5 3-7 7-7"/>' },
  { name: '钥匙', aliases: ['钥匙串'], drawing: '<circle cx="16" cy="18" r="6"/><path d="m20 22 12 12m-5-5 3-3m-6 0 3-3"/>' },
  { name: '杯子', aliases: ['杯'], drawing: '<path d="M13 13h20v12a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8Zm20 3h3a4 4 0 0 1 0 8h-3"/>' },
  { name: '眼镜', aliases: ['眼鏡'], drawing: '<circle cx="16" cy="24" r="7"/><circle cx="32" cy="24" r="7"/><path d="M23 23h2M9 22l-3-4m33 4 3-4"/>' },
  { name: '雨伞', aliases: ['伞'], drawing: '<path d="M7 22a17 17 0 0 1 34 0H7Zm17-17v27a4 4 0 0 0 8 0"/>' },
  { name: '铅笔', aliases: ['鉛筆'], drawing: '<path d="m12 31 4-10L31 6l8 8-15 15-12 2Zm4-10 8 8M28 9l8 8"/>' },
  { name: '书', aliases: ['书本', '书籍'], drawing: '<path d="M24 14c-5-4-11-4-17-2v20c6-2 12-2 17 2 5-4 11-4 17-2V12c-6-2-12-2-17 2Zm0 0v20"/>' },
  { name: '时钟', aliases: ['钟', '钟表'], drawing: '<circle cx="24" cy="24" r="16"/><path d="M24 13v11l8 5"/>' },
  { name: '剪刀', aliases: ['剪子'], drawing: '<circle cx="13" cy="31" r="5"/><circle cx="35" cy="31" r="5"/><path d="m17 28 16-19M31 28 15 9"/>' },
  { name: '台灯', aliases: ['灯', '桌灯'], drawing: '<path d="m13 22 8-13h12l6 13H13Zm13 0v11m-8 4h16m-8-4-8 4"/>' },
  { name: '瓶子', aliases: ['瓶'], drawing: '<path d="M20 7h8v6l5 5v19H15V18l5-5V7Zm0 4h8"/>' },
  { name: '手机', aliases: ['电话', '移动电话'], drawing: '<rect x="15" y="6" width="18" height="36" rx="3"/><path d="M20 11h8m-5 26h2"/>' },
  { name: '椅子', aliases: ['椅'], drawing: '<path d="M14 8h20v17H14Zm-3 17h26v5H11Zm3 5v10m20-10v10"/>' },
  { name: '相机', aliases: ['照相机'], drawing: '<path d="M8 16h8l3-5h10l3 5h8v20H8Z"/><circle cx="24" cy="26" r="6"/>' },
];

export const definition = {
  id: 'object-recall',
  modes: [{
    id: 'free-recall', name: '自由回忆', ruleVersion: 2,
    presets: [{ id: 'standard', name: '12 件物品', settings: {} }],
    score: { unit: '个', lower: false, min: 0, max: 12 },
    hiddenPolicy: 'invalidate', inputs: ['keyboard', 'touch'],
    rule: '观察 12 件物品, 准备好后按任意顺序输入名称. 每件物品最多计一次.',
  }],
};

export function makeObjects(random = Math.random) {
  return shuffle(objects, random).slice(0, 12);
}

export function scoreRecall(selected, answers) {
  const matched = new Set();
  for (const answer of answers) {
    const word = answer.trim().normalize('NFKC').toLowerCase();
    const item = selected.find(({ name, aliases }) => [name, ...aliases].some((alias) => alias.toLowerCase() === word));
    if (item) matched.add(item.name);
  }
  return [...matched];
}

export function mount({ root, mode, preset, settings, onFinish, random = Math.random, clock = globalThis }) {
  const runtime = createRuntime({ onFinish, clock });
  const selected = makeObjects(random);
  let phase = 'study';
  root.innerHTML = '<p class="stage-note">记住这些物品. 准备好后进入回忆阶段.</p>' +
    `<div class="play-grid" style="--columns:4">${selected.map(({ name, drawing }) => `<div class="play-cell" style="display:flex;flex-direction:column;align-items:center;justify-content:center"><svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawing}</svg><span>${name}</span></div>`).join('')}</div>` +
    '<button class="button primary centered" type="button" data-ready>准备好了</button>';
  runtime.listen(root, 'click', (event) => {
    if (!event.target.closest('[data-ready]') || phase !== 'study') return;
    phase = 'recall';
    root.innerHTML = '<p class="stage-note">按任意顺序输入记住的物品, 每格一项.</p>' +
      `<form class="number-form"><div class="play-grid" style="--columns:3">${Array.from({ length: 12 }, (_, i) => `<input aria-label="物品 ${i + 1}" autocomplete="off" maxlength="24">`).join('')}</div><button class="button primary" type="submit">提交答案</button></form>`;
    root.querySelector('input').focus();
  });
  runtime.listen(root, 'submit', (event) => {
    event.preventDefault();
    if (phase !== 'recall') return;
    const answers = [...root.querySelectorAll('input')].map((input) => input.value);
    if (!answers.some((answer) => answer.trim())) return;
    phase = 'finished';
    const matched = scoreRecall(selected, answers);
    runtime.finish({ value: matched.length, detail: `记住 ${matched.length} / 12 件物品`, mode: mode.id, preset: preset.id, settings, rules: mode.ruleVersion, input: 'mixed', endReason: 'completed', scored: true, metrics: { correct: matched.length, total: 12 } });
  });
  return runtime.cleanup;
}

import { mountChoices } from '../engines/choices.js';
export const definition = { id: 'stroop', modes: [
  { id: 'ink', name: '颜色判断', ruleVersion: 2, presets: [3, 4, 5].map((colors) => ({ id: String(colors), name: `${colors} 色`, settings: { count: 20, colors, variant: 'ink', window: 4000 } })), score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '选择文字显示的颜色, 忽略字义.' },
  { id: 'comparison', name: '字义与颜色', ruleVersion: 2, presets: [
    { id: 'match', name: '同字匹配', settings: { count: 20, colors: 3, variant: 'match', window: 4000 } },
    { id: 'two-lines', name: '上下匹配', settings: { count: 20, colors: 3, variant: 'two-lines', window: 4000 } },
    { id: 'word', name: '选择字义', settings: { count: 20, colors: 3, variant: 'word', window: 4000 } },
  ], score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '根据配置比较字义和颜色, 或选择字义.' },
  { id: 'six-color', name: '六色计时', ruleVersion: 2, presets: [{ id: '20', name: '20 题', settings: { count: 20, colors: 6, variant: 'ink', window: 4000, penalty: 250 } }], score: { unit: '秒', lower: true, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '选择文字颜色; 按正确题平均时间及错误罚时计算成绩.' },
] };
export const mount = (options) => mountChoices({ ...options, kind: 'stroop' });

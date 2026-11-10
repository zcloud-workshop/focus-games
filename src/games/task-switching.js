import { mountChoices } from '../engines/choices.js';
export const definition = { id: 'task-switching', modes: [{ id: 'switch', name: '规则切换', ruleVersion: 2, presets: [
  { id: 'alternate', name: '交替', settings: { count: 30, order: 'alternate', window: 3000 } },
  { id: 'random', name: '随机', settings: { count: 30, order: 'random', window: 3000 } },
  { id: 'pressure', name: '时间压力', settings: { count: 30, order: 'random', window: 1200 } },
], score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '按照当前提示判断颜色或形状.' }] };
export const mount = (options) => mountChoices({ ...options, kind: 'task-switching' });

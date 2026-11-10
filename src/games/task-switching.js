import { choiceFields, mountChoices } from '../engines/choices.js';
export const definition = { id: 'task-switching', modes: [{ id: 'switch', name: '规则切换', ruleVersion: 3, presets: [
  { id: 'alternate', name: '交替', settings: { count: 30, order: 'alternate', window: 3000 } },
  { id: 'random', name: '随机', settings: { count: 30, order: 'random', window: 3000 }, unlock: { requires: ['task-switching|switch|random'] } },
  { id: 'pressure', name: '时间压力', settings: { count: 30, order: 'random', window: 2000 }, unlock: { requires: ['task-switching|switch|pressure'] } },
  { id: 'custom', name: '自定义', settings: { count: 30, order: 'random', window: 3000, switchRate: 50 }, unlock: { requires: ['task-switching|switch|random'] }, fields: [{ ...choiceFields.count, min: 20, max: 30, step: 5, maxByUnlock: [{ key: 'task-switching|switch|random', max: 40 }, { key: 'task-switching|switch|pressure', max: 50 }] }, { ...choiceFields.window, default: 3000, min: 3000, max: 4000, step: 250, minByUnlock: [{ key: 'task-switching|switch|random', min: 2500 }, { key: 'task-switching|switch|pressure', min: 2000 }] }, { key: 'switchRate', label: '切换比例', type: 'number', default: 50, min: 20, max: 80, step: 10, unit: '%' }] },
], score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '按照当前提示判断颜色或形状.' }] };
export const mount = (options) => mountChoices({ ...options, kind: 'task-switching' });

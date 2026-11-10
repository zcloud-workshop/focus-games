import { mountChoices } from '../engines/choices.js';
export const definition = { id: 'simon', modes: [{ id: 'color-position', name: '颜色判断', ruleVersion: 2, presets: [
  { id: 'slow', name: '慢速', settings: { count: 30, window: 2500 } }, { id: 'standard', name: '标准', settings: { count: 30, window: 1800 } }, { id: 'fast', name: '时间压力', settings: { count: 30, window: 1000 } },
], score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard'], rule: '红色选左, 蓝色选右, 忽略方块出现的位置. 可按 F / J.' }] };
export const mount = (options) => mountChoices({ ...options, kind: 'simon' });

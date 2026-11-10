import { choiceFields, mountChoices } from '../engines/choices.js';
export const definition = { id: 'math', modes: [{ id: 'arithmetic', name: '心算练习', ruleVersion: 3, presets: [
  { id: 'single', name: '一位数', settings: { count: 20, variant: 'single', window: 5000 } },
  { id: 'two-digit', name: '两位数', settings: { count: 20, variant: 'two-digit', window: 4000 }, unlock: { requires: ['math|arithmetic|two-digit'] } },
  { id: 'multiply', name: '乘法与乘加', settings: { count: 20, variant: 'multiply', window: 4000 }, unlock: { requires: ['math|arithmetic|multiply'] } },
  { id: 'custom', name: '自定义', settings: { count: 20, variant: 'single', window: 5000 }, unlock: { requires: ['math|arithmetic|two-digit'] }, fields: [{ ...choiceFields.count, min: 10, max: 20, step: 10, maxByUnlock: [{ key: 'math|arithmetic|two-digit', max: 30 }, { key: 'math|arithmetic|multiply', max: 50 }] }, { ...choiceFields.window, default: 5000, min: 5000, max: 10000, step: 1000, minByUnlock: [{ key: 'math|arithmetic|two-digit', min: 4000 }, { key: 'math|arithmetic|multiply', min: 3000 }] }, { key: 'variant', label: '运算', type: 'select', default: 'single', options: [{ value: 'single', label: '一位数' }, { value: 'two-digit', label: '两位数' }, { value: 'multiply', label: '乘法与乘加' }] }] },
], score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '心算并选择答案, 共 20 题.' }] };
export const mount = (options) => mountChoices({ ...options, kind: 'math' });

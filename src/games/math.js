import { choiceFields, mountChoices } from '../engines/choices.js';
export const definition = { id: 'math', modes: [{ id: 'arithmetic', name: '心算练习', ruleVersion: 2, presets: [
  { id: 'single', name: '一位数', settings: { count: 20, variant: 'single', window: 5000 } },
  { id: 'two-digit', name: '两位数', settings: { count: 20, variant: 'two-digit', window: 7000 } },
  { id: 'multiply', name: '乘除法', settings: { count: 20, variant: 'multiply', window: 7000 } },
  { id: 'custom', name: '自定义', settings: { count: 20, variant: 'single', window: 5000 }, fields: [choiceFields.count, choiceFields.window, { key: 'variant', label: '运算', type: 'select', default: 'single', options: [{ value: 'single', label: '一位数' }, { value: 'two-digit', label: '两位数' }, { value: 'multiply', label: '乘除法' }] }] },
], score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '心算并选择答案, 共 20 题.' }] };
export const mount = (options) => mountChoices({ ...options, kind: 'math' });

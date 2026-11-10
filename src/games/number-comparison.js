import { mountChoices } from '../engines/choices.js';
export const definition = { id: 'number-comparison', modes: [{ id: 'larger', name: '较大数字', ruleVersion: 3, presets: [{ id: '30s', name: '30 秒', settings: { duration: 30 } }], score: { unit: '题', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '在 30 秒内选择较大的数字, 记录正确题数.' }] };
export const mount = (options) => mountChoices({ ...options, kind: 'number-comparison' });

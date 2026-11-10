import { mountChoices } from '../engines/choices.js';
export const definition = { id: 'posner-cue', modes: [{ id: 'cue', name: '线索定向', ruleVersion: 2, presets: [80, 70, 50].map((validRate) => ({ id: String(validRate), name: `有效线索 ${validRate}%`, settings: { count: 30, validRate, window: 2000 } })), score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard'], rule: '先观察线索, 再判断目标出现在左侧还是右侧.' }] };
export const mount = (options) => mountChoices({ ...options, kind: 'posner-cue' });

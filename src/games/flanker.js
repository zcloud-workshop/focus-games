import { mountChoices } from '../engines/choices.js';
export const definition = { id: 'flanker', modes: [
  { id: 'arrows', name: '箭头判断', ruleVersion: 2, presets: [3, 5, 7].map((arrows) => ({ id: String(arrows), name: `${arrows} 个箭头`, settings: { count: 30, arrows, window: 2000 } })), score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '判断中间箭头方向, 忽略两侧箭头.' },
  { id: 'practice-test', name: '练习与测试', ruleVersion: 2, presets: [{ id: 'standard', name: '4 次练习 + 40 次测试', settings: { count: 40, practice: 4, arrows: 5, neutral: true, window: 2000 } }], score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '练习后判断中间箭头方向; 分别统计一致、冲突与中性试次.' },
] };
export const mount = (options) => mountChoices({ ...options, kind: 'flanker' });

import { mountInhibition } from '../engines/inhibition.js';

export const definition = { id: 'gonogo', modes: [{ id: 'signals', name: '响应与抑制', ruleVersion: 3, presets: [
  { id: 'beginner', name: '初级', settings: { count: 30, stopRate: 30, window: 1200, interval: 400 } },
  { id: 'standard', name: '中级', settings: { count: 30, stopRate: 30, window: 1000, interval: 400 }, unlock: { requires: ['gonogo|signals|standard'] } },
  { id: 'fast', name: '高级', settings: { count: 30, stopRate: 40, window: 800, interval: 400 }, unlock: { requires: ['gonogo|signals|fast'] } },
  { id: 'custom', name: '自定义', settings: { count: 30, stopRate: 30, window: 1200, interval: 400 }, unlock: { requires: ['gonogo|signals|standard'] }, fields: [
    { key: 'stopRate', label: '等待比例', type: 'number', default: 30, min: 10, max: 40, step: 10, unit: '%' },
    { key: 'window', label: '响应窗', type: 'number', default: 1200, min: 1000, max: 1500, step: 100, unit: '毫秒' },
  ] },
], score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '绿色出现时响应, 红色出现时保持不动. 成绩为等待试次的正确率.' }] };
export const mount = (options) => mountInhibition({ ...options, kind: 'gonogo' });

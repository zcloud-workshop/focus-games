import { mountInhibition } from '../engines/inhibition.js';

export const definition = { id: 'gonogo', modes: [{ id: 'signals', name: '响应与抑制', ruleVersion: 2, presets: [
  { id: 'beginner', name: '初级', settings: { count: 20, stopRate: 30, window: 1200, interval: 400 } },
  { id: 'standard', name: '标准', settings: { count: 20, stopRate: 30, window: 1000, interval: 400 } },
  { id: 'fast', name: '快速', settings: { count: 20, stopRate: 40, window: 800, interval: 400 } },
  { id: 'custom', name: '自定义', settings: { count: 20, stopRate: 30, window: 1200, interval: 400 }, fields: [
    { key: 'count', label: '试次数', type: 'number', default: 20, min: 10, max: 100, step: 1 },
    { key: 'stopRate', label: '等待比例', type: 'number', default: 30, min: 10, max: 90, step: 5, unit: '%' },
    { key: 'window', label: '响应窗', type: 'number', default: 1200, min: 300, max: 3000, step: 100, unit: '毫秒' },
    { key: 'interval', label: '间隔', type: 'number', default: 400, min: 0, max: 2000, step: 100, unit: '毫秒' },
  ] },
], score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard'], rule: '绿色出现时响应, 红色出现时保持不动. 成绩为等待试次的正确率.' }] };
export const mount = (options) => mountInhibition({ ...options, kind: 'gonogo' });

import { mountInhibition } from '../engines/inhibition.js';

export const definition = { id: 'sart', modes: [{ id: 'digits', name: '数字警觉', ruleVersion: 3, presets: [
  { id: 'slow', name: '初级', settings: { count: 40, stopRate: 25, window: 1500, interval: 300, responseInterval: 200 } },
  { id: 'standard', name: '中级', settings: { count: 40, stopRate: 25, window: 1200, interval: 300, responseInterval: 200 }, unlock: { requires: ['sart|digits|standard'] } },
  { id: 'fast', name: '高级', settings: { count: 50, stopRate: 25, window: 900, interval: 300, responseInterval: 200 }, unlock: { requires: ['sart|digits|fast'] } },
  { id: 'custom', name: '自定义', settings: { count: 40, stopRate: 25, window: 1200, interval: 300, responseInterval: 200 }, unlock: { requires: ['sart|digits|standard'] }, fields: [
    { key: 'count', label: '试次数', type: 'number', default: 40, min: 20, max: 40, step: 10 },
    { key: 'stopRate', label: '数字 3 比例', type: 'number', default: 25, min: 15, max: 30, step: 5, unit: '%' },
    { key: 'window', label: '响应窗', type: 'number', default: 1200, min: 1200, max: 1500, step: 100, unit: '毫秒' },
  ] },
], score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '数字出现时响应, 看到 3 时不响应. 成绩为不响应试次的正确率.' }] };
export const mount = (options) => mountInhibition({ ...options, kind: 'sart' });

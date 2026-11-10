import { mountInhibition } from '../engines/inhibition.js';

export const definition = { id: 'sart', modes: [{ id: 'digits', name: '数字警觉', ruleVersion: 2, presets: [
  { id: 'slow', name: '慢速', settings: { count: 40, stopRate: 20, window: 1500, interval: 400 } },
  { id: 'standard', name: '标准', settings: { count: 40, stopRate: 20, window: 1000, interval: 400 } },
  { id: 'fast', name: '快速', settings: { count: 40, stopRate: 20, window: 700, interval: 400 } },
  { id: 'custom', name: '自定义', settings: { count: 40, stopRate: 20, window: 1000, interval: 400 }, fields: [
    { key: 'count', label: '试次数', type: 'number', default: 40, min: 10, max: 100, step: 1 },
    { key: 'stopRate', label: '数字 3 比例', type: 'number', default: 20, min: 10, max: 90, step: 5, unit: '%' },
    { key: 'window', label: '响应窗', type: 'number', default: 1000, min: 300, max: 3000, step: 100, unit: '毫秒' },
    { key: 'interval', label: '间隔', type: 'number', default: 400, min: 0, max: 2000, step: 100, unit: '毫秒' },
  ] },
], score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '数字出现时响应, 看到 3 时不响应. 分别记录漏按和误按.' }] };
export const mount = (options) => mountInhibition({ ...options, kind: 'sart' });

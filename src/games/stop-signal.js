import { mountInhibition } from '../engines/inhibition.js';

export const definition = { id: 'stop-signal', modes: [{ id: 'stop', name: '停止信号', ruleVersion: 2, presets: [
  { id: 'default', name: '标准', settings: { count: 40, stopRate: 25, window: 1200, delayMin: 150, delayMax: 400, interval: 400 } },
  { id: 'custom', name: '自定义', settings: { count: 40, stopRate: 25, window: 1200, delayMin: 150, delayMax: 400, interval: 400 }, fields: [
    { key: 'count', label: '试次数', type: 'number', default: 40, min: 10, max: 100, step: 1 },
    { key: 'stopRate', label: '停止比例', type: 'number', default: 25, min: 10, max: 90, step: 5, unit: '%' },
    { key: 'window', label: '响应窗', type: 'number', default: 1200, min: 500, max: 3000, step: 100, unit: '毫秒' },
    { key: 'delayMin', label: '最短停止延迟', type: 'number', default: 150, min: 50, max: 1000, step: 50, unit: '毫秒' },
    { key: 'delayMax', label: '最长停止延迟', type: 'number', default: 400, min: 50, max: 1000, step: 50, unit: '毫秒' },
  ] },
], validateSettings: (settings) => settings.delayMin > settings.delayMax || settings.delayMax >= settings.window ? '停止延迟范围须有序, 且最长延迟短于响应窗.' : '', score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '按箭头方向响应. 出现红框时停止响应, 成绩为停止试次的正确率.' }] };
export const mount = (options) => mountInhibition({ ...options, kind: 'stop-signal' });

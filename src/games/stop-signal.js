import { mountInhibition } from '../engines/inhibition.js';

export const definition = { id: 'stop-signal', modes: [{ id: 'stop', name: '停止信号', ruleVersion: 3, presets: [
  { id: 'beginner', name: '初级', settings: { count: 40, stopRate: 20, window: 1200, delayMin: 250, delayMax: 500, interval: 500 } },
  { id: 'standard', name: '中级', settings: { count: 40, stopRate: 25, window: 1200, delayMin: 150, delayMax: 400, interval: 500 }, unlock: { requires: ['stop-signal|stop|standard'] } },
  { id: 'fast', name: '高级', settings: { count: 40, stopRate: 30, window: 1200, delayMin: 50, delayMax: 250, interval: 500 }, unlock: { requires: ['stop-signal|stop|fast'] } },
  { id: 'custom', name: '自定义', settings: { count: 40, stopRate: 25, window: 1200, delayMin: 250, interval: 500 }, unlock: { requires: ['stop-signal|stop|standard'] }, fields: [
    { key: 'stopRate', label: '停止比例', type: 'number', default: 25, min: 10, max: 30, step: 5, unit: '%' },
    { key: 'delayMin', label: '最短停止延迟', type: 'number', default: 250, min: 250, max: 500, step: 50, unit: '毫秒' },
  ] },
], score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '按箭头方向响应. 出现红框时停止响应, 成绩为停止试次的正确率.' }] };
export const mount = (options) => mountInhibition({ ...options, kind: 'stop-signal' });

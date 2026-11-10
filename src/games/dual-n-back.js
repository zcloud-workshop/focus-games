import { mountTimed } from '../engines/nback.js';
const presets = [1, 2, 3].map((n) => ({ id: `n-${n}`, name: `${n}-Back`, settings: { n, count: 20, interval: 2500 } }));
const fields = [{ key: 'n', label: '回溯步数', type: 'number', default: 1, min: 1, max: 5, step: 1 }, { key: 'count', label: '正式题数', type: 'number', default: 20, min: 10, max: 60, step: 10 }, { key: 'interval', label: '刺激间隔', type: 'number', default: 2500, min: 1000, max: 5000, step: 250, unit: '毫秒' }];
const makeMode = (id, name, rule, extra = {}) => ({ id, name, ruleVersion: 2, presets, fields, score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard', 'touch'], rule, ...extra });
export const definition = { id: 'dual-n-back', modes: [
  makeMode('position-tone', '位置与音调', '分别判断位置和音调是否与 N 步前相同.'),
  makeMode('position-letter', '位置与字母声音', '分别判断位置和听到的字母是否与 N 步前相同.'),
  makeMode('tile-tone', '图形与声音', '分别判断图形身份和声音是否与 N 步前相同.'),
  makeMode('tutorial', '双通道练习', '跟随视觉和声音, 匹配时分别响应. 本练习不计分.', { presets: [{ id: 'practice', name: '约 30 秒', settings: { n: 1, count: 9, interval: 3000 } }], fields: [], scored: false }),
] };
export function mount(options) { return mountTimed({ ...options, kind: 'dual' }); }

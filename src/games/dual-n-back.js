import { mountTimed, mountTutorial } from '../engines/nback.js';
const presets = [{ id: 'initial', name: '默认 2-Back', settings: { n: 2, count: 20, interval: 2500 } }, ...[1, 2, 3].map((n) => ({ id: `n-${n}`, name: `${n}-Back`, settings: { n, count: 30, interval: 2500 } })), { id: 'custom', name: '自定义', settings: { n: 2, count: 20, interval: 2500 }, fields: [{ key: 'n', label: '回溯步数', type: 'number', min: 1, max: 5, step: 1 }, { key: 'count', label: '总刺激数', type: 'number', min: 20, max: 40, step: 10 }] }];
const fields = [{ key: 'n', label: '回溯步数', type: 'number', default: 1, min: 1, max: 5, step: 1 }, { key: 'count', label: '正式题数', type: 'number', default: 20, min: 10, max: 60, step: 10 }, { key: 'interval', label: '刺激间隔', type: 'number', default: 2500, min: 1000, max: 5000, step: 250, unit: '毫秒' }];
const referenceFields = [{ key: 'n', label: '回溯步数', type: 'number', default: 1, min: 1, max: 10, step: 1 }, { key: 'count', label: '总刺激数', type: 'number', default: 20, min: 10, max: 50, step: 5 }, { key: 'interval', label: '刺激间隔', type: 'number', default: 3000, min: 1000, max: 5000, step: 250, unit: '毫秒' }];
const referencePresets = [1, 2, 3].map((n) => ({ id: `n-${n}`, name: `${n}-Back`, settings: { n, count: 20, interval: 3000 } }));
const makeMode = (id, name, rule, extra = {}) => ({ id, name, ruleVersion: 2, presets, fields, score: { unit: '%', lower: false, min: 0, max: 100 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'keyboard', 'touch'], rule, ...extra });
const reference = (id, name, rule, extra = {}) => makeMode(id, name, rule, { ruleVersion: 3, presets: referencePresets, fields: referenceFields, validateSettings: (settings) => settings.count <= settings.n ? '总刺激数必须大于回溯步数.' : '', ...extra });
export const definition = { id: 'dual-n-back', modes: [
  makeMode('position-tone', '位置与音调', '分别判断位置和音调是否与 N 步前相同. 仅正确匹配计分.', { ruleVersion: 3, fields: [] }),
  reference('position-letter', '位置与字母声音', '分别判断位置和听到的字母是否与 N 步前相同.'),
  reference('position-only', '位置回溯', '判断位置是否与 N 步前相同.'),
  reference('letter-only', '字母声音回溯', '判断听到的字母是否与 N 步前相同.'),
  reference('tile-tone', '牌面与声音', '分别判断牌面身份和声音是否与 N 步前相同.', { presets: [referencePresets[1], referencePresets[0], referencePresets[2]] }),
  makeMode('tutorial', '双通道练习', '跟随视觉和声音, 匹配时分别响应. 本练习不计分.', { ruleVersion: 3, presets: [{ id: 'practice', name: '约 30 秒', settings: { n: 1, count: 9, interval: 3000 } }], fields: [], scored: false }),
] };
export function mount(options) { return options.mode.id === 'tutorial' ? mountTutorial(options) : mountTimed({ ...options, kind: 'dual' }); }

import { mountChoices } from '../engines/choices.js';

export function highestNumberLevel(saved) {
  return Object.keys(saved?.unlocks ?? {}).reduce((highest, key) => {
    const match = key.match(/^number-comparison\|level\|(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 1);
}

export const definition = { id: 'number-comparison', modes: [{ id: 'larger', name: '较大数字', ruleVersion: 4, presets: [{ id: '30s', name: '30 秒', settings: { duration: 30, level: 1 }, fields: [{ key: 'level', label: '等级', type: 'number', default: 1, min: 1, max: Number.MAX_SAFE_INTEGER, step: 1 }] }], defaultSettings: (saved) => ({ level: highestNumberLevel(saved) }), validateSettings: (settings, saved) => !Number.isSafeInteger(settings.level) || settings.level < 1 || settings.level > highestNumberLevel(saved) ? '请选择已解锁的等级.' : '', score: { unit: '题', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch', 'keyboard'], rule: '在 30 秒内选择较大的数字. 达到本级的次数和正确率目标后解锁下一级.' }] };
export const mount = (options) => mountChoices({ ...options, kind: 'number-comparison' });

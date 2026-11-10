import { counterMount } from '../engines/counter.js';

export const definition = {
  id: 'right-click-test',
  modes: [{ id: 'right', name: '鼠标右键', sources: ['T18'], ruleVersion: 2, presets: [3, 5, 10, 15, 30, 60].map((seconds) => ({ id: `${seconds}s`, name: `${seconds} 秒`, settings: { seconds, input: 'right', countFirst: false } })), score: { unit: '次/秒', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['right-mouse'], rule: '只统计训练区域内的真实鼠标右键. 首次右键只启动, 后续右键计数. 左键、触屏和长按不计数.' }],
};
export const mount = counterMount;

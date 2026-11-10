import { counterMount } from '../engines/counter.js';

const presets = (seconds, countFirst = true) => seconds.map((seconds) => ({ id: `${seconds}s`, name: `${seconds} 秒`, settings: { seconds, input: 'left', countFirst } }));
export const definition = {
  id: 'click-speed-test',
  modes: [
    { id: 'click', name: '点击计速', sources: ['T17'], ruleVersion: 2, presets: presets([3, 5, 10, 15, 30, 60], false), score: { unit: '次/秒', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch'], rule: '首次点击开始, 随后的点击计数. 倒计时结束后结算, 鼠标和触屏成绩分别保存.' },
    { id: 'short', name: '短时计速', sources: ['C19'], ruleVersion: 2, presets: presets([1, 3, 5, 10]), score: { unit: '次/秒', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: ['pointer', 'touch'], rule: '在指定时间内连续点击. 首次点击开始, 同一轮仅使用一种输入方式.' },
  ],
};
export const mount = counterMount;

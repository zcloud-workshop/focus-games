import { counterMount } from '../engines/counter.js';

const mode = (id, name, sources, seconds, input) => ({ id, name, sources, ruleVersion: 2, presets: seconds.map((seconds) => ({ id: `${seconds}s`, name: `${seconds} 秒`, settings: { seconds, input, ...(id === 'keyboard' ? { clickStart: true, countFirst: false } : {}) } })), score: { unit: '次/秒', lower: false, min: 0 }, hiddenPolicy: 'invalidate', inputs: [input === 'touch' ? 'touch' : 'keyboard'], rule: id === 'keyboard' ? '点击区域启动计时, 再敲击真实空格键. 启动点击不计数, 长按自动重复不计为新的敲击.' : input === 'touch' ? '首次轻触开始, 在大按钮内连续轻触. 成绩与键盘模式分开.' : '首次敲击空格开始并计数. 长按自动重复不计为新的敲击, 空格不会滚动页面.' });
export const definition = { id: 'spacebar-counter', modes: [mode('keyboard', '空格计数', ['T19'], [3, 5, 10, 15, 30, 60], 'keyboard'), mode('short-keyboard', '短时空格', ['C20'], [5, 10, 30], 'keyboard'), mode('touch', '触屏计数', ['C20'], [5, 10, 30], 'touch')] };
export const mount = counterMount;

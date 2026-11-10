export const categories = [
  { id: 'all', name: '全部' },
  { id: 'attention', name: '视觉' },
  { id: 'memory', name: '记忆' },
  { id: 'control', name: '反应' },
  { id: 'relax', name: '放松' },
];

export const games = [
  { id: 'schulte', name: '舒尔特方格', en: 'SCHULTE GRID', category: 'attention', icon: 'grid', color: 'sage', desc: '从 1 开始, 按顺序找到每一个数字.', tag: '视觉搜索', time: '1 分钟', rule: '按从小到大的顺序点击数字. 点错不会推进, 完成所有数字后记录用时.', levels: ['3 × 3', '4 × 4', '5 × 5'], unit: '秒', lower: true },
  { id: 'difference', name: '找不同的字', en: 'SPOT THE DIFFERENCE', category: 'attention', icon: 'search', color: 'peach', desc: '在相似的文字中, 发现那个小小不同.', tag: '细节捕捉', time: '1 分钟', rule: '每组文字中有一个不同的字. 找到它, 连续完成 10 题. 点错后可以继续寻找.', levels: ['3 × 3', '5 × 5', '7 × 7'], unit: '秒', lower: true },
  { id: 'color', name: '色差感知', en: 'COLOR PERCEPTION', category: 'attention', icon: 'palette', color: 'lavender', desc: '观察细微色差, 找出不一样的方块.', tag: '色彩辨识', time: '1 分钟', rule: '点击颜色不同的方块, 完成 10 题. 每答对一题, 色差会变得更细微. 记录首次作答正确率.', levels: ['入门', '进阶', '挑战'], unit: '%', lower: false, max: 100 },
  { id: 'sequence', name: '顺序记忆', en: 'SEQUENCE MEMORY', category: 'memory', icon: 'sequence', color: 'lavender', desc: '记住亮起的顺序, 在脑海里画一条路径.', tag: '序列记忆', time: '2 分钟', rule: '观察方块亮起的顺序, 再按相同顺序点击. 每轮多一个方块, 点错即结束. 记录完整记住的最长序列.', levels: ['慢速', '标准', '快速'], unit: '个', lower: false, max: 20 },
  { id: 'numbers', name: '数字记忆', en: 'NUMBER MEMORY', category: 'memory', icon: 'numbers', color: 'sand', desc: '让数字短暂停留, 再试着把它们找回来.', tag: '短时记忆', time: '2 分钟', rule: '记住屏幕上的数字, 消失后输入完整数字. 每轮增加一位, 答错即结束. 注意保留开头的 0.', levels: ['4 秒', '3 秒', '2 秒'], unit: '位', lower: false, max: 20 },
  { id: 'nback', name: 'N-Back', en: 'WORKING MEMORY', category: 'memory', icon: 'layers', color: 'sky', desc: '与前几步比较, 给工作记忆一点挑战.', tag: '记忆更新', time: '2 分钟', rule: '判断当前字母是否与 N 步前相同. 每次选择后进入下一题, 共 20 题. 前 N 个字母只需观察.', levels: ['1-Back', '2-Back', '3-Back'], unit: '%', lower: false, max: 100 },
  { id: 'stroop', name: 'Stroop 色词', en: 'STROOP TEST', category: 'control', icon: 'type', color: 'peach', desc: '看颜色, 不读字. 试着绕开思维惯性.', tag: '抗干扰', time: '1 分钟', rule: '选择文字实际显示的颜色, 忽略文字含义. 共 20 题, 记录正确率. 也可按选项对应的数字键选择.', levels: ['3 色', '4 色', '5 色'], unit: '%', lower: false, max: 100 },
  { id: 'reaction', name: '反应速度', en: 'REACTION TIME', category: 'control', icon: 'bolt', color: 'sand', desc: '等待绿色出现, 捕捉你的第一反应.', tag: '反应敏捷', time: '1 分钟', rule: '等待区域变绿后立即点击, 或按空格. 抢按会重新等待. 完成 5 次有效反应后记录平均用时.', levels: ['轻松', '标准', '挑战'], unit: 'ms', lower: true },
  { id: 'gonogo', name: 'Go / No-Go', en: 'IMPULSE CONTROL', category: 'control', icon: 'stop', color: 'sage', desc: '该出手时出手, 该等待时保持从容.', tag: '抑制控制', time: '1 分钟', rule: '看到绿色圆形时点击或按空格, 看到红色叉号时不要操作. 共 20 轮, 每轮限时, 记录正确率.', levels: ['慢速', '标准', '快速'], unit: '%', lower: false, max: 100 },
  { id: 'math', name: '心算挑战', en: 'MENTAL MATH', category: 'control', icon: 'math', color: 'sky', desc: '让思维热身, 用心算连接数字与答案.', tag: '思维敏捷', time: '1 分钟', rule: '心算并选择正确答案, 共 10 题. 难度提高时会加入更大的数字和乘法. 可按 1-4 键选择.', levels: ['入门', '进阶', '挑战'], unit: '%', lower: false, max: 100 },
  { id: 'time', name: '时间感知', en: 'TIME PERCEPTION', category: 'relax', icon: 'clock', color: 'peach', desc: '不看时钟, 感受时间从指尖流过.', tag: '内在节奏', time: '1 分钟', rule: '开始计时后, 在你认为目标时间到达时点击停止. 共 3 轮, 记录平均绝对误差, 越小越接近目标.', levels: ['3 秒', '5 秒', '10 秒'], unit: '秒误差', lower: true },
  { id: 'breath', name: '呼吸空间', en: 'A MOMENT TO BREATHE', category: 'relax', icon: 'leaf', color: 'sage', desc: '跟随圆圈, 在一呼一吸间慢下来.', tag: '放松练习', time: '1 分钟', rule: '跟随圆圈舒适地吸气、呼气, 不需要憋气. 完成 4 个呼吸周期. 如感到不适, 可随时退出.', levels: ['4 吸 / 4 呼', '4 吸 / 6 呼', '5 吸 / 7 呼'], unit: '轮', lower: false },
];

export const dailyGames = ['schulte', 'stroop', 'sequence'];

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function summarize(records, now = new Date()) {
  const today = records.filter((record) => localDate(new Date(record.at)) === localDate(now));
  const days = new Set(records.map((record) => localDate(new Date(record.at))));
  const cursor = new Date(now);
  if (!days.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now);
    day.setDate(day.getDate() - 6 + index);
    return { date: localDate(day), label: ['日', '一', '二', '三', '四', '五', '六'][day.getDay()], count: records.filter((record) => localDate(new Date(record.at)) === localDate(day)).length };
  });
  return { today: today.length, seconds: today.reduce((sum, record) => sum + record.duration, 0), streak, week, completed: new Set(today.map((record) => record.game)) };
}

export function nbackSequence(n, count = 20, random = Math.random) {
  const alphabet = 'BCDFGHJKLMPRST';
  const values = [];
  for (let i = 0; i < count + n; i++) {
    if (i >= n && random() < 0.35) values.push(values[i - n]);
    else {
      const choices = [...alphabet].filter((letter) => i < n || letter !== values[i - n]);
      values.push(choices[Math.floor(random() * choices.length)]);
    }
  }
  return values;
}

export const categories = [
  { id: 'all', name: '全部' },
  { id: 'attention', name: '视觉' },
  { id: 'memory', name: '记忆' },
  { id: 'control', name: '反应' },
  { id: 'perception', name: '感知' },
  { id: 'spatial', name: '推理' },
  { id: 'puzzle', name: '益智' },
  { id: 'relax', name: '放松' },
  { id: 'tools', name: '工具' },
];

export const games = [
  { id: 'schulte', name: '舒尔特方格', category: 'attention', icon: 'grid', tag: '依序搜索', sources: ['A01', 'T05', 'C03', 'C04'], status: 'ready', kind: 'training' },
  { id: 'difference', name: '找不同的字', category: 'attention', icon: 'search', tag: '细节捕捉', sources: ['A02', 'T06'], status: 'ready', kind: 'training' },
  { id: 'color', name: '色差感知', category: 'perception', icon: 'palette', tag: '色彩辨识', sources: ['A03', 'T21'], status: 'ready', kind: 'training' },
  { id: 'change-blindness', name: '变化盲视', category: 'attention', icon: 'search', tag: '变化搜索', sources: ['A04'], status: 'ready', kind: 'training' },
  { id: 'mot', name: '多目标追踪', category: 'attention', icon: 'focus', tag: '移动追踪', sources: ['A05', 'T09', 'C16'], status: 'ready', kind: 'training' },
  { id: 'posner-cue', name: '注意线索', category: 'control', icon: 'arrow', tag: '空间定向', sources: ['A06'], status: 'ready', kind: 'training' },
  { id: 'rsvp', name: '快速字母流', category: 'attention', icon: 'type', tag: '时间注意', sources: ['A07'], status: 'ready', kind: 'training' },
  { id: 'nback', name: 'N-Back', category: 'memory', icon: 'layers', tag: '记忆更新', sources: ['A08', 'T03'], status: 'ready', kind: 'training' },
  { id: 'dual-n-back', name: '双通道回溯', category: 'memory', icon: 'layers', tag: '视听记忆', sources: ['A09', 'C02', 'C13'], status: 'ready', kind: 'training' },
  { id: 'numbers', name: '数字记忆', category: 'memory', icon: 'numbers', tag: '空间位置', sources: ['A10', 'T01'], status: 'ready', kind: 'training' },
  { id: 'sequence', name: '顺序记忆', category: 'memory', icon: 'sequence', tag: '路径记忆', sources: ['A11', 'T02', 'C09', 'C12'], status: 'ready', kind: 'training' },
  { id: 'digit-span', name: '数字广度', category: 'memory', icon: 'numbers', tag: '正背与倒背', sources: ['A12', 'C28'], status: 'ready', kind: 'training' },
  { id: 'math', name: '心算挑战', category: 'control', icon: 'math', tag: '心算运算', sources: ['A13'], status: 'ready', kind: 'training' },
  { id: 'reaction', name: '反应速度', category: 'control', icon: 'bolt', tag: '信号响应', sources: ['A14', 'T16', 'C05', 'C07'], status: 'ready', kind: 'training' },
  { id: 'stroop', name: '色词判断', category: 'control', icon: 'type', tag: '抗干扰', sources: ['A15', 'T07', 'C10'], status: 'ready', kind: 'training' },
  { id: 'gonogo', name: '响应与抑制', category: 'control', icon: 'stop', tag: '控制冲动', sources: ['A16'], status: 'ready', kind: 'training' },
  { id: 'stop-signal', name: '停止信号', category: 'control', icon: 'stop', tag: '中止响应', sources: ['A17'], status: 'ready', kind: 'training' },
  { id: 'sart', name: '持续注意', category: 'control', icon: 'focus', tag: '抑制与警觉', sources: ['A18'], status: 'ready', kind: 'training' },
  { id: 'time', name: '时间感知', category: 'perception', icon: 'clock', tag: '内在节奏', sources: ['A19', 'T23', 'C26'], status: 'ready', kind: 'training' },
  { id: 'task-switching', name: '规则切换', category: 'control', icon: 'sequence', tag: '灵活判断', sources: ['A20'], status: 'ready', kind: 'training' },
  { id: 'flanker', name: '中心箭头', category: 'control', icon: 'arrow', tag: '侧翼干扰', sources: ['A21', 'C11'], status: 'ready', kind: 'training' },
  { id: 'card-sorting', name: '卡片分类', category: 'control', icon: 'layers', tag: '发现规则', sources: ['A22'], status: 'ready', kind: 'training' },
  { id: 'simon', name: '颜色与位置', category: 'control', icon: 'palette', tag: '空间冲突', sources: ['A23'], status: 'ready', kind: 'training' },
  { id: 'mental-rotation', name: '心理旋转', category: 'spatial', icon: 'grid', tag: '旋转识别', sources: ['A24'], status: 'ready', kind: 'training' },
  { id: 'paper-folding', name: '折纸推演', category: 'spatial', icon: 'layers', tag: '展开与打孔', sources: ['A25'], status: 'ready', kind: 'training' },
  { id: 'matrix-reasoning', name: '矩阵推理', category: 'spatial', icon: 'grid', tag: '图形规律', sources: ['A26'], status: 'ready', kind: 'training' },
  { id: 'auditory-attention', name: '听觉注意', category: 'memory', icon: 'focus', tag: '音调回溯', sources: ['A27'], status: 'ready', kind: 'training' },
  { id: 'timbre-n-back', name: '音色回溯', category: 'memory', icon: 'layers', tag: '音色辨别', sources: ['A28'], status: 'ready', kind: 'training' },
  { id: 'pattern-recognition', name: '模式识别', category: 'spatial', icon: 'sequence', tag: '数字规律', sources: ['A29'], status: 'ready', kind: 'training' },
  { id: 'breath', name: '呼吸空间', category: 'relax', icon: 'leaf', tag: '呼吸引导', sources: ['A30', 'C23', 'C24', 'C25'], status: 'ready', kind: 'training' },
  { id: 'color-block-imprint', name: '色块印记', category: 'memory', icon: 'grid', tag: '位置与旋转', sources: ['T04'], status: 'ready', kind: 'training' },
  { id: 'coordinate-drift', name: '坐标迷航', category: 'memory', icon: 'focus', tag: '心中移动', sources: ['T08'], status: 'ready', kind: 'training' },
  { id: 'puzzle', name: '行列拼图', category: 'puzzle', icon: 'grid', tag: '整行整列互换', sources: ['T10'], status: 'ready', kind: 'training' },
  { id: 'digital-huarong-road', name: '数字滑块', category: 'puzzle', icon: 'numbers', tag: '排序还原', sources: ['T11'], status: 'ready', kind: 'training' },
  { id: 'sudoku', name: '数独', category: 'puzzle', icon: 'grid', tag: '数字推演', sources: ['T12', 'C18'], status: 'ready', kind: 'training' },
  { id: 'bottle-color-matching', name: '瓶色推断', category: 'puzzle', icon: 'palette', tag: '排列与反馈', sources: ['T13'], status: 'ready', kind: 'training' },
  { id: 'number-merge', name: '数字合并', category: 'puzzle', icon: 'numbers', tag: '滑动合并', sources: ['T14'], status: 'ready', kind: 'training' },
  { id: 'lights-out', name: '熄灯', category: 'puzzle', icon: 'grid', tag: '连锁翻转', sources: ['T15'], status: 'ready', kind: 'training' },
  { id: 'click-speed-test', name: '点击速度', category: 'perception', icon: 'bolt', tag: '左键与触屏', sources: ['T17', 'C19'], status: 'ready', kind: 'training' },
  { id: 'right-click-test', name: '右键速度', category: 'perception', icon: 'bolt', tag: '鼠标右键', sources: ['T18'], status: 'ready', kind: 'training' },
  { id: 'spacebar-counter', name: '空格计数', category: 'perception', icon: 'type', tag: '键盘节奏', sources: ['T19', 'C20'], status: 'ready', kind: 'training' },
  { id: 'dynamic-visual-acuity-test', name: '瞬时数字', category: 'memory', icon: 'numbers', tag: '短暂呈现', sources: ['T20'], status: 'ready', kind: 'training' },
  { id: 'dynamic-color', name: '动态色差', category: 'attention', icon: 'palette', tag: '移动中辨色', sources: ['T22'], status: 'ready', kind: 'training' },
  { id: 'matchstick-math', name: '火柴等式', category: 'puzzle', icon: 'math', tag: '移动一根', sources: ['T24'], status: 'ready', kind: 'training' },
  { id: 'maze', name: '迷宫', category: 'puzzle', icon: 'sequence', tag: '寻找出口', sources: ['T25'], status: 'ready', kind: 'training' },
  { id: 'number-mirror', name: '数字镜像', category: 'spatial', icon: 'numbers', tag: '镜像辨识', sources: ['T26'], status: 'ready', kind: 'training' },
  { id: 'quick-mirror-judgment', name: '镜像速判', category: 'spatial', icon: 'layers', tag: '旋转与反射', sources: ['T27'], status: 'ready', kind: 'training' },
  { id: 'symmetry-blocks', name: '对称方块', category: 'spatial', icon: 'grid', tag: '镜像复刻', sources: ['T28'], status: 'ready', kind: 'training' },
  { id: 'field-of-view', name: '视野双判断', category: 'attention', icon: 'focus', tag: '中央与周边', sources: ['C01', 'C31'], status: 'ready', kind: 'training' },
  { id: 'pvt', name: '持续警觉', category: 'control', icon: 'clock', tag: '长时等待响应', sources: ['C06'], status: 'ready', kind: 'training' },
  { id: 'memory-match', name: '记忆配对', category: 'memory', icon: 'layers', tag: '翻牌配对', sources: ['C08', 'C22'], status: 'ready', kind: 'training' },
  { id: 'count-boxes', name: '数箱子', category: 'spatial', icon: 'layers', tag: '立体计数', sources: ['C14'], status: 'ready', kind: 'training' },
  { id: 'object-recall', name: '物品回忆', category: 'memory', icon: 'search', tag: '自由回忆', sources: ['C15'], status: 'ready', kind: 'training' },
  { id: 'number-comparison', name: '较大数字', category: 'control', icon: 'numbers', tag: '快速比较', sources: ['C17'], status: 'ready', kind: 'training' },
  { id: 'trail-making', name: '交替连线', category: 'attention', icon: 'sequence', tag: '散点连接', sources: ['C29'], status: 'ready', kind: 'training' },
  { id: 'pomodoro', name: '番茄钟', category: 'tools', icon: 'clock', tag: '专注与休息', sources: ['C21'], status: 'ready', kind: 'tool' },
  { id: 'bamboo-cicada', name: '竹知了', category: 'tools', icon: 'leaf', tag: '画圈与声音', sources: ['C30'], status: 'ready', kind: 'tool' },
];

export const legacyRules = {
  'schulte': { levels: ['3 × 3', '4 × 4', '5 × 5'], unit: '秒', lower: true },
  'difference': { levels: ['3 × 3', '5 × 5', '7 × 7'], unit: '秒', lower: true },
  'color': { levels: ['入门', '进阶', '挑战'], unit: '%', lower: false, max: 100 },
  'sequence': { levels: ['慢速', '标准', '快速'], unit: '个', lower: false, max: 20 },
  'numbers': { levels: ['4 秒', '3 秒', '2 秒'], unit: '位', lower: false, max: 20 },
  'nback': { levels: ['1-Back', '2-Back', '3-Back'], unit: '%', lower: false, max: 100 },
  'stroop': { levels: ['3 色', '4 色', '5 色'], unit: '%', lower: false, max: 100 },
  'reaction': { levels: ['轻松', '标准', '挑战'], unit: 'ms', lower: true },
  'gonogo': { levels: ['慢速', '标准', '快速'], unit: '%', lower: false, max: 100 },
  'math': { levels: ['入门', '进阶', '挑战'], unit: '%', lower: false, max: 100 },
  'time': { levels: ['3 秒', '5 秒', '10 秒'], unit: '秒误差', lower: true },
  'breath': { levels: ['4 吸 / 4 呼', '4 吸 / 6 呼', '5 吸 / 7 呼'], unit: '轮', lower: false },
};

export const dailyChallenges = [
  { game: 'schulte', mode: 'numbers', preset: 'beginner' },
  { game: 'reaction', mode: 'color', preset: 'five' },
  { game: 'sequence', mode: 'forward', preset: 'standard' },
];
export const dailyGames = dailyChallenges.map((entry) => entry.game);

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
  records = records.filter((record) => record.scored !== false && record.kind !== 'tool' && !games.some((game) => game.id === record.game && game.kind === 'tool'));
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

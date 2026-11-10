# 舒尔特方格规则与取证

日期: 2026-11-10. 状态: 实现, 尚未完成全部来源一致性验收. 用户要求跳过后续测试并提交、合并和推送.

## 来源与证据

A01 实时界面与部署脚本确认数字/短句/成语、5/6/7 和自定义 3-7. C03/C04 公开规则源码固定于 loethen/freefocusgames 的 88336ed4e2f101998c2cb53794593a934390db9d: 错点罚 2 秒; 动态三环为 6/12/24 个扇区, 周期 20/26/33 秒, 方向顺/逆/顺. 本站原创文字与 SVG, 按下计时与参考的松开计时有差异. T05 参数组合仍待完整运行核对.

部署脚本与公开源码仅用于核对规则, 不代表实际运行验收, 未搬用实现或素材. 入口映射见 [冻结目录](baseline.md), 许可见 [素材清单](assets.md).

## 本地实现快照

以下为当前模块配置, 未经上文证据确认的数值保留待证状态.

### 数字顺序 (numbers)

- 规则版本: 2. 页面隐藏: invalidate. 输入: pointer, touch, keyboard.
- 主成绩: 秒, 越小越好, 0..无固定上限. 有效结算后保存.
- 操作: 从 1 开始按顺序点击所有数字. 点错不前进, 计时继续.

| 预设 | ID | 设置 | 解锁 |
| --- | --- | --- | --- |
| 5 × 5 | `beginner` | `{"size":5}` | 自由 |
| 6 × 6 | `intermediate` | `{"size":6}` | 自由 |
| 7 × 7 | `advanced` | `{"size":7}` | 自由 |
| 自定义 | `custom` | `{"size":5}` | 自由 |

- 字段 `size`: 每边格数, {"key":"size","label":"每边格数","type":"number","default":5,"min":3,"max":7,"step":1}.

### 短句顺序 (verse)

- 规则版本: 2. 页面隐藏: invalidate. 输入: pointer, touch, keyboard.
- 主成绩: 秒, 越小越好, 0..无固定上限. 有效结算后保存.
- 操作: 按提示文字的顺序点击. 重复的字可点击任意一个尚未选中的相同字. 完成后记录用时.

| 预设 | ID | 设置 | 解锁 |
| --- | --- | --- | --- |
| 5 × 5 | `beginner` | `{"size":5}` | 自由 |
| 6 × 6 | `intermediate` | `{"size":6}` | 自由 |
| 7 × 7 | `advanced` | `{"size":7}` | 自由 |
| 自定义 | `custom` | `{"size":5}` | 自由 |

- 字段 `size`: 每边格数, {"key":"size","label":"每边格数","type":"number","default":5,"min":3,"max":7,"step":1}.

### 成语顺序 (idioms)

- 规则版本: 2. 页面隐藏: invalidate. 输入: pointer, touch, keyboard.
- 主成绩: 秒, 越小越好, 0..无固定上限. 有效结算后保存.
- 操作: 按提示文字的顺序点击. 重复的字可点击任意一个尚未选中的相同字. 完成后记录用时.

| 预设 | ID | 设置 | 解锁 |
| --- | --- | --- | --- |
| 5 × 5 | `beginner` | `{"size":5}` | 自由 |
| 6 × 6 | `intermediate` | `{"size":6}` | 自由 |
| 7 × 7 | `advanced` | `{"size":7}` | 自由 |
| 自定义 | `custom` | `{"size":5}` | 自由 |

- 字段 `size`: 每边格数, {"key":"size","label":"每边格数","type":"number","default":5,"min":3,"max":7,"step":1}.

### 多形态搜索 (shapes)

- 规则版本: 2. 页面隐藏: invalidate. 输入: pointer, touch, keyboard.
- 主成绩: 秒, 越小越好, 0..无固定上限. 有效结算后保存.
- 操作: 依照选定顺序搜索数字. 点错不推进. 奇数和偶数只需完成对应数字, 漂移会改变数字位置.

| 预设 | ID | 设置 | 解锁 |
| --- | --- | --- | --- |
| 4 × 4 | `4` | `{"size":4,"shape":"classic","order":"ascending","colorful":false}` | 自由 |
| 5 × 5 | `5` | `{"size":5,"shape":"classic","order":"ascending","colorful":false}` | 自由 |
| 6 × 6 | `6` | `{"size":6,"shape":"classic","order":"ascending","colorful":false}` | 自由 |
| 7 × 7 | `7` | `{"size":7,"shape":"classic","order":"ascending","colorful":false}` | 自由 |
| 8 × 8 | `8` | `{"size":8,"shape":"classic","order":"ascending","colorful":false}` | 自由 |
| 9 × 9 | `9` | `{"size":9,"shape":"classic","order":"ascending","colorful":false}` | 自由 |

- 字段 `shape`: 形态, {"key":"shape","label":"形态","type":"select","options":[{"value":"classic","label":"方格"},{"value":"irregular","label":"不规则"},{"value":"pebbles","label":"鹅卵石"},{"value":"honeycomb","label":"蜂巢"},{"value":"ring","label":"圆环"}]}.

- 字段 `order`: 顺序, {"key":"order","label":"顺序","type":"select","options":[{"value":"ascending","label":"顺序"},{"value":"descending","label":"倒序"},{"value":"odd","label":"奇数"},{"value":"even","label":"偶数"},{"value":"drift","label":"漂移"}]}.

- 字段 `colorful`: 多色数字, {"key":"colorful","label":"多色数字","type":"checkbox","default":false}.

### 标准方格 (penalty-grid)

- 规则版本: 3. 页面隐藏: invalidate. 输入: pointer, touch, keyboard.
- 主成绩: 秒, 越小越好, 0..无固定上限. 有效结算后保存.
- 操作: 按 1-25 顺序点击. 错误不前进, 每次错误加 2 秒. 原始用时和罚时分别记录.

| 预设 | ID | 设置 | 解锁 |
| --- | --- | --- | --- |
| 5 × 5 | `5x5` | `{"size":5,"penalty":2}` | 自由 |

### 旋转圆环 (rotating-rings)

- 规则版本: 3. 页面隐藏: invalidate. 输入: pointer, touch, keyboard.
- 主成绩: 秒, 越小越好, 0..无固定上限. 有效结算后保存.
- 操作: 三个圆环独立旋转. 依次点击 1-42, 每次错误加 2 秒.

| 预设 | ID | 设置 | 解锁 |
| --- | --- | --- | --- |
| 三个圆环 · 42 数字 | `42` | `{"size":42,"penalty":2}` | 自由 |

## 生命周期与验收边界

成绩按主体、模式、预设、设置、输入与规则版本隔离. 旧版本显示为旧规则; 中断不记正式成绩. 退出清理监听、定时器、动画、声音和传感器. 未完成的来源全流程、两种主题、四种宽度、真机输入和音频验收不标为通过.

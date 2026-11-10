# 空格计数规则与取证

日期: 2026-11-10. 状态: 实现, 尚未完成全部来源一致性验收. 用户要求跳过后续测试并提交、合并和推送.

## 来源与证据

实际运行确认 T19 直接空格不启动, 先点击区域启动后才计空格; C20 首次空格启动并计数. 来源 C 的触屏模式与真实键盘模式独立分组. 自动重复按键指标和一次物理输入去重分别处理, 最终设备验收跳过.

部署脚本与公开源码仅用于核对规则, 不代表实际运行验收, 未搬用实现或素材. 入口映射见 [冻结目录](baseline.md), 许可见 [素材清单](assets.md).

## 本地实现快照

以下为当前模块配置, 未经上文证据确认的数值保留待证状态.

### 空格计数 (keyboard)

- 规则版本: 2. 页面隐藏: invalidate. 输入: keyboard.
- 主成绩: 次/秒, 越大越好, 0..无固定上限. 有效结算后保存.
- 操作: 点击区域启动计时, 再敲击真实空格键. 启动点击不计数, 长按自动重复不计为新的敲击.

| 预设 | ID | 设置 | 解锁 |
| --- | --- | --- | --- |
| 3 秒 | `3s` | `{"seconds":3,"input":"keyboard","clickStart":true,"countFirst":false}` | 自由 |
| 5 秒 | `5s` | `{"seconds":5,"input":"keyboard","clickStart":true,"countFirst":false}` | 自由 |
| 10 秒 | `10s` | `{"seconds":10,"input":"keyboard","clickStart":true,"countFirst":false}` | 自由 |
| 15 秒 | `15s` | `{"seconds":15,"input":"keyboard","clickStart":true,"countFirst":false}` | 自由 |
| 30 秒 | `30s` | `{"seconds":30,"input":"keyboard","clickStart":true,"countFirst":false}` | 自由 |
| 60 秒 | `60s` | `{"seconds":60,"input":"keyboard","clickStart":true,"countFirst":false}` | 自由 |

### 短时空格 (short-keyboard)

- 规则版本: 2. 页面隐藏: invalidate. 输入: keyboard.
- 主成绩: 次/秒, 越大越好, 0..无固定上限. 有效结算后保存.
- 操作: 首次敲击空格开始并计数. 长按自动重复不计为新的敲击, 空格不会滚动页面.

| 预设 | ID | 设置 | 解锁 |
| --- | --- | --- | --- |
| 5 秒 | `5s` | `{"seconds":5,"input":"keyboard"}` | 自由 |
| 10 秒 | `10s` | `{"seconds":10,"input":"keyboard"}` | 自由 |
| 30 秒 | `30s` | `{"seconds":30,"input":"keyboard"}` | 自由 |

### 触屏计数 (touch)

- 规则版本: 2. 页面隐藏: invalidate. 输入: touch.
- 主成绩: 次/秒, 越大越好, 0..无固定上限. 有效结算后保存.
- 操作: 首次轻触开始, 在大按钮内连续轻触. 成绩与键盘模式分开.

| 预设 | ID | 设置 | 解锁 |
| --- | --- | --- | --- |
| 5 秒 | `5s` | `{"seconds":5,"input":"touch"}` | 自由 |
| 10 秒 | `10s` | `{"seconds":10,"input":"touch"}` | 自由 |
| 30 秒 | `30s` | `{"seconds":30,"input":"touch"}` | 自由 |

## 生命周期与验收边界

成绩按主体、模式、预设、设置、输入与规则版本隔离. 旧版本显示为旧规则; 中断不记正式成绩. 退出清理监听、定时器、动画、声音和传感器. 未完成的来源全流程、两种主题、四种宽度、真机输入和音频验收不标为通过.

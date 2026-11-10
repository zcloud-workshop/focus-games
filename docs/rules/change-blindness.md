# 变化盲视规则与取证

日期: 2026-11-10. 状态: 实现, 尚未完成全部来源一致性验收. 用户要求跳过后续测试并提交、合并和推送.

## 来源与证据

A04 部署脚本确认第一幅 1200ms、空白 300ms、第二幅持续显示, 不循环交替. 每局仅一次选择, 正确反馈 600ms 后换题, 错误 1500ms 后结束. 初/中/高网格 4/5/6, 默认 5 局, 至少 4 局正确解锁下一档. 本站使用原创几何符号替代参考表情素材.

部署脚本与公开源码仅用于核对规则, 不代表实际运行验收, 未搬用实现或素材. 入口映射见 [冻结目录](baseline.md), 许可见 [素材清单](assets.md).

## 本地实现快照

以下为当前模块配置, 未经上文证据确认的数值保留待证状态.

### 画面变化 (alternating)

- 规则版本: 3. 页面隐藏: invalidate. 输入: pointer, touch, keyboard.
- 主成绩: 局, 越大越好, 0..10. 有效结算后保存.
- 操作: 先观察画面1.2秒, 遮盖0.3秒后找出变化的一格. 每轮五局, 点错立即结束. 初级和中级各完成至少四局可解锁下一档.

| 预设 | ID | 设置 | 解锁 |
| --- | --- | --- | --- |
| 4 × 4 | `4` | `{"size":4,"rounds":5,"level":"easy"}` | 自由 |
| 5 × 5 | `5` | `{"size":5,"rounds":5,"level":"medium"}` | change-blindness|alternating|medium |
| 6 × 6 | `6` | `{"size":6,"rounds":5,"level":"hard"}` | change-blindness|alternating|hard |
| 自定义 | `custom` | `{"size":4,"rounds":5,"level":"custom"}` | change-blindness|alternating|medium |

- 字段 `size`: 网格大小, {"key":"size","label":"网格大小","type":"number","min":3,"max":4,"step":1,"maxByUnlock":[{"key":"change-blindness|alternating|medium","max":5},{"key":"change-blindness|alternating|hard","max":6}]}.

- 字段 `rounds`: 局数, {"key":"rounds","label":"局数","type":"number","min":3,"max":5,"step":1,"maxByUnlock":[{"key":"change-blindness|alternating|medium","max":8},{"key":"change-blindness|alternating|hard","max":10}]}.

## 生命周期与验收边界

成绩按主体、模式、预设、设置、输入与规则版本隔离. 旧版本显示为旧规则; 中断不记正式成绩. 退出清理监听、定时器、动画、声音和传感器. 未完成的来源全流程、两种主题、四种宽度、真机输入和音频验收不标为通过.

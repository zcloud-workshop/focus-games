# 冻结基线与模块契约

日期: 2026-11-10. 基线为计划附录的 A30、B28、C31 共89入口. 训练86入口映射55主体, 工具2入口, C27排除. 本文冻结映射, 不代表来源规则全部核验.

来源: A, B, C.

| 主体 | 前台名称 | 类型 | 来源 |
| --- | --- | --- | --- |
| `schulte` | 舒尔特方格 | training | A01, T05, C03, C04 |
| `difference` | 找不同的字 | training | A02, T06 |
| `color` | 色差感知 | training | A03, T21 |
| `change-blindness` | 变化盲视 | training | A04 |
| `mot` | 多目标追踪 | training | A05, T09, C16 |
| `posner-cue` | 注意线索 | training | A06 |
| `rsvp` | 快速字母流 | training | A07 |
| `nback` | N-Back | training | A08, T03 |
| `dual-n-back` | 双通道回溯 | training | A09, C02, C13 |
| `numbers` | 数字记忆 | training | A10, T01 |
| `sequence` | 顺序记忆 | training | A11, T02, C09, C12 |
| `digit-span` | 数字广度 | training | A12, C28 |
| `math` | 心算挑战 | training | A13 |
| `reaction` | 反应速度 | training | A14, T16, C05, C07 |
| `stroop` | 色词判断 | training | A15, T07, C10 |
| `gonogo` | 响应与抑制 | training | A16 |
| `stop-signal` | 停止信号 | training | A17 |
| `sart` | 持续注意 | training | A18 |
| `time` | 时间感知 | training | A19, T23, C26 |
| `task-switching` | 规则切换 | training | A20 |
| `flanker` | 中心箭头 | training | A21, C11 |
| `card-sorting` | 卡片分类 | training | A22 |
| `simon` | 颜色与位置 | training | A23 |
| `mental-rotation` | 心理旋转 | training | A24 |
| `paper-folding` | 折纸推演 | training | A25 |
| `matrix-reasoning` | 矩阵推理 | training | A26 |
| `auditory-attention` | 听觉注意 | training | A27 |
| `timbre-n-back` | 音色回溯 | training | A28 |
| `pattern-recognition` | 模式识别 | training | A29 |
| `breath` | 呼吸空间 | training | A30, C23, C24, C25 |
| `color-block-imprint` | 色块印记 | training | T04 |
| `coordinate-drift` | 坐标迷航 | training | T08 |
| `puzzle` | 行列拼图 | training | T10 |
| `digital-huarong-road` | 数字滑块 | training | T11 |
| `sudoku` | 数独 | training | T12, C18 |
| `bottle-color-matching` | 瓶色推断 | training | T13 |
| `number-merge` | 数字合并 | training | T14 |
| `lights-out` | 熄灯 | training | T15 |
| `click-speed-test` | 点击速度 | training | T17, C19 |
| `right-click-test` | 右键速度 | training | T18 |
| `spacebar-counter` | 空格计数 | training | T19, C20 |
| `dynamic-visual-acuity-test` | 瞬时数字 | training | T20 |
| `dynamic-color` | 动态色差 | training | T22 |
| `matchstick-math` | 火柴等式 | training | T24 |
| `maze` | 迷宫 | training | T25 |
| `number-mirror` | 数字镜像 | training | T26 |
| `quick-mirror-judgment` | 镜像速判 | training | T27 |
| `symmetry-blocks` | 对称方块 | training | T28 |
| `field-of-view` | 视野双判断 | training | C01, C31 |
| `pvt` | 持续警觉 | training | C06 |
| `memory-match` | 记忆配对 | training | C08, C22 |
| `count-boxes` | 数箱子 | training | C14 |
| `object-recall` | 物品回忆 | training | C15 |
| `number-comparison` | 较大数字 | training | C17 |
| `trail-making` | 交替连线 | training | C29 |
| `pomodoro` | 番茄钟 | tool | C21 |
| `bamboo-cicada` | 竹知了 | tool | C30 |

C27 SBTI 娱乐人格问卷排除, 不新增模块、不计完成数.

模块按 ID 动态加载, 导出 definition 和 mount. definition.modes 包含来源、预设、fields、score、ruleVersion、inputs、hiddenPolicy 与 unlock. fields 使用 key/label/type/default/min/max/step/unit/options, 支持数字、选择和复选. 解锁使用显式字符串 key 与 requires, 不跨主体套用门槛. 成绩允许负数的模式须显式提供 score.min.

模式结束原因使用 completed、incorrect、deadline、lives-exhausted、invalidated/resized 等描述, 只有有限且符合模式范围的有效结算进入训练记录. 练习、教程、工具、切页中断不参加最佳或每日挑战. 用户输入在 pointerdown/keydown 记录, 呈现在 requestAnimationFrame 回调中记录.

原12个ID稳定, 旧规则版本1与新规则的明确版本隔离. 存储 v2 容器及键保持不变, 仅增加字段与 toolState, 不需要破坏性迁移. 本轮源码核验后有实质规则变更的模式升至版本3, 保留版本2原型数据但不参与新最佳. 新字段对旧数据可选, 未识别数据原样保留.

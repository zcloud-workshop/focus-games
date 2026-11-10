# Focus Lab · 专注练习室

使用独立的界面设计、图形和实现. 目录包含 55 个训练主体与 2 项专注辅助工具, 按需加载各自的模式、预设和设置. 这是功能实施版本, 尚未完成三个参考来源全部规则及真机验收. 具体取证、本站暂定参数和待证项见 [对齐计划](docs/reference-alignment-plan.md) 与 [规则目录](docs/rules/baseline.md).

- 视觉搜索、动态追踪、短暂呈现、交替连线.
- 顺序与空间记忆、正倒序数字广度、配对、物品回忆与视听 N-Back.
- 反应、抑制、持续警觉、冲突判断、规则切换和心算.
- 图形旋转、折纸、矩阵、镜像、立体计数与规律推理.
- 行列拼图、数字滑块、数独、数字合并、熄灯、火柴等式和迷宫.
- 呼吸引导, 以及单独记录的番茄钟、竹知了工具.
- 模式与参数设置、收藏、搜索、每日三项挑战、本机记录与导出.
- 明亮/深色主题和手机布局, 数字广度与连线可打印题目及独立答案页.

网站使用原生 JavaScript 和 CSS, Vite 生成静态资源, Cloudflare Workers Static Assets 托管. 没有后端、登录或第三方运行时资源依赖.

## 本地开发

使用 nvm 和项目指定的 Node.js 版本:

```sh
nvm install
nvm use
pnpm install
pnpm dev
```

## 验证与构建

```sh
pnpm test
pnpm build
pnpm exec wrangler deploy --dry-run
```

`dist/` 为构建产物, 不提交到 Git. 根目录 `wrangler.jsonc` 配置 `assets.directory` 和 SPA 回退, 不需要 Worker 脚本或额外数据库绑定.

版本预览使用 `https://<版本前缀>-focus-games.icoco.workers.dev`, 每次成功构建后对应独立版本. 生产流量比例不影响访问该版本的预览地址.

## GitHub 推送后自动部署

使用 Cloudflare 原生 [Workers Builds GitHub 集成](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/). 首次需要在 Cloudflare 控制台将 Worker 连接到仓库; 仅推送 GitHub 不会自行创建此连接.

1. 在 Cloudflare Workers & Pages 中创建或选择名为 `focus-games` 的 Worker.
2. 在 Builds 中连接 `zcloud-workshop/focus-games` 仓库, 设置生产分支 `main`.
3. 使用下面的构建配置.

| 配置 | 值 |
| --- | --- |
| 根目录 | `/` |
| 生产分支 | `main` |
| 构建命令 | `pnpm test && pnpm build` |
| 部署命令 | `pnpm exec wrangler deploy` |
| Node.js 版本 | `24.22.0` (由 `.nvmrc` 指定) |
| pnpm 版本 | `12.16.1` (由 `package.json` 指定) |
| 静态资源目录 | `dist` (由 `wrangler.jsonc` 指定) |

Cloudflare 负责为 Workers Builds 授权部署, 无需在仓库保存 Cloudflare API Token. 关联完成后, 每次向 `main` 推送均触发自动构建部署. Worker 名称如有调整, 应同步更新 `wrangler.jsonc` 中的 `name`.

在已登录 Cloudflare 的本机手动部署:

```sh
pnpm deploy
```

参考 [Cloudflare Static Assets 文档](https://developers.cloudflare.com/workers/static-assets/) 和 [Workers Builds 配置](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

## 成绩规则

各训练模块定义自己的主成绩、单位、方向、合法范围和有效结算条件. 多来源玩法是独立模式, 记录同时保存参数快照、输入方式、规则版本、结束原因和分项指标. 个人最佳按主体、模式、相同设置、输入方式与规则版本分组, 允许明确支持的负分.

旧版十二项成绩标记为规则版本 1, 保留原难度标签和独立最佳, 不与新版玩法争夺纪录. 练习、教程、中断和工具不触发训练最佳或每日挑战, 工具记录也不增加训练次数、时长或连续天数. 有效反应样本为空时不伪造 0ms 成绩. 每个模式最多保留最近五次原始试次, 汇总指标长期保存.

记录、收藏、最佳与解锁存于当前浏览器的 `localStorage` (`focus-lab-v2`). 最近 500 条训练记录滚动保留, 最佳和解锁不受条数限制. 首次读取迁移 `focus-lab-v1`, 原键保持不变, 之后旧页面的新记录会去重合并. 每次写入前重新读取, 未识别字段原样保留. 主题使用原 `focus-lab-theme` 键. 工具状态和工具完成记录独立保存, 番茄钟使用绝对截止时间恢复计时.

页面隐藏按模式作废、暂停或继续. 响应计时使用按下事件和实际显示帧. 音频需用户主动启用, 动作感应不可用时可使用手势. 游戏供练习和娱乐, 不提供诊断、常模或虚构人群排名.

## 验收与发布

`docs/rules/<id>.md` 区分来源运行观察、页面说明和本站实现. 当前多数来源参数仍待完整运行核验, 不将同名入口、构建成功或可开始训练等同于已对齐. 本次按用户要求跳过后续测试并直接逐文件提交、合并至 `main` 和推送. 仍未完成的来源差异与交互验收见对齐计划第 8 节, 不将发布等同于全部对齐.

开发分支的预览构建命令为 `pnpm test && pnpm build`, 非生产部署命令应为 `pnpm exec wrangler versions upload`. 本机未登录 Cloudflare 时, dry-run 仍可检查静态资源; 实际版本预览须等待 Workers Builds 或完成现有账号登录后取得版本 ID.

# Focus Lab · 专注练习室

使用独立的界面设计和实现. 提供 12 项可直接游玩的注意力、工作记忆、反应和放松练习.

- 舒尔特方格、找不同的字、色差感知.
- 顺序记忆、数字记忆、N-Back.
- Stroop 色词、反应速度、Go / No-Go、心算挑战.
- 时间感知、呼吸空间.
- 三档难度、分类和搜索、收藏、每日三项挑战.
- 本地成绩、按项目和难度区分的个人最佳、7 天记录及 JSON 导出.
- 手机和桌面布局、键盘操作和减少动态效果支持.

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

- 计时项目记录完成用时或反应的平均用时, 越小越好.
- 色差、Stroop、N-Back、Go / No-Go 和心算记录正确率, 越高越好.
- 色差的正确率统计每题首次作答, 点错后可继续寻找.
- 顺序和数字记忆记录成功完成的最大长度, 越大越好.
- 时间感知记录三轮平均绝对误差, 越小越好.
- 呼吸空间记录完成的呼吸周期数.
- 只保存完整完成的训练; 页面隐藏时中断本轮且不保存.

记录和收藏保存在当前浏览器的 `localStorage`, 最多保留最近 500 条成绩. 不会跨设备同步, 清除浏览器数据会删除记录, 可在训练记录页导出 JSON 备份. 游戏供日常练习和娱乐, 不作为临床评估工具.

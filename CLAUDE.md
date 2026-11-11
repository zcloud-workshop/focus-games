# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Focus Lab (专注练习室): 55 cognitive training games plus 2 focus tools (pomodoro, bamboo-cicada). Vanilla JavaScript and CSS only — no framework, no backend, no login, no third-party runtime dependencies. Vite produces static assets hosted on Cloudflare Workers Static Assets (`wrangler.jsonc`, SPA fallback, no Worker script). All user-facing strings are Simplified Chinese; keep them that way.

## Commands

```sh
nvm use            # Node 24.22.0 (.nvmrc); pnpm 12.16.1 via corepack
pnpm install
pnpm dev           # vite dev server on 127.0.0.1
pnpm test          # node --test tests/*.test.js
node --test tests/core.test.js                          # single file
node --test --test-name-pattern "模式" tests/nback-game.test.js   # single test
pnpm build         # vite build → dist/ (gitignored)
pnpm exec wrangler deploy --dry-run   # asset/config check, works logged out
pnpm deploy        # real deploy, requires Cloudflare login
```

Run `TZ=UTC pnpm test` before pushing — Cloudflare builds execute in UTC and tests must be time-zone independent (never use local-time assumptions around dates/streaks).

## Architecture

Single-page app rendered by `src/main.js` into `#app` via template strings, hash-routed (`#training`, `#favorites`, `#records`, `#game/<id>`). `index.html` is only a shell.

- **`src/core.js`** — the frozen catalog: `games` (57 entries: 55 `kind: 'training'` + 2 `kind: 'tool'`), `categories`, `dailyChallenges`, `legacyRules` (v1 scores), plus pure helpers (`shuffle`, `localDate`, `summarize`). Catalog counts and source codes (A01, T05, C03…) are frozen and asserted by `tests/catalog.test.js`; adding a game means updating the catalog and creating the module together.
- **`src/games.js`** — lazy game loading via `import.meta.glob('./games/*.js')`. `mountGame()` wraps a module's `mount()` with loading/retry and returns a stop function.
- **`src/games/<id>.js`** — one module per game, exporting `definition` and `mount()`. The definition contract (enforced by tests): `modes[]` each with unique `id`, `ruleVersion >= 2`, non-empty `presets` (each with a `settings` object), `score: { unit, lower, min, max? }`, `hiddenPolicy` (`invalidate` | `pause` | `continue`), `inputs[]`, `rule` text, optional `fields` (settings UI) and per-mode `validateSettings`. `mount({ root, mode, settings, onFinish, random, clock })` renders into `root.innerHTML` and returns a cleanup function; `runtime.finish(result)` auto-fills `duration`.
- **`src/engines/`** — shared engines. `runtime.js` is the core: `createRuntime()` gives `later/frame/listen/finish/cleanup`; all timers, animation frames, and event listeners must go through it so cleanup aborts everything at once. Family engines (`nback`, `sequence`, `choices`, `inhibition`, `boards`, `counter`, `grid`, `transforms`, `audio`, `input`, `board-input`, `print`, `trials`) are reused across related games — e.g. `engines/nback.js` backs nback, dual-n-back, timbre-n-back, and auditory-attention. Extract shared logic here rather than duplicating per game.
- **`src/storage.js`** — localStorage store `focus-lab-v2` (migrates `focus-lab-v1` on first read; unknown fields preserved on write). Rolling last 500 records; personal bests grouped by game + mode + same settings + input method + rule version; tool records stored separately and never count toward training stats; per-mode last 5 raw trial sessions. `main.js` calls `registerDefinition()` when a game module loads. The `oldScores` table hardcodes v2 score domains — score rules come from definitions, never inferred from stored records.

Scoring conventions: practice/tutorial modes (`scored: false`) and interruptions create no records or bests; never fabricate a 0 ms score when there are no valid response samples; negative scores are allowed where the definition declares them; timing uses press events (`inputTime`) and actual displayed frames (`presentOnFrame`), not click events.

## Testing conventions

Tests run under plain `node --test` — no jsdom, no browser. DOM-adjacent code is tested by stubbing globals with `EventTarget` (`globalThis.document = new EventTarget()`, fake `root`) and dispatching synthetic events; see `tests/sudoku-modes.test.js` and `tests/board-input.test.js`. Therefore: keep game logic in exported pure functions with injected `random` and `clock`, keep `mount()` thin, and make modules tolerate `EventTarget` roots in this style. `tests/catalog.test.js` walks every game module and asserts the definition contract, so a contract violation fails `pnpm test` directly.

## Development flow

The catalog's source codes (A, T, C — used in catalog entries and mode `sources`) refer to three external reference sites this project's games were designed from. Implementation exists but most source parameters were never verified against the live sites.

- Work on a branch, verify on a version preview URL (`https://<version-prefix>-focus-games.icoco.workers.dev`, dev deploys use `pnpm exec wrangler versions upload`), then merge to `main`, which auto-deploys via Cloudflare Workers Builds (build `pnpm test && pnpm build`, deploy `pnpm exec wrangler deploy`).
- Keep commits per-file and short, e.g. `fix: maze timer` (see git log).

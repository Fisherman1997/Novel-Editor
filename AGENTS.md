# AGENTS.md

Novel-Editor: Electron desktop novel-writing app (Vue 3 + TypeScript + Tiptap + Element Plus). Single package — not a monorepo. Uses **npm** (`package-lock.json`); do not use yarn/pnpm.

## Commands

```bash
npm install          # postinstall runs electron-builder install-app-deps
npm run dev          # electron-vite dev (main + preload + renderer)
npm run lint         # ESLint with --fix (mutates files)
npm run format       # Prettier write-all
npm run typecheck    # typecheck:node (tsc) then typecheck:web (vue-tsc)
npm run build        # typecheck && electron-vite build
npm test             # vitest (watch by default)
npm run test:coverage
```

- Verify order before commit: `lint -> typecheck -> test`.
- Single test file: `npx vitest run tests/unit/utils/htmlText.test.ts`.
- Packaging: `build:win` / `build:mac` / `build:linux` (each runs full `build` first); `builder:*` skips typecheck/build and packages `out/` only.

## Architecture

Three-process Electron layout under `src/`:

- `src/main/` — main process entry `index.ts`; IPC handlers in `src/main/ipc/` (`file.ts`, `window.ts`, `system.ts`, `agent.ts`), registered via `ipc/index.ts`.
- `src/preload/` — exposes `window.api` (typed in `index.d.ts`); all renderer→main calls go through this bridge.
- `src/renderer/src/` — Vue 3 app entry `main.ts`; root `App.vue`.
- `src/shared/` — types (`types.ts`, includes `IPC_CHANNELS`) and `.xstxt` migration (`migration.ts`, book format v4). Shared by all three processes.

Path aliases (configured in `electron.vite.config.ts` and `vitest.config.ts`): `@shared` → `src/shared`, `@renderer` → `src/renderer/src`. Use them; do not use deep relative imports across process boundaries.

State: four Pinia stores in `src/renderer/src/store/` — `main` (UI/config), `novel` (book data + AI agent sessions), `editor` (search/annotation targeting), `agentConfig` (LLM connection config). Config persists to `localStorage`.

## Conventions & gotchas

- **Element Plus is auto-imported** (`unplugin-auto-import` + `unplugin-vue-components` with `ElementPlusResolver`). Do not manually import El* components or their CSS. `src/renderer/auto-imports.d.ts` and `components.d.ts` are generated — do not hand-edit.
- **Chapter content is HTML** from Tiptap. Search/replace must go through `src/renderer/src/utils/htmlText.ts` (DOMParser-based). Never regex-replace raw HTML strings — it corrupts tags.
- **Annotations** are Tiptap marks in content HTML + metadata in `chapter.annotations[]`. Keep both in sync via the novel store / `useAnnotation`; never edit one side alone.
- **`.xstxt` files are JSON**. Old singular field names are migrated in `src/shared/migration.ts` (`parseAndMigrate`); always load through it, never `JSON.parse` directly.
- Renderer config uses `window.api.*` only (defined in preload). Main process must not be imported from renderer code.
- **AI assistant iron rule: the agent never writes book content.** No IPC channel mutates `chapter.content`; the UI offers copy only (no "apply to chapter"); context is frozen as plain-text snapshots (`utils/agentContext.ts`) — never store references. LLM calls go main-process only (`ipc/agent.ts`, SSE) because renderer CSP blocks external requests; never log `apiKey`.
- **LLM config** (`baseUrl`/`apiKey`/`model`/…) lives in `localStorage['agent-config']` (`store/agentConfig.ts`) and must never be written into `.xstxt`.
- Vitest: `tests/**/*.test.ts`, environment `happy-dom`. Coverage excludes `src/main/**` and `src/preload/**`.
- No CI workflows in this repo — run lint/typecheck/test locally.
- Existing agent guidance also lives in `CLAUDE.md`; prefer executable config (`package.json`, `*.config.ts`) if they conflict.

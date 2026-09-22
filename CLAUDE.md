# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Novel-Editor (小说编辑器) is an Electron-based desktop application for writing and organizing novels. Built with TypeScript, Vue 3, Element Plus, and Tiptap rich text editor. Includes an AI writing assistant panel (right sidebar) that streams suggestions from an OpenAI-compatible endpoint via a main-process proxy — strictly read-only with respect to book content.

## Commands

```bash
# Development
npm install          # Install dependencies (use npm, not yarn)
npm run dev          # Start development server

# Build
npm run build        # Typecheck + build
npm run build:win    # Build for Windows
npm run build:mac    # Build for macOS
npm run build:linux  # Build for Linux

# Code Quality
npm run lint         # ESLint with auto-fix
npm run format       # Prettier formatting
npm run typecheck    # Run both node and web type checks

# Testing
npm test             # Run unit tests (vitest)
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage
```

## Architecture

### Electron Structure (3-process model)

```
src/
├── shared/                    # Shared types and utilities
│   ├── types.ts              # TypeScript interfaces for all data models
│   └── migration.ts          # Data migration for old .xstxt files
├── main/                      # Main process (Node.js)
│   ├── index.ts              # Window creation, app lifecycle, IPC initialization
│   ├── ipc/                  # IPC handlers (modular)
│   │   ├── index.ts          # Register all handlers
│   │   ├── file.ts           # File operations (read/write/select/export)
│   │   ├── window.ts         # Window control (minimize/maximize/close)
│   │   ├── system.ts         # System operations (desktop path, startup file)
│   │   └── agent.ts          # AI chat proxy (SSE streaming, abort, timeout)
│   ├── logger.ts             # Logging system
│   └── updater.ts            # Auto-update functionality
├── preload/                   # Preload scripts (bridge between main and renderer)
│   ├── index.ts              # Exposes `window.api` and `window.electron` to renderer
│   └── index.d.ts            # Type definitions for exposed APIs
└── renderer/                  # Vue 3 app (renderer process)
    └── src/
        ├── App.vue           # Root component (layout + global dialogs)
        ├── main.ts           # Vue app initialization with Pinia
        ├── components/
        │   ├── layout/       # Layout components
        │   │   ├── AppHeader.vue      # Window title bar
        │   │   ├── AppLeftNav.vue     # Book structure navigation
        │   │   └── AppRight.vue       # Right panel (characters/worldview/annotations/assistant)
        │   ├── editor/       # Rich text editor (Tiptap)
        │   │   ├── TiptapEditor.vue   # Main editor component
        │   │   └── EditorToolbar.vue  # Formatting toolbar
        │   ├── novel/        # Novel structure components
        │   │   ├── CharacterList.vue  # Character management
        │   │   ├── WorldViewList.vue  # World-building settings
        │   │   └── AnnotationList.vue # Annotations list
        │   ├── agent/        # AI assistant
        │   │   └── AgentPanel.vue     # Chat panel (sessions/context/messages/settings)
        │   ├── dialog/       # Dialog components
        │   │   ├── SearchDialog.vue       # Search and replace
        │   │   ├── AnnotationDialog.vue   # Add/edit annotations
        │   │   ├── ExportDialog.vue       # Export novel
        │   │   └── SettingsDialog.vue     # Editor settings
        │   └── common/       # Shared components
        │       └── InlineEdit.vue     # Inline text editing
        ├── editor/           # Editor extensions
        │   ├── AnnotationMark.ts  # Tiptap Mark for annotations
        │   └── textPosition.ts    # ProseMirror ↔ plain-text offset mapping
        ├── store/            # Pinia state management
        │   ├── index.ts      # Export all stores
        │   ├── main.ts       # UI state (file status, editor config, history)
        │   ├── novel.ts      # Novel data (volumes, chapters, characters, worldview, agent sessions)
        │   ├── editor.ts     # Editor state (search, annotations, scroll targeting)
        │   └── agentConfig.ts # LLM connection config (localStorage only)
        ├── composables/      # Vue composables (reusable logic)
        │   ├── index.ts      # Export all composables
        │   ├── useAutoSave.ts   # Auto-save with debounce
        │   ├── useSearch.ts     # Search and replace (singleton, DOM-safe)
        │   ├── useAnnotation.ts # Annotation management (store-driven)
        │   └── useAgentChat.ts  # AI chat streaming (single-flight, abort, context refresh)
        └── utils/
            ├── errorHandler.ts  # Global error handling + error reporting
            ├── htmlText.ts      # DOM-based HTML text extraction / search / replace
            ├── agentPrompt.ts   # AI system prompt, quick prompts, message building
            ├── agentContext.ts  # Read-only plain-text context snapshots + truncation
            └── text.ts          # Word count utility (Chinese char + English word)
```

### Key Data Model (`src/shared/types.ts`)

- **NovelData**: Top-level book structure
  - `name`: Book title
  - `volumes[]`: Array of volumes, each containing `chapters[]`
  - `characters[]`: Character profiles (id, name, personality, appearance, age, content)
  - `worldViews[]`: World-building settings (id, name, settings[], content)
  - `agent?` (optional): AI assistant sessions for this book — `AgentBookData { sessions[], activeSessionId }`; format v4
- **Volume**: Contains `volumeName`, `volumeSummary` (optional), and `chapters[]`
- **Chapter**: Contains `chapterName`, `chapterSummary` (optional), `content` (HTML from Tiptap), and `annotations[]`
- **Annotation**: Supports highlight, note, and link types. New annotations use Tiptap marks in content HTML + metadata in `annotations[]`
- **Agent types**: `AgentSession` (title, `contextScope` outline/currentChapter/fullBook, frozen `context` snapshot, `messages[]`, pinned), `AgentMessage` (user/assistant, optional `error`), `AgentContextSnapshot` (plain text only: outline/bodyText/materials + truncation stats), `AgentConfig` (baseUrl/apiKey/model/temperature/maxTokens — localStorage, never `.xstxt`)

### IPC Communication Pattern

Main process handlers in `src/main/ipc/`:
- `file:read` / `file:write`: File I/O (`.xstxt` format)
- `file:select`: Native file/directory dialog
- `file:export`: Export novel to organized text files (supports `includeSummary`/`convertToPlainText` options)
- `window:control`: Window operations (minimize/maximize/close)
- `system:desktopPath`: Get desktop path for default save location
- `system:startupFile`: Get file passed via command line (file association)
- `agent:chat` / `agent:abort`: Start/abort an LLM streaming request (renderer is CSP-blocked from the network; main process performs the fetch)
- `agent:chunk` / `agent:done` / `agent:error`: Streamed events main → renderer (SSE deltas, completion, failure; never include `apiKey`)
- `renderer:error`: Render process error reporting to main process logger
- `log:read` / `log:clear` / `log:path`: Log file access from renderer

Renderer accesses via `window.api.*` (defined in preload).

### State Management

Four Pinia stores:
- **mainStore**: UI state (file loaded, dirty flag, editor config, auto-save settings, recent files, right panel width/tab)
- **novelStore**: Novel data (volumes, chapters, characters, worldViews, annotations, **agent sessions**). Includes HTML-level annotation operations and agent session CRUD (create/select/rename/pin/delete, context snapshot ensure/refresh, message append/finalize with 200-message cap).
- **editorStore**: Editor state (search state, annotation dialog state, scroll targeting, undo/redo status, content reload nonce)
- **agentConfigStore**: LLM endpoint config — persists to `localStorage['agent-config']` only; `isConfigured` requires baseUrl + model

State persists to `localStorage` via `mainStore.saveConfig()` (app config) and `agentConfigStore.persist()` (LLM config). Book data (including agent sessions) persists inside the `.xstxt` file via `novelStore.toJSON()`.

### Composables

- **useAutoSave**: Auto-save with configurable interval (default 30s) and debounce (5s)
- **useSearch**: DOM-safe full-text search using `htmlText.ts` (extracts plain text via DOMParser, no HTML matching). Singleton — all callers share `editorStore.search` refs.
- **useAnnotation**: Store-driven annotation management. Opens dialog via `editorStore.openAnnotationCreate/openAnnotationEdit`. Uses `AnnotationMark` Tiptap extension for inline marks.
- **useAgentChat**: AI chat streaming — global single-flight, freeze/refresh context snapshot, stop (abort) with partial content kept, error marking, listener disposal on unmount. Never touches `chapter.content`.

## Build Configuration

- **electron-vite**: Handles main/preload/renderer builds separately
- **electron-builder**: Packages app (config in `electron-builder.yml`)
- File association: `.xstxt` files
- Auto-import: Element Plus components (via `unplugin-auto-import` and `unplugin-vue-components`)
- **vitest**: Unit testing (config in `vitest.config.ts`, happy-dom environment)

## Key Features

- **Rich Text Editing**: Tiptap editor with formatting toolbar (bold, italic, headings, lists, etc.)
- **Undo/Redo**: Tiptap built-in History (100 steps) with toolbar buttons and keyboard shortcuts
- **Auto-Save**: Configurable interval with debounce, saves before close
- **Search & Replace**: DOM-safe text search (no HTML corruption), regex support, scope selection (current chapter/all), scroll-to-result
- **Annotations**: Highlight, note, link types. Stored as Tiptap marks in content HTML + metadata in chapter.annotations. Click to edit/delete from annotation list.
- **AI Writing Assistant**: Right-panel "助手" tab — multi-session chat with streaming output against an OpenAI-compatible `/chat/completions` endpoint (main-process proxy). Context scopes: outline / current chapter / full book, frozen as plain-text snapshots on first send (manual refresh available). **Read-only by design**: no write-to-chapter IPC, UI only offers copy, apiKey stored in localStorage only (never in `.xstxt`).
- **Data Migration**: Automatic migration from old .xstxt format (volume/character/worldView singular fields)
- **Auto-Update**: GitHub Releases auto-update (disabled in development)
- **Logging**: File-based logging with rotation (10MB max), renderer error reporting

## Keyboard Shortcuts

- `Ctrl+S`: Save file
- `Ctrl+N`: New file
- `Ctrl+O`: Open file
- `Ctrl+Z`: Undo
- `Ctrl+Y` / `Ctrl+Shift+Z`: Redo
- `Ctrl+F`: Open search

## Testing

- Unit tests in `tests/unit/` (`shared/`, `store/`, `utils/`)
- Run `npm test` to execute vitest
- Run `npm run test:coverage` for coverage report

# Gemini Ultra Toolkit

Modular assistant platform for [Google Gemini](https://gemini.google.com/) — available as both a **Tampermonkey userscript** and a **browser extension** (Chrome/Edge/Firefox).

## Features

| Module | Description |
|--------|-------------|
| **Counter** | Track daily message counts per model (Flash/Thinking/Pro) with streak tracking |
| **Folders** | Organize conversations into folders with drag-and-drop |
| **Export** | Export usage data as CSV or Markdown reports |
| **Prompt Vault** | Save and quick-insert frequently used prompts |
| **Default Model** | Auto-select your preferred model on page load |
| **Batch Delete** | Select and delete multiple conversations at once |
| **Quote Reply** | Quote selected text into the input area |
| **UI Tweaks** | Tab title updates, Ctrl+Enter send, layout customizations |

All modules can be individually enabled/disabled from the settings panel.

## Install

### Userscript (Tampermonkey / Violentmonkey)

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. Open `dist/gemini-ultra-toolkit.user.js` and click "Install"

### Browser Extension

1. Download or build the `dist/extension/` folder
2. **Chrome/Edge**: Go to `chrome://extensions/` → Enable Developer Mode → Load Unpacked → select `dist/extension/`
3. **Firefox**: Go to `about:debugging` → This Firefox → Load Temporary Add-on → select `dist/extension/manifest.json`

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/AntisocialGravity/gemini-ultra-toolkit.git
cd gemini-ultra-toolkit
npm install
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build both userscript and extension |
| `npm run build:userscript` | Build userscript only → `dist/gemini-ultra-toolkit.user.js` |
| `npm run build:extension` | Build extension only → `dist/extension/` |
| `npm run dev` | Watch mode (rebuild on save) |
| `npm test` | Run tests with 100% coverage enforcement |

### Project Structure

```
src/
├── core/           # Storage adapter, constants, theme, module registry, utils
├── modules/        # 8 feature modules (factory functions with DI)
├── ui/             # Panel, settings, dashboard, details pane
├── styles/         # Extracted CSS
├── platforms/
│   ├── userscript/ # Tampermonkey entry point (GM_* storage backend)
│   └── extension/  # Browser extension entry (chrome.storage backend)
└── shared/         # Platform-agnostic app wiring
lib/                # Pure utility modules (CommonJS, 100% test coverage)
tests/              # Unit tests (Node.js test runner + c8)
```

### Architecture

Both platforms share the same core code. The **StorageAdapter** pattern abstracts the difference between `GM_getValue/setValue` (sync) and `chrome.storage.local` (async) via a preload cache — all downstream code uses synchronous `storage.get()`/`storage.set()` calls.

Each module is a **factory function** receiving dependencies via injection:

```javascript
export function createCounterModule({ storage, Core, Logger, GLOBAL_KEYS }) {
  return {
    id: 'counter',
    init() { /* ... */ },
    tick() { /* ... */ },
  };
}
```

## License

[MIT](LICENSE)

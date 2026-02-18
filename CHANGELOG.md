# Changelog

## [9.0.0] - 2026-02-18

### Architecture
- Modular architecture with factory functions + dependency injection
- Dual-platform support: Tampermonkey userscript + browser extension
- Rollup build system with terser compression
- StorageAdapter abstraction (GM_* / chrome.storage)

### Security
- ReDoS protection: regex length limit (100 chars) in folder auto-classify rules
- CSS injection prevention: hex color validation for folder colors
- Null-safety checks on all export methods

### Performance
- Merged default-model URL watcher into main loop tick (eliminated independent 800ms timer)
- Safety cap on streak calculation loop (max 3650 iterations)
- Build-time VERSION injection via @rollup/plugin-replace

### Accessibility
- ARIA roles and labels on folder tree items and action buttons
- Keyboard navigation (Enter/Space) for folder collapse toggle
- Modal focus trap with Tab cycling
- Escape key to close modals
- `prefers-reduced-motion` support

### Testing
- 74 tests, 100% coverage across all lib/ files
- MODEL_CONFIG sync guard test (counter.js ↔ quota_calc.cjs)

### Modules
- **Counter**: Message counting, model tracking, streaks, quota
- **Export**: CSV/JSON/Markdown export with null-safety
- **Folders**: Drag-and-drop organization with auto-classify rules
- **Prompt Vault**: Save and reuse prompt templates
- **Default Model**: Auto-select preferred model for new chats
- **Batch Delete**: Bulk conversation management
- **Quote Reply**: Quote and reply to messages
- **UI Tweaks**: Visual customizations

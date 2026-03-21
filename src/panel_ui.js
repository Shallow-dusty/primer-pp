import { GLOBAL_KEYS, QUOTA_COLORS, PANEL_ID, DEFAULT_POS, TEMP_USER, VERSION } from './constants.js';
import { formatLocalDate } from '../lib/date_utils.js';
import { createIcon } from './icons.js';
import { GuidedTour } from './guided_tour.js';
import { Logger, filterLogs, isDebugEnabled, setDebugEnabled } from './logger.js';
import { Core } from './core.js';
import { ModuleRegistry } from './module_registry.js';
import { getCurrentTheme, setCurrentTheme } from './state.js';
import { CounterModule } from './modules/counter.js';
import { ExportModule } from './modules/export.js';
import {
    debugShowDetectedUser,
    debugDumpStorageKeys,
    debugDumpGeminiStores,
    debugExportLegacyData,
    debugExportAllStorage,
    debugExportLogs
} from './debug_utils.js';

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                          PANEL UI (面板界面)                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Module ID → SVG icon name mapping
const MODULE_ICON_MAP = {
    'counter': 'chart',
    'export': 'upload',
    'folders': 'folder',
    'prompt-vault': 'gem',
    'default-model': 'bot',
    'batch-delete': 'trash',
    'quote-reply': 'quote',
    'ui-tweaks': 'palette'
};

/** Set element content to [SVG icon] + text (CSP-safe) */
function setIconText(el, iconName, text, iconSize = 14) {
    el.textContent = '';
    el.appendChild(createIcon(iconName, iconSize));
    if (text) el.appendChild(document.createTextNode(' ' + text));
}

/** Render a module's icon as SVG, fallback to emoji */
function renderModIcon(mod, size = 16) {
    const name = MODULE_ICON_MAP[mod.id];
    if (name) return createIcon(name, size);
    const span = document.createElement('span');
    span.textContent = mod.icon;
    return span;
}

export const PanelUI = {
    _activeTab: 'stats',
    // --- 样式注入 ---
    injectStyles() {
        GM_addStyle(`
            #${PANEL_ID} {
                --bg: #202124; --text-main: #fff; --text-sub: #ccc; --accent: #8ab4f8;
                --blur: 18px; --saturate: 180%;
                position: fixed; z-index: 2147483647; width: 170px;
                background: var(--bg);
                backdrop-filter: blur(var(--blur)) saturate(var(--saturate));
                -webkit-backdrop-filter: blur(var(--blur)) saturate(var(--saturate));
                border: 1px solid var(--border); border-radius: 16px;
                border-top: 1px solid var(--highlight, rgba(255,255,255,0.08));
                box-shadow: var(--shadow), var(--border-highlight, inset 0 0 0 transparent);
                font-family: 'Google Sans', Roboto, sans-serif;
                overflow: hidden; user-select: none;
                display: flex; flex-direction: column;
                transition: height 0.35s cubic-bezier(0.19, 1, 0.22, 1),
                            background 0.3s cubic-bezier(0.19, 1, 0.22, 1),
                            box-shadow 0.4s cubic-bezier(0.19, 1, 0.22, 1),
                            transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
            }
            #${PANEL_ID}:hover {
                box-shadow: var(--shadow-hover, var(--shadow)), var(--border-highlight, inset 0 0 0 transparent);
                transform: translateY(-2px);
            }
            .gemini-header {
                padding: 8px 14px; cursor: grab;
                background: var(--header-bg, rgba(255, 255, 255, 0.03));
                border-bottom: 1px solid var(--header-border, rgba(255, 255, 255, 0.05));
                display: flex; align-items: center; justify-content: space-between; height: 32px;
            }
            .user-capsule {
                display: flex; align-items: center; gap: 4px;
                font-size: 10px; color: var(--text-sub);
                background: var(--badge-bg, rgba(255,255,255,0.05));
                padding: 2px 8px; border-radius: 12px; border: 1px solid transparent;
                max-width: 120px; overflow: hidden;
            }
            .acct-badge-inline {
                font-size: 8px; font-weight: 600; letter-spacing: 0.4px;
                padding: 1px 5px; border-radius: 10px;
                background: var(--badge-bg, rgba(255,255,255,0.06));
                color: var(--text-sub);
                text-transform: uppercase;
                flex-shrink: 0;
            }
            .acct-badge-inline[data-tier="pro"] {
                background: rgba(138,180,248,0.2);
                color: #8ab4f8;
            }
            .acct-badge-inline[data-tier="ultra"] {
                background: rgba(251,188,4,0.2);
                color: #fbbc04;
            }
            .user-capsule.viewing-other { border-color: #fdbd00; color: #fdbd00; }
            .user-avatar-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
            .gemini-toggle-btn { cursor: pointer; font-size: 14px; opacity: 0.6; color: var(--text-sub);
                transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
            .gemini-toggle-btn:hover { opacity: 1; color: var(--accent); }
            .gemini-main-view { padding: 12px 14px 14px; text-align: center; }
            .gemini-big-num {
                font-size: 40px; font-weight: 400; color: var(--text-main); line-height: 1;
                margin-bottom: 4px; text-shadow: 0 0 20px rgba(128, 128, 128, 0.1);
                transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .gemini-big-num.bump {
                animation: numBump 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            @keyframes numBump {
                0%   { transform: scale(1); }
                40%  { transform: scale(1.15); }
                100% { transform: scale(1); }
            }

            /* --- 模型 & 配额 --- */
            .gemini-model-row {
                display: flex; align-items: center; justify-content: center; gap: 6px;
                margin-bottom: 6px;
            }
            .model-badge {
                font-size: 9px; font-weight: 700; letter-spacing: 0.6px;
                padding: 2px 7px; border-radius: 6px;
                line-height: 1.4;
                border: 1px solid var(--divider, rgba(255,255,255,0.15));
            }
            .quota-bar-wrap {
                margin: 6px 0 8px; height: 4px; border-radius: 2px;
                background: var(--btn-bg); overflow: hidden;
                position: relative;
            }
            .quota-bar-fill {
                height: 100%; border-radius: 2px;
                transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                            background 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .quota-label {
                font-size: 9px; color: var(--text-sub); opacity: 0.6;
                margin-bottom: 8px; font-family: monospace;
            }

            .gemini-sub-info {
                font-size: 10px; color: var(--text-sub); margin-bottom: 8px;
                font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .gemini-details-view {
                height: 0; opacity: 0; overflow: hidden; background: var(--detail-bg, rgba(0,0,0,0.1));
                padding: 0 12px;
                transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .gemini-details-view.expanded { height: auto; opacity: 1; padding: 10px 12px 14px 12px; border-top: 1px solid var(--border); max-height: 420px; overflow-y: auto; }
            .section-title {
                font-size: 9px; color: var(--text-sub); opacity: 0.5;
                margin: 8px 0 4px 0; text-transform: uppercase; letter-spacing: 1px;
            }
            .detail-row {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 4px; font-size: 11px; color: var(--text-sub); cursor: pointer;
                padding: 5px 8px; border-radius: 6px;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .detail-row:hover { background: var(--row-hover); color: var(--text-main); }
            .detail-row:active { transform: scale(0.98); }
            .detail-row.active-mode { background: rgba(138, 180, 248, 0.15); color: var(--accent); font-weight: 500; }
            .user-row { justify-content: flex-start; gap: 6px; }
            .user-row.is-me { border-left: 2px solid var(--accent); }
            .user-indicator { font-size: 8px; padding: 1px 4px; border-radius: 4px; background: var(--accent); color: #000; }
            .g-btn {
                background: var(--btn-bg); border: 1px solid transparent;
                color: var(--text-sub); border-radius: 8px; padding: 6px 0; font-size: 11px;
                cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); width: 100%;
            }
            .g-btn:hover { background: var(--row-hover); color: var(--text-main); }
            .g-btn:active { transform: scale(0.97); opacity: 0.85; }
            .g-btn.danger-1 { color: #f28b82; border-color: #f28b82; }
            .g-btn.danger-2 { background: #f28b82; color: #202124; font-weight: bold; }
            .g-btn.disabled { opacity: 0.5; cursor: not-allowed; }

            /* Settings Modal */
            @keyframes modalIn {
                0% { opacity: 0; transform: translateY(16px) scale(0.96); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes overlayIn {
                from { opacity: 0; }
                to   { opacity: 1; }
            }
            .settings-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: var(--overlay-tint, rgba(0,0,0,0.6)); z-index: 2147483646;
                display: flex; align-items: center; justify-content: center;
                animation: overlayIn 0.2s ease-out;
            }
            .settings-modal {
                width: 300px; max-height: 80vh; overflow-y: auto;
                background: var(--bg, #202124); border: 1px solid var(--border, rgba(255,255,255,0.1));
                border-top: 1px solid var(--highlight, rgba(255,255,255,0.08));
                border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2);
                font-family: 'Google Sans', Roboto, sans-serif;
                animation: modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .settings-header {
                padding: 12px 16px; border-bottom: 1px solid var(--divider, rgba(255,255,255,0.1));
                display: flex; justify-content: space-between; align-items: center;
            }
            .settings-header h3 { margin: 0; font-size: 14px; color: var(--text-main, #fff); font-weight: 500; }
            .settings-close { cursor: pointer; font-size: 18px; color: var(--text-sub, #9aa0a6); }
            .settings-close:hover { color: var(--accent, #8ab4f8); }
            .settings-body { padding: 12px 16px; }
            .settings-section { margin-bottom: 16px; }
            .settings-section-title { font-size: 10px; color: var(--text-sub, #9aa0a6); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
            .settings-row {
                display: flex; justify-content: space-between; align-items: center;
                padding: 8px 0; border-bottom: 1px solid var(--divider, rgba(255,255,255,0.05));
            }
            .settings-row:last-child { border-bottom: none; }
            .settings-label { font-size: 12px; color: var(--text-main, #fff); }
            .settings-select {
                background: var(--btn-bg, rgba(255,255,255,0.05)); border: 1px solid var(--border, rgba(255,255,255,0.1));
                color: var(--text-main, #fff); border-radius: 6px; padding: 4px 8px; font-size: 11px;
            }
            .settings-btn {
                background: var(--btn-bg, rgba(255,255,255,0.05)); border: 1px solid transparent;
                color: var(--text-sub, #9aa0a6); border-radius: 8px; padding: 8px 12px; font-size: 11px;
                cursor: pointer; transition: all 0.2s; width: 100%; margin-top: 4px;
            }
            .settings-btn:hover { background: var(--row-hover, rgba(255,255,255,0.05)); color: var(--text-main, #fff); }
            .settings-btn:active { transform: scale(0.97); opacity: 0.85; }
            .settings-btn.danger { color: #f28b82; border-color: #f28b82; }
            .settings-version { font-size: 10px; color: var(--text-sub, #9aa0a6); text-align: center; padding: 8px; opacity: 0.6; }

            /* Debug Modal */
            .debug-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: var(--overlay-tint, rgba(0,0,0,0.6)); z-index: 2147483646;
                display: flex; align-items: center; justify-content: center;
                animation: overlayIn 0.2s ease-out;
            }
            .debug-modal {
                width: 520px; max-width: 95vw; max-height: 85vh; overflow-y: auto;
                background: var(--bg, #202124); border: 1px solid var(--border, rgba(255,255,255,0.1));
                border-top: 1px solid var(--highlight, rgba(255,255,255,0.08));
                border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2);
                font-family: 'Google Sans', Roboto, sans-serif;
                animation: modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .debug-header {
                padding: 12px 16px; border-bottom: 1px solid var(--divider, rgba(255,255,255,0.1));
                display: flex; justify-content: space-between; align-items: center;
            }
            .debug-header h3 { margin: 0; font-size: 14px; color: var(--text-main, #fff); font-weight: 500; }
            .debug-close { cursor: pointer; font-size: 18px; color: var(--text-sub, #9aa0a6); }
            .debug-close:hover { color: var(--accent, #8ab4f8); }
            .debug-body { padding: 12px 16px; display: flex; flex-direction: column; gap: 12px; }
            .debug-kv { font-size: 11px; color: var(--text-sub); line-height: 1.6; }
            .debug-kv strong { color: var(--text-main); font-weight: 500; }
            .debug-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
            .debug-log-list {
                background: var(--code-bg, rgba(0,0,0,0.3)); border: 1px solid var(--divider, rgba(255,255,255,0.08));
                border-radius: 8px; padding: 8px; max-height: 240px; overflow: auto;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                font-size: 10px; color: var(--text-sub);
            }
            .debug-log-item { padding: 2px 0; border-bottom: 1px dashed var(--divider, rgba(255,255,255,0.05)); }
            .debug-log-item:last-child { border-bottom: none; }
            .debug-filter-row { display: flex; gap: 6px; flex-wrap: wrap; }
            .debug-filter-btn {
                font-size: 10px; padding: 4px 8px; border-radius: 6px;
                border: 1px solid var(--divider, rgba(255,255,255,0.1));
                background: var(--input-bg, rgba(255,255,255,0.05));
                color: var(--text-sub); cursor: pointer;
            }
            .debug-filter-btn.active { color: var(--text-main); border-color: var(--accent); }
            .debug-search {
                background: var(--code-bg, rgba(0,0,0,0.3));
                border: 1px solid var(--divider, rgba(255,255,255,0.1));
                color: var(--text-main); border-radius: 6px; padding: 4px 8px;
                font-size: 10px; width: 100%;
            }
            .debug-level { font-weight: 700; letter-spacing: 0.3px; }
            .debug-level.error { color: #f28b82; }
            .debug-level.warn { color: #fbbc04; }
            .debug-level.info { color: #8ab4f8; }
            .debug-level.debug { color: #81c995; }

            /* Module Toggle */
            .module-toggle-row {
                display: flex; justify-content: space-between; align-items: center;
                padding: 10px 0; border-bottom: 1px solid var(--divider, rgba(255,255,255,0.05));
            }
            .module-info { display: flex; align-items: center; gap: 8px; }
            .module-icon { font-size: 16px; display: inline-flex; align-items: center; }
            .module-text { display: flex; flex-direction: column; }
            .module-name { font-size: 12px; color: var(--text-main, #fff); }
            .module-desc { font-size: 9px; color: var(--text-sub, #9aa0a6); opacity: 0.7; }
            .toggle-switch {
                position: relative; width: 36px; height: 20px;
                background: var(--btn-bg, rgba(255,255,255,0.1)); border-radius: 10px;
                cursor: pointer; transition: background 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .toggle-switch.on { background: var(--accent, #8ab4f8); }
            .toggle-switch::after {
                content: ''; position: absolute; top: 2px; left: 2px;
                width: 16px; height: 16px; background: #fff; border-radius: 50%;
                transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
            .toggle-switch.on::after { transform: translateX(16px); }

            /* --- Dashboard Styles --- */
            .dash-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: var(--overlay-tint, rgba(0,0,0,0.85)); z-index: 2147483645;
                display: flex; align-items: center; justify-content: center;
                backdrop-filter: blur(5px);
                animation: overlayIn 0.2s ease-out;
            }
            .dash-modal {
                width: 800px; max-width: 95vw; max-height: 90vh; overflow-y: auto;
                background: var(--bg); border: 1px solid var(--border);
                border-top: 1px solid var(--highlight, rgba(255,255,255,0.08));
                border-radius: 24px; box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2);
                display: flex; flex-direction: column;
                animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .dash-header {
                padding: 24px 32px; border-bottom: 1px solid var(--border);
                display: flex; justify-content: space-between; align-items: center;
            }
            .dash-title { font-size: 24px; font-weight: 300; color: var(--text-main); display: flex; align-items: center; gap: 12px; }
            .dash-close { font-size: 28px; color: var(--text-sub); cursor: pointer; transition: 0.2s; }
            .dash-close:hover { color: var(--accent); transform: scale(1.1); }

            .dash-content { padding: 32px; display: flex; flex-direction: column; gap: 32px; }

            /* Metric Cards */
            .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; }
            .metric-card {
                background: var(--input-bg, rgba(255,255,255,0.03)); border: 1px solid var(--border);
                border-top: 1px solid var(--highlight, rgba(255,255,255,0.08));
                border-radius: 16px; padding: 20px; text-align: center;
                transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s;
            }
            .metric-card:hover { transform: translateY(-3px); background: var(--row-hover, rgba(255,255,255,0.06)); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
            .metric-val { font-size: 32px; color: var(--text-main); font-weight: 300; margin-bottom: 4px; }
            .metric-label { font-size: 12px; color: var(--text-sub); text-transform: uppercase; letter-spacing: 1px; }

            /* Heatmap */
            .heatmap-container {
                background: var(--input-bg, rgba(255,255,255,0.03)); border: 1px solid var(--border);
                border-radius: 16px; padding: 24px; overflow-x: auto;
            }
            .heatmap-title { font-size: 14px; color: var(--text-main); margin-bottom: 16px; display: flex; justify-content: space-between; }
            .heatmap-grid { display: flex; gap: 4px; }
            .heatmap-col { display: flex; flex-direction: column; gap: 4px; }
            .heatmap-cell {
                width: 12px; height: 12px; border-radius: 3px;
                background: var(--btn-bg, rgba(255,255,255,0.1)); position: relative;
                transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .heatmap-cell:hover { transform: scale(1.4); z-index: 10; outline: 1.5px solid var(--accent); outline-offset: 0.5px; }
            .heatmap-legend { display: flex; gap: 4px; align-items: center; font-size: 10px; color: var(--text-sub); }
            .legend-item { width: 10px; height: 10px; border-radius: 2px; }

            .heatmap-wrapper { display: flex; gap: 8px; }
            .heatmap-week-labels { display: flex; flex-direction: column; gap: 4px; padding-top: 18px; }
            .week-label { height: 12px; font-size: 9px; line-height: 12px; color: var(--text-sub); opacity: 0.7; }

            .heatmap-main { display: flex; flex-direction: column; }
            .heatmap-months { display: flex; gap: 4px; margin-bottom: 6px; height: 12px; }
            .month-label { width: 12px; font-size: 9px; color: var(--text-sub); overflow: visible; white-space: nowrap; }

            /* Custom Tooltip */
            .g-tooltip {
                position: fixed; background: rgba(0,0,0,0.9); border: 1px solid var(--border);
                color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 10px;
                pointer-events: none; z-index: 2147483647; opacity: 0; transition: opacity 0.1s;
                transform: translate(-50%, -100%); margin-top: -8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            }
            .g-tooltip.visible { opacity: 1; }

            /* Level Colors */
            .l-0 { background: var(--btn-bg, rgba(255,255,255,0.05)); }
            .l-1 { background: rgba(138, 180, 248, 0.2); }
            .l-2 { background: rgba(138, 180, 248, 0.4); }
            .l-3 { background: rgba(138, 180, 248, 0.7); }
            .l-4 { background: rgba(138, 180, 248, 1.0); }

            /* Details Pane Tab Bar */
            .details-tab-bar {
                display: flex; gap: 2px; padding: 0 0 8px 0;
                border-bottom: 1px solid var(--divider, rgba(255,255,255,0.05));
                margin-bottom: 8px;
            }
            .details-tab {
                flex: 1; padding: 5px 0; text-align: center;
                font-size: 12px; cursor: pointer; border-radius: 6px;
                color: var(--text-sub); transition: all 0.2s;
                background: transparent;
            }
            .details-tab:hover { background: var(--row-hover); color: var(--text-main); }
            .details-tab.active {
                background: var(--accent); color: #000; font-weight: 600;
            }

            /* Module Toggle Compact */
            .module-toggle-compact {
                display: flex; justify-content: space-between; align-items: center;
                padding: 6px 0; border-bottom: 1px solid var(--divider, rgba(255,255,255,0.05));
            }
            .module-compact-label {
                display: flex; align-items: center; gap: 6px;
                font-size: 11px; color: var(--text-main);
            }
            .module-compact-label .module-icon { font-size: 14px; }

            /* Onboarding Modal */
            .onboarding-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: var(--overlay-tint, rgba(0,0,0,0.7)); z-index: 2147483647;
                display: flex; align-items: center; justify-content: center;
                animation: overlayIn 0.2s ease-out;
            }
            .onboarding-modal {
                width: 400px; max-width: 92vw; max-height: 80vh; overflow-y: auto;
                background: var(--bg, #202124); border: 1px solid var(--border, rgba(255,255,255,0.1));
                border-top: 1px solid var(--highlight, rgba(255,255,255,0.08));
                border-radius: 20px; box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2);
                font-family: 'Google Sans', Roboto, sans-serif;
                animation: modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .onboarding-header {
                padding: 16px 20px; border-bottom: 1px solid var(--divider, rgba(255,255,255,0.08));
                display: flex; justify-content: space-between; align-items: center;
            }
            .onboarding-header h3 { margin: 0; font-size: 16px; color: var(--text-main, #fff); font-weight: 500; }
            .onboarding-close { cursor: pointer; font-size: 18px; color: var(--text-sub, #9aa0a6); }
            .onboarding-close:hover { color: var(--accent, #8ab4f8); }
            .onboarding-body { padding: 16px 20px; }
            .onboarding-section { margin-bottom: 16px; }
            .onboarding-section-title {
                font-size: 13px; font-weight: 600; color: var(--accent, #8ab4f8);
                margin-bottom: 6px;
            }
            .onboarding-text {
                font-size: 12px; color: var(--text-sub, #9aa0a6); line-height: 1.6;
                white-space: pre-line;
            }
            .onboarding-footer {
                padding: 12px 20px; border-top: 1px solid var(--divider, rgba(255,255,255,0.08));
                display: flex; justify-content: space-between; align-items: center;
            }
            .onboarding-lang-btn {
                background: var(--btn-bg, rgba(255,255,255,0.06)); border: 1px solid var(--border);
                color: var(--text-sub); border-radius: 8px; padding: 4px 10px;
                font-size: 11px; cursor: pointer;
            }
            .onboarding-lang-btn:hover { color: var(--text-main); }
            .onboarding-start-btn {
                background: var(--accent, #8ab4f8); color: #000; border: none;
                border-radius: 8px; padding: 6px 16px; font-size: 12px;
                font-weight: 600; cursor: pointer;
            }
            .onboarding-start-btn:hover { opacity: 0.9; }
            .onboarding-info-btn {
                font-size: 11px; color: var(--text-sub, #9aa0a6); cursor: pointer;
                opacity: 0.5; margin-left: 4px;
            }
            .onboarding-info-btn:hover { opacity: 1; color: var(--accent, #8ab4f8); }

            /* Native UI shared styles */
            .gc-native-btn {
                background: transparent; border: none; cursor: pointer;
                font-size: 16px; padding: 4px 6px; border-radius: 50%;
                transition: background 0.2s;
                line-height: 1;
            }
            .gc-native-btn:hover { background: rgba(128,128,128,0.2); }
            .gc-dropdown-menu {
                position: absolute; z-index: 2147483646;
                background: var(--bg, #303134); border: 1px solid rgba(255,255,255,0.12);
                border-top: 1px solid var(--highlight, rgba(255,255,255,0.08));
                border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 12px 32px rgba(0,0,0,0.2);
                padding: 4px 0; min-width: 160px;
                font-family: 'Google Sans', Roboto, sans-serif;
                animation: modalIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .gc-dropdown-item {
                padding: 8px 16px; font-size: 13px; color: #e8eaed;
                cursor: pointer; display: flex; align-items: center; gap: 8px;
            }
            .gc-dropdown-item:hover { background: rgba(255,255,255,0.08); }
        `);
    },

    // --- 面板创建 ---
    create() {
        try {
            const container = document.createElement('div');
            container.id = PANEL_ID;
            container.className = 'notranslate';
            container.setAttribute('translate', 'no');
            let pos = DEFAULT_POS;
            try { pos = GM_getValue(GLOBAL_KEYS.POS, DEFAULT_POS); } catch (e) { /* silent */ }
            this.applyPos(container, pos);
            Core.applyTheme(container, getCurrentTheme());

            // Header
            const header = document.createElement('div');
            header.className = 'gemini-header';
            const userCapsule = document.createElement('div');
            userCapsule.id = 'g-user-capsule';
            userCapsule.className = 'user-capsule';
            const toggle = document.createElement('span');
            toggle.className = 'gemini-toggle-btn';
            toggle.appendChild(createIcon('menu', 14));
            toggle.onpointerdown = (e) => e.stopPropagation();
            toggle.onclick = () => this.toggleDetails();
            header.appendChild(userCapsule);
            header.appendChild(toggle);

            // Main View
            const mainView = document.createElement('div');
            mainView.className = 'gemini-main-view';

            const bigDisplay = document.createElement('div');
            bigDisplay.id = 'g-big-display';
            bigDisplay.className = 'gemini-big-num';
            bigDisplay.textContent = '0';

            const modelRow = document.createElement('div');
            modelRow.id = 'g-model-row';
            modelRow.className = 'gemini-model-row';

            const modelBadge = document.createElement('span');
            modelBadge.id = 'g-model-badge';
            modelBadge.className = 'model-badge';

            modelRow.appendChild(modelBadge);

            const subInfo = document.createElement('div');
            subInfo.id = 'g-sub-info';
            subInfo.className = 'gemini-sub-info';
            subInfo.textContent = 'Today';

            const quotaWrap = document.createElement('div');
            quotaWrap.id = 'g-quota-wrap';
            quotaWrap.className = 'quota-bar-wrap';
            const quotaFill = document.createElement('div');
            quotaFill.id = 'g-quota-fill';
            quotaFill.className = 'quota-bar-fill';
            quotaWrap.appendChild(quotaFill);

            const quotaLabel = document.createElement('div');
            quotaLabel.id = 'g-quota-label';
            quotaLabel.className = 'quota-label';

            const actionBtn = document.createElement('button');
            actionBtn.id = 'g-action-btn';
            actionBtn.className = 'g-btn';
            actionBtn.textContent = 'Reset Today';
            actionBtn.onclick = () => CounterModule.handleReset();
            actionBtn.onpointerdown = (e) => e.stopPropagation();

            mainView.appendChild(bigDisplay);
            mainView.appendChild(modelRow);
            mainView.appendChild(subInfo);
            mainView.appendChild(quotaWrap);
            mainView.appendChild(quotaLabel);
            mainView.appendChild(actionBtn);

            // Details Pane
            const details = document.createElement('div');
            details.id = 'g-details-pane';
            details.className = 'gemini-details-view';

            container.appendChild(header);
            container.appendChild(mainView);
            container.appendChild(details);
            document.body.appendChild(container);

            this.makeDraggable(container, header);
            this.renderDetailsPane();
            this.update();

        } catch (e) {
            console.error("Panel init error", e);
        }
    },

    // --- 详情面板渲染 ---
    renderDetailsPane() {
        const pane = document.getElementById('g-details-pane');
        if (!pane) return;
        pane.replaceChildren();

        // Collect available tabs (stats is always present)
        const tabs = [{ id: 'stats', iconName: 'chart' }];
        Object.keys(ModuleRegistry.modules).forEach(id => {
            const mod = ModuleRegistry.modules[id];
            if (mod && ModuleRegistry.isEnabled(id) && typeof mod.renderToDetailsPane === 'function') {
                tabs.push({ id, iconName: MODULE_ICON_MAP[id] || null, icon: mod.icon });
            }
        });

        // Fallback to stats if active tab was disabled
        if (!tabs.find(t => t.id === this._activeTab)) this._activeTab = 'stats';

        // Only render tab bar when >1 tab
        if (tabs.length > 1) {
            const tabBar = document.createElement('div');
            tabBar.className = 'details-tab-bar';
            tabs.forEach(t => {
                const tab = document.createElement('div');
                tab.className = `details-tab ${t.id === this._activeTab ? 'active' : ''}`;
                if (t.iconName) {
                    tab.appendChild(createIcon(t.iconName, 14));
                } else {
                    tab.textContent = t.icon;
                }
                tab.title = t.id;
                tab.onclick = (e) => {
                    e.stopPropagation();
                    this._activeTab = t.id;
                    this.renderDetailsPane();
                };
                tabBar.appendChild(tab);
            });
            pane.appendChild(tabBar);
        }

        // Render content for active tab
        if (this._activeTab === 'stats') {
            this._renderStatsTab(pane);
        } else {
            const mod = ModuleRegistry.modules[this._activeTab];
            if (mod && typeof mod.renderToDetailsPane === 'function') {
                mod.renderToDetailsPane(pane);
            }
        }
    },

    // --- Stats tab content (original Statistics + Profiles + Themes + Actions) ---
    _renderStatsTab(pane) {
        const cm = CounterModule;
        const user = Core.getCurrentUser();
        const inspecting = Core.getInspectingUser();

        // Statistics
        pane.appendChild(this.createSectionTitle('Statistics'));
        const cid = Core.getChatId();
        pane.appendChild(this.createRow('Today', 'today', cm.getTodayMessages()));
        pane.appendChild(this.createRow('Current Chat', 'chat', cid ? (cm.state.chats[cid] || 0) : 0));
        pane.appendChild(this.createRow('Chats Created', 'chatsCreated', cm.state.totalChatsCreated));
        pane.appendChild(this.createRow('Lifetime', 'total', cm.state.total));

        // Model Breakdown (today)
        const byModel = cm.getTodayByModel();
        const hasModelData = byModel.flash || byModel.thinking || byModel.pro;
        if (hasModelData) {
            const modelRow = document.createElement('div');
            modelRow.className = 'detail-row model-breakdown';
            modelRow.style.cssText = 'display: flex; gap: 10px; font-size: 10px; padding: 4px 8px; color: var(--text-sub);';
            const models = [
                { key: 'flash', label: 'Flash', color: QUOTA_COLORS.safe },
                { key: 'thinking', label: 'Think', color: QUOTA_COLORS.warn },
                { key: 'pro', label: 'Pro', color: QUOTA_COLORS.danger }
            ];
            models.forEach(m => {
                const span = document.createElement('span');
                span.style.cssText = 'display: flex; align-items: center; gap: 3px;';
                const dot = document.createElement('span');
                dot.style.cssText = `width: 6px; height: 6px; border-radius: 50%; background: ${m.color}; display: inline-block;`;
                const num = document.createElement('span');
                num.textContent = byModel[m.key] || 0;
                span.appendChild(dot);
                span.appendChild(num);
                modelRow.appendChild(span);
            });
            pane.appendChild(modelRow);
        }

        // Profiles
        pane.appendChild(this.createSectionTitle('Profiles'));
        const users = Core.getAllUsers();
        const sortedUsers = users.sort((a, b) => (a === user ? -1 : b === user ? 1 : a.localeCompare(b)));

        if (sortedUsers.length === 0 && user === TEMP_USER) {
            const row = document.createElement('div');
            row.className = 'detail-row';
            row.textContent = 'Waiting for login...';
            pane.appendChild(row);
        } else {
            sortedUsers.forEach(uid => {
                const row = document.createElement('div');
                row.className = `detail-row user-row ${uid === user ? 'is-me' : ''} ${uid === inspecting ? 'active-mode' : ''}`;
                row.onclick = (e) => {
                    e.stopPropagation();
                    Core.setInspectingUser(uid);
                    cm.loadDataForUser(uid);
                    cm.state.viewMode = 'total';
                    this.renderDetailsPane();
                };
                const nameSpan = document.createElement('span');
                nameSpan.textContent = uid.split('@')[0];
                row.appendChild(nameSpan);
                if (uid === user) {
                    const meBadge = document.createElement('span');
                    meBadge.className = 'user-indicator';
                    meBadge.textContent = 'ME';
                    row.appendChild(meBadge);
                }
                pane.appendChild(row);
            });
        }

        // Themes
        pane.appendChild(this.createSectionTitle('Themes'));
        const themes = Core.getThemes();
        Object.keys(themes).forEach(key => {
            const row = document.createElement('div');
            row.className = `detail-row ${getCurrentTheme() === key ? 'active-mode' : ''}`;
            row.textContent = themes[key].name;
            row.onclick = (e) => {
                e.stopPropagation();
                Core.setTheme(key);
                setCurrentTheme(key);
                const panel = document.getElementById(PANEL_ID);
                Core.applyTheme(panel, key);
                this.renderDetailsPane();
            };
            pane.appendChild(row);
        });

        // Actions
        pane.appendChild(this.createSectionTitle(''));
        const actionsRow = document.createElement('div');
        actionsRow.style.display = 'flex';
        actionsRow.style.gap = '8px';

        const statsBtn = document.createElement('button');
        statsBtn.className = 'g-btn';
        statsBtn.textContent = '';
        setIconText(statsBtn, 'chart', 'Stats');
        statsBtn.style.flex = '1';
        statsBtn.onclick = (e) => { e.stopPropagation(); this.openDashboard(); };

        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'g-btn';
        settingsBtn.appendChild(createIcon('settings', 14));
        settingsBtn.style.width = '32px';
        settingsBtn.title = "Settings";
        settingsBtn.onclick = (e) => { e.stopPropagation(); this.openSettingsModal(); };

        actionsRow.appendChild(statsBtn);
        actionsRow.appendChild(settingsBtn);
        pane.appendChild(actionsRow);
    },

    createSectionTitle(text) {
        const div = document.createElement('div');
        div.className = 'section-title';
        div.textContent = text;
        return div;
    },

    createRow(label, mode, val) {
        const cm = CounterModule;
        const user = Core.getCurrentUser();
        const inspecting = Core.getInspectingUser();

        const row = document.createElement('div');
        row.className = `detail-row ${cm.state.viewMode === mode && inspecting === user ? 'active-mode' : ''}`;
        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;
        const valSpan = document.createElement('span');
        valSpan.className = 'detail-val';
        valSpan.textContent = val;
        row.appendChild(labelSpan);
        row.appendChild(valSpan);
        row.onclick = (e) => {
            e.stopPropagation();
            if (inspecting !== user) {
                Core.setInspectingUser(user);
                cm.loadDataForUser(user);
            }
            cm.state.viewMode = mode;
            cm.state.resetStep = 0;
            this.update();
            this.renderDetailsPane();
        };
        return row;
    },

    // --- UI 更新 ---
    update() {
        const cm = CounterModule;
        const user = Core.getCurrentUser();
        const inspecting = Core.getInspectingUser();

        const bigDisplay = document.getElementById('g-big-display');
        const subInfo = document.getElementById('g-sub-info');
        const actionBtn = document.getElementById('g-action-btn');
        const capsule = document.getElementById('g-user-capsule');
        const modelBadge = document.getElementById('g-model-badge');
        const quotaFill = document.getElementById('g-quota-fill');
        const quotaLabel = document.getElementById('g-quota-label');
        if (!bigDisplay) return;

        // Capsule
        const isMe = inspecting === user;
        const displayName = inspecting === TEMP_USER ? 'Guest' : inspecting.split('@')[0];

        capsule.replaceChildren();
        const dot = document.createElement('div');
        dot.className = 'user-avatar-dot';
        const name = document.createElement('span');
        name.textContent = displayName;
        name.style.overflow = 'hidden';
        name.style.textOverflow = 'ellipsis';
        name.style.whiteSpace = 'nowrap';
        capsule.appendChild(dot);
        capsule.appendChild(name);

        // Account badge inline (next to username)
        if (cm.accountType && cm.accountType !== 'free') {
            const acctBadgeInline = document.createElement('span');
            acctBadgeInline.className = 'acct-badge-inline';
            acctBadgeInline.dataset.tier = cm.accountType;
            const acctLabels = { free: 'Free', pro: 'Pro', ultra: 'Ultra' };
            acctBadgeInline.textContent = acctLabels[cm.accountType] || 'Free';
            acctBadgeInline.title = 'Account Tier';
            capsule.appendChild(acctBadgeInline);
        }

        if (!isMe) {
            capsule.classList.add('viewing-other');
            capsule.title = "Viewing other user (Read Only)";
        } else {
            capsule.classList.remove('viewing-other');
            capsule.title = "Active User";
        }

        // Model & Account badges
        if (modelBadge) {
            const mc = cm.MODEL_CONFIG[cm.currentModel];
            if (!mc) return;
            modelBadge.textContent = mc.label;
            modelBadge.style.background = mc.color;
            modelBadge.style.color = cm.currentModel === 'flash' ? '#000' : '#fff';
        }

        let val = 0, sub = "", btn = "Reset";
        let disableBtn = !isMe;

        if (cm.state.viewMode === 'today') {
            val = cm.getTodayMessages();
            sub = `Today (Reset @${cm.resetHour}:00)`;
            btn = "Reset Today";
            if (!isMe) { sub = `Today (${inspecting.split('@')[0]})`; }
        } else if (cm.state.viewMode === 'chat') {
            if (!isMe) {
                val = "--"; sub = "Different Context"; disableBtn = true;
            } else {
                const cid = Core.getChatId();
                val = cid ? (cm.state.chats[cid] || 0) : 0;
                sub = cid ? `ID: ${cid.slice(0, 8)}...` : 'ID: New Chat';
                btn = "Reset Chat";
            }
        } else if (cm.state.viewMode === 'chatsCreated') {
            val = cm.state.totalChatsCreated;
            sub = "Chats Created";
            btn = "View Only";
            disableBtn = true;
        } else if (cm.state.viewMode === 'total') {
            val = cm.state.total;
            sub = "Lifetime History";
            btn = "Clear History";
        }

        // Bump animation
        const numericVal = typeof val === 'number' ? val : -1;
        if (numericVal !== cm.lastDisplayedVal && cm.lastDisplayedVal !== -1 && numericVal > cm.lastDisplayedVal) {
            bigDisplay.classList.remove('bump');
            void bigDisplay.offsetWidth;
            bigDisplay.classList.add('bump');
        }
        cm.lastDisplayedVal = numericVal;

        bigDisplay.textContent = val;
        subInfo.textContent = sub;

        // Quota bar
        if (quotaFill && quotaLabel) {
            const used = cm.getTodayMessages();
            const weighted = cm.getWeightedQuota();
            const pct = Math.min((weighted / cm.quotaLimit) * 100, 100);
            quotaFill.style.width = pct + '%';
            if (pct < 60) quotaFill.style.background = QUOTA_COLORS.safe;
            else if (pct < 85) quotaFill.style.background = QUOTA_COLORS.warn;
            else quotaFill.style.background = QUOTA_COLORS.danger;
            const weightedStr = weighted % 1 === 0 ? String(weighted) : weighted.toFixed(1);
            quotaLabel.textContent = `${used} msgs (${weightedStr} weighted) / ${cm.quotaLimit}`;
        }

        // Action button
        if (disableBtn) {
            actionBtn.textContent = "View Only";
            actionBtn.className = 'g-btn disabled';
            actionBtn.disabled = true;
        } else {
            actionBtn.disabled = false;
            if (cm.state.resetStep === 0) {
                actionBtn.textContent = btn;
                actionBtn.className = 'g-btn';
            } else {
                actionBtn.textContent = cm.state.resetStep === 1 ? "Sure?" : "Really?";
                actionBtn.className = `g-btn danger-${cm.state.resetStep}`;
            }
        }
    },

    toggleDetails() {
        const cm = CounterModule;
        cm.state.isExpanded = !cm.state.isExpanded;
        const pane = document.getElementById('g-details-pane');
        if (pane) {
            if (cm.state.isExpanded) {
                pane.classList.add('expanded');
                this.renderDetailsPane();
            } else {
                pane.classList.remove('expanded');
                cm.state.resetStep = 0;
            }
            this.update();
        }
    },

    // --- 位置管理 ---
    applyPos(el, pos) {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const savedLeft = parseFloat(pos.left) || 0;
        const savedTop = parseFloat(pos.top) || 0;

        if (pos.left !== 'auto' && pos.top !== 'auto' &&
            (savedLeft > winW - 50 || savedTop > winH - 50)) {
            console.warn(`\uD83D\uDC8E Panel off-screen detected. Resetting.`);
            pos = DEFAULT_POS;
            try { GM_setValue(GLOBAL_KEYS.POS, DEFAULT_POS); } catch {};
        }
        el.style.top = pos.top;
        el.style.left = pos.left;
        el.style.bottom = pos.bottom;
        el.style.right = pos.right;
    },

    makeDraggable(el, handle) {
        // Clean up previous drag listeners if any
        if (this._dragMove) document.removeEventListener('pointermove', this._dragMove);
        if (this._dragUp) document.removeEventListener('pointerup', this._dragUp);

        // Prevent default touch gestures on the drag handle
        handle.style.touchAction = 'none';

        let isDragging = false, startX, startY, iLeft, iTop;
        handle.onpointerdown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = el.getBoundingClientRect();
            iLeft = rect.left;
            iTop = rect.top;
            el.style.bottom = 'auto';
            el.style.right = 'auto';
            el.style.left = iLeft + 'px';
            el.style.top = iTop + 'px';
            handle.style.cursor = 'grabbing';
            handle.setPointerCapture(e.pointerId);
        };
        this._dragMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            let nL = iLeft + e.clientX - startX;
            let nT = iTop + e.clientY - startY;
            if (nT < 10) nT = 10;
            if (nL < 0) nL = 0;
            if (nL + el.offsetWidth > window.innerWidth) nL = window.innerWidth - el.offsetWidth;
            if (nT + el.offsetHeight > window.innerHeight) nT = window.innerHeight - el.offsetHeight;
            el.style.left = nL + 'px';
            el.style.top = nT + 'px';
        };
        this._dragUp = () => {
            if (!isDragging) return;
            isDragging = false;
            handle.style.cursor = 'grab';
            try { GM_setValue(GLOBAL_KEYS.POS, { top: el.style.top, left: el.style.left, bottom: 'auto', right: 'auto' }); } catch {}
        };
        document.addEventListener('pointermove', this._dragMove);
        document.addEventListener('pointerup', this._dragUp);
    },

    destroy() {
        if (this._dragMove) document.removeEventListener('pointermove', this._dragMove);
        if (this._dragUp) document.removeEventListener('pointerup', this._dragUp);
        this._dragMove = null;
        this._dragUp = null;
    },

    // --- Settings Modal ---
    openSettingsModal() {
        const SETTINGS_MODAL_ID = 'gemini-settings-modal';
        if (document.getElementById(SETTINGS_MODAL_ID)) return;

        const overlay = document.createElement('div');
        overlay.id = SETTINGS_MODAL_ID;
        overlay.className = 'settings-overlay';
        const escHandler = (e) => { if (e.key === 'Escape') closeOverlay(); };
        document.addEventListener('keydown', escHandler);
        const closeOverlay = () => { document.removeEventListener('keydown', escHandler); overlay.remove(); };
        overlay.onclick = (e) => { if (e.target === overlay) closeOverlay(); };

        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        Core.applyTheme(modal, getCurrentTheme());

        // Header
        const header = document.createElement('div');
        header.className = 'settings-header';
        const title = document.createElement('h3');
        setIconText(title, 'settings', 'Settings');
        const closeBtn = document.createElement('span');
        closeBtn.className = 'settings-close';
        closeBtn.appendChild(createIcon('x', 16));
        closeBtn.onclick = () => closeOverlay();
        header.appendChild(title);
        header.appendChild(closeBtn);

        // Body
        const body = document.createElement('div');
        body.className = 'settings-body';

        // === Feature Extensions Section (新增) ===
        const extSection = document.createElement('div');
        extSection.className = 'settings-section';
        const extTitle = document.createElement('div');
        extTitle.className = 'settings-section-title';
        extTitle.textContent = '';
        setIconText(extTitle, 'package', 'Feature Extensions');
        extSection.appendChild(extTitle);

        ModuleRegistry.getAll().forEach(mod => {
            const row = document.createElement('div');
            row.className = 'module-toggle-compact';
            row.title = mod.description;

            const label = document.createElement('div');
            label.className = 'module-compact-label';
            const icon = document.createElement('span');
            icon.className = 'module-icon';
            icon.appendChild(renderModIcon(mod, 16));
            const name = document.createElement('span');
            name.textContent = mod.name;
            label.appendChild(icon);
            label.appendChild(name);

            const rightSide = document.createElement('div');
            rightSide.style.cssText = 'display:flex;align-items:center;gap:6px;';

            // ⓘ info button for onboarding
            if (typeof mod.getOnboarding === 'function') {
                const infoBtn = document.createElement('span');
                infoBtn.className = 'onboarding-info-btn';
                infoBtn.appendChild(createIcon('info', 12));
                infoBtn.title = 'Show guide';
                infoBtn.onclick = (e) => {
                    e.stopPropagation();
                    PanelUI.showOnboarding(mod.id);
                };
                rightSide.appendChild(infoBtn);
            }

            const toggle = document.createElement('div');
            toggle.className = `toggle-switch ${ModuleRegistry.isEnabled(mod.id) ? 'on' : ''}`;
            toggle.onclick = () => {
                ModuleRegistry.toggle(mod.id);
                toggle.classList.toggle('on');
                // 刷新详情面板以显示/隐藏模块区域
                if (CounterModule.state.isExpanded) {
                    PanelUI.renderDetailsPane();
                }
            };
            rightSide.appendChild(toggle);

            row.appendChild(label);
            row.appendChild(rightSide);
            extSection.appendChild(row);
        });
        body.appendChild(extSection);

        // === Module-specific Settings (已启用模块的配置) ===
        ModuleRegistry.getAll().forEach(mod => {
            if (ModuleRegistry.isEnabled(mod.id) && typeof mod.renderToSettings === 'function') {
                const modSection = document.createElement('div');
                modSection.className = 'settings-section';
                const modTitle = document.createElement('div');
                modTitle.className = 'settings-section-title';
                modTitle.textContent = '';
                modTitle.appendChild(renderModIcon(mod, 12));
                modTitle.appendChild(document.createTextNode(' ' + mod.name + ' Settings'));
                modSection.appendChild(modTitle);
                mod.renderToSettings(modSection);
                body.appendChild(modSection);
            }
        });

        // === Counter Settings Section ===
        const cm = CounterModule;

        const resetSection = document.createElement('div');
        resetSection.className = 'settings-section';
        const resetTitle = document.createElement('div');
        resetTitle.className = 'settings-section-title';
        resetTitle.textContent = 'Daily Reset';
        resetSection.appendChild(resetTitle);

        const resetRow = document.createElement('div');
        resetRow.className = 'settings-row';
        const resetLabel = document.createElement('span');
        resetLabel.className = 'settings-label';
        resetLabel.textContent = 'Reset Hour';
        const resetSelect = document.createElement('select');
        resetSelect.className = 'settings-select';
        for (let h = 0; h < 24; h++) {
            const opt = document.createElement('option');
            opt.value = h;
            opt.textContent = `${h.toString().padStart(2, '0')}:00`;
            if (h === cm.resetHour) opt.selected = true;
            resetSelect.appendChild(opt);
        }
        resetSelect.onchange = () => {
            cm.resetHour = parseInt(resetSelect.value, 10);
            try { GM_setValue(GLOBAL_KEYS.RESET_HOUR, cm.resetHour); } catch {}
            this.update();
        };
        resetRow.appendChild(resetLabel);
        resetRow.appendChild(resetSelect);
        resetSection.appendChild(resetRow);
        body.appendChild(resetSection);

        // Quota Section
        const quotaSection = document.createElement('div');
        quotaSection.className = 'settings-section';
        const quotaTitle = document.createElement('div');
        quotaTitle.className = 'settings-section-title';
        quotaTitle.textContent = 'Daily Quota';
        quotaSection.appendChild(quotaTitle);

        const quotaRow = document.createElement('div');
        quotaRow.className = 'settings-row';
        const quotaLabelEl = document.createElement('span');
        quotaLabelEl.className = 'settings-label';
        quotaLabelEl.textContent = 'Message Limit';
        const quotaInput = document.createElement('input');
        quotaInput.type = 'number';
        quotaInput.min = '1';
        quotaInput.max = '999';
        quotaInput.value = cm.quotaLimit;
        quotaInput.className = 'settings-select';
        quotaInput.style.width = '60px';
        quotaInput.style.textAlign = 'center';
        quotaInput.onchange = () => {
            const v = parseInt(quotaInput.value, 10);
            if (v > 0 && v <= 999) {
                cm.quotaLimit = v;
                try { GM_setValue(GLOBAL_KEYS.QUOTA, v); } catch {}
                this.update();
            }
        };
        quotaRow.appendChild(quotaLabelEl);
        quotaRow.appendChild(quotaInput);
        quotaSection.appendChild(quotaRow);
        body.appendChild(quotaSection);

        // Usage Chart Section
        const chartSection = document.createElement('div');
        chartSection.className = 'settings-section';
        const chartTitle = document.createElement('div');
        chartTitle.className = 'settings-section-title';
        chartTitle.textContent = 'Usage History (Last 7 Days)';
        chartSection.appendChild(chartTitle);

        const chartContainer = document.createElement('div');
        chartContainer.style.cssText = 'background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px; margin-top: 4px;';

        const data = cm.getLast7DaysData();
        const svgWidth = 268, svgHeight = 80, padding = 20;
        const maxVal = Math.max(...data.map(d => d.messages), 1);

        const points = data.map((d, i) => ({
            x: padding + i * ((svgWidth - 2 * padding) / 6),
            y: svgHeight - padding - (d.messages / maxVal) * (svgHeight - 2 * padding),
            val: d.messages,
            label: d.label
        }));

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight + 20);
        svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight + 20}`);

        const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const areaD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
            + ` L ${points[6].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`;
        areaPath.setAttribute('d', areaD);
        areaPath.setAttribute('fill', 'rgba(138, 180, 248, 0.2)');
        svg.appendChild(areaPath);

        const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        linePath.setAttribute('d', lineD);
        linePath.setAttribute('fill', 'none');
        linePath.setAttribute('stroke', 'var(--accent, #8ab4f8)');
        linePath.setAttribute('stroke-width', '2');
        linePath.setAttribute('stroke-linecap', 'round');
        linePath.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(linePath);

        points.forEach((p) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', p.x);
            circle.setAttribute('cy', p.y);
            circle.setAttribute('r', '3');
            circle.setAttribute('fill', 'var(--accent, #8ab4f8)');
            svg.appendChild(circle);

            if (p.val > 0) {
                const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                valText.setAttribute('x', p.x);
                valText.setAttribute('y', p.y - 6);
                valText.setAttribute('text-anchor', 'middle');
                valText.setAttribute('font-size', '8');
                valText.setAttribute('fill', 'var(--text-sub, #9aa0a6)');
                valText.textContent = p.val;
                svg.appendChild(valText);
            }

            const dateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            dateText.setAttribute('x', p.x);
            dateText.setAttribute('y', svgHeight + 10);
            dateText.setAttribute('text-anchor', 'middle');
            dateText.setAttribute('font-size', '8');
            dateText.setAttribute('fill', 'var(--text-sub, #9aa0a6)');
            dateText.textContent = p.label;
            svg.appendChild(dateText);
        });

        chartContainer.appendChild(svg);
        chartSection.appendChild(chartContainer);
        body.appendChild(chartSection);

        // Data Section
        const dataSection = document.createElement('div');
        dataSection.className = 'settings-section';
        const dataTitle = document.createElement('div');
        dataTitle.className = 'settings-section-title';
        dataTitle.textContent = 'Data';
        dataSection.appendChild(dataTitle);

        // Export buttons (delegated to ExportModule when enabled)
        if (ModuleRegistry.isEnabled('export')) {
            ExportModule.renderExportButtons(dataSection);
        } else {
            const exportBtn = document.createElement('button');
            exportBtn.className = 'settings-btn';
            setIconText(exportBtn, 'download', 'Export Data (JSON)');
            exportBtn.onclick = () => {
                const exportData = {
                    total: cm.state.total,
                    totalChatsCreated: cm.state.totalChatsCreated,
                    chats: cm.state.chats,
                    dailyCounts: cm.state.dailyCounts,
                    exportedAt: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const _d = new Date();
                a.download = `primer-pp-${Core.getCurrentUser().split('@')[0]}-${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}.json`;
                a.click();
                URL.revokeObjectURL(url);
            };
            dataSection.appendChild(exportBtn);
        }

        const calibrateBtn = document.createElement('button');
        calibrateBtn.className = 'settings-btn';
        setIconText(calibrateBtn, 'wrench', 'Calibrate Data');
        calibrateBtn.onclick = () => this.openCalibrationModal();
        dataSection.appendChild(calibrateBtn);

        const resetPosBtn = document.createElement('button');
        resetPosBtn.className = 'settings-btn';
        setIconText(resetPosBtn, 'pin', 'Reset Panel Position');
        resetPosBtn.onclick = () => {
            try { GM_setValue(GLOBAL_KEYS.POS, DEFAULT_POS); } catch {}
            closeOverlay();
            location.reload();
        };
        dataSection.appendChild(resetPosBtn);

        const tourBtn = document.createElement('button');
        tourBtn.className = 'settings-btn';
        setIconText(tourBtn, 'compass', 'Guided Tour');
        tourBtn.onclick = () => { closeOverlay(); GuidedTour.start(); };
        dataSection.appendChild(tourBtn);

        body.appendChild(dataSection);

        // Debug Section
        const debugSection = document.createElement('div');
        debugSection.className = 'settings-section';
        const debugTitle = document.createElement('div');
        debugTitle.className = 'settings-section-title';
        debugTitle.textContent = 'Debug';
        debugSection.appendChild(debugTitle);

        const debugToggleRow = document.createElement('div');
        debugToggleRow.className = 'settings-row';
        const debugLabel = document.createElement('span');
        debugLabel.className = 'settings-label';
        debugLabel.textContent = 'Enable Debug';
        const debugToggle = document.createElement('div');
        debugToggle.className = `toggle-switch ${isDebugEnabled() ? 'on' : ''}`;
        debugToggle.onclick = () => {
            const enabled = !isDebugEnabled();
            setDebugEnabled(enabled);
            debugToggle.classList.toggle('on');
            Logger.info('Debug mode toggled', { enabled });
        };
        debugToggleRow.appendChild(debugLabel);
        debugToggleRow.appendChild(debugToggle);
        debugSection.appendChild(debugToggleRow);

        const logLevelRow = document.createElement('div');
        logLevelRow.className = 'settings-row';
        const logLevelLabel = document.createElement('span');
        logLevelLabel.className = 'settings-label';
        logLevelLabel.textContent = 'Log Level';
        const logSelect = document.createElement('select');
        logSelect.className = 'settings-select';
        ['error', 'warn', 'info', 'debug'].forEach(lvl => {
            const opt = document.createElement('option');
            opt.value = lvl;
            opt.textContent = lvl.toUpperCase();
            if (lvl === Logger.getLevel()) opt.selected = true;
            logSelect.appendChild(opt);
        });
        logSelect.onchange = () => Logger.setLevel(logSelect.value);
        logLevelRow.appendChild(logLevelLabel);
        logLevelRow.appendChild(logSelect);
        debugSection.appendChild(logLevelRow);

        const debugPanelBtn = document.createElement('button');
        debugPanelBtn.className = 'settings-btn';
        setIconText(debugPanelBtn, 'bug', 'Open Debug Panel');
        debugPanelBtn.onclick = () => this.openDebugModal();
        debugSection.appendChild(debugPanelBtn);

        body.appendChild(debugSection);

        // Version
        const version = document.createElement('div');
        version.className = 'settings-version';
        version.textContent = 'Primer++ for Gemini v' + VERSION;
        body.appendChild(version);

        modal.appendChild(header);
        modal.appendChild(body);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    },

    // --- Onboarding Modal ---
    showOnboarding(moduleId) {
        const mod = ModuleRegistry.modules[moduleId];
        if (!mod || typeof mod.getOnboarding !== 'function') return;

        const content = mod.getOnboarding();
        if (!content) return;

        let lang;
        try { lang = GM_getValue(GLOBAL_KEYS.ONBOARDING_LANG, 'zh'); } catch { lang = 'zh'; }
        const MODAL_ID = 'gemini-onboarding-modal';
        const existing = document.getElementById(MODAL_ID);
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = MODAL_ID;
        overlay.className = 'onboarding-overlay';
        const escHandler = (e) => { if (e.key === 'Escape') closeOverlay(); };
        document.addEventListener('keydown', escHandler);
        const closeOverlay = () => { document.removeEventListener('keydown', escHandler); overlay.remove(); };
        overlay.onclick = (e) => { if (e.target === overlay) closeOverlay(); };

        const modal = document.createElement('div');
        modal.className = 'onboarding-modal';
        Core.applyTheme(modal, getCurrentTheme());

        const renderContent = () => {
            modal.replaceChildren();
            const t = content[lang] || content.zh || content.en;

            // Header
            const header = document.createElement('div');
            header.className = 'onboarding-header';
            const title = document.createElement('h3');
            title.textContent = '';
            title.appendChild(renderModIcon(mod, 16));
            title.appendChild(document.createTextNode(' ' + mod.name));
            const closeBtn = document.createElement('span');
            closeBtn.className = 'onboarding-close';
            closeBtn.appendChild(createIcon('x', 16));
            closeBtn.onclick = () => closeOverlay();
            header.appendChild(title);
            header.appendChild(closeBtn);
            modal.appendChild(header);

            // Body
            const body = document.createElement('div');
            body.className = 'onboarding-body';

            // Rant section
            if (t.rant) {
                const sec1 = document.createElement('div');
                sec1.className = 'onboarding-section';
                const h1 = document.createElement('div');
                h1.className = 'onboarding-section-title';
                h1.textContent = '';
                h1.appendChild(createIcon('info', 14));
                h1.appendChild(document.createTextNode(lang === 'zh' ? ' \u4E3A\u4EC0\u4E48\u9700\u8981\u8FD9\u4E2A\uFF1F' : ' Why does this exist?'));
                const p1 = document.createElement('div');
                p1.className = 'onboarding-text';
                p1.textContent = t.rant;
                sec1.appendChild(h1);
                sec1.appendChild(p1);
                body.appendChild(sec1);
            }

            // Features section
            if (t.features) {
                const sec2 = document.createElement('div');
                sec2.className = 'onboarding-section';
                const h2 = document.createElement('div');
                h2.className = 'onboarding-section-title';
                h2.textContent = '';
                h2.appendChild(createIcon('gem', 14));
                h2.appendChild(document.createTextNode(lang === 'zh' ? ' \u5B83\u80FD\u505A\u4EC0\u4E48\uFF1F' : ' What does it do?'));
                const p2 = document.createElement('div');
                p2.className = 'onboarding-text';
                p2.textContent = t.features;
                sec2.appendChild(h2);
                sec2.appendChild(p2);
                body.appendChild(sec2);
            }

            // Guide section
            if (t.guide) {
                const sec3 = document.createElement('div');
                sec3.className = 'onboarding-section';
                const h3el = document.createElement('div');
                h3el.className = 'onboarding-section-title';
                h3el.textContent = '';
                h3el.appendChild(createIcon('wrench', 14));
                h3el.appendChild(document.createTextNode(lang === 'zh' ? ' \u5982\u4F55\u4F7F\u7528\uFF1F' : ' How to use?'));
                const p3 = document.createElement('div');
                p3.className = 'onboarding-text';
                p3.textContent = t.guide;
                sec3.appendChild(h3el);
                sec3.appendChild(p3);
                body.appendChild(sec3);
            }

            modal.appendChild(body);

            // Footer
            const footer = document.createElement('div');
            footer.className = 'onboarding-footer';
            const langBtn = document.createElement('button');
            langBtn.className = 'onboarding-lang-btn';
            langBtn.textContent = '';
            langBtn.appendChild(createIcon('globe', 12));
            langBtn.appendChild(document.createTextNode(lang === 'zh' ? ' EN' : ' \u4E2D'));
            langBtn.onclick = () => {
                lang = lang === 'zh' ? 'en' : 'zh';
                try { GM_setValue(GLOBAL_KEYS.ONBOARDING_LANG, lang); } catch {}
                renderContent();
            };
            const startBtn = document.createElement('button');
            startBtn.className = 'onboarding-start-btn';
            startBtn.textContent = lang === 'zh' ? '\u5F00\u59CB\u4F7F\u7528 \u2192' : 'Get Started \u2192';
            startBtn.onclick = () => closeOverlay();
            footer.appendChild(langBtn);
            footer.appendChild(startBtn);
            modal.appendChild(footer);
        };

        renderContent();
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    },

    // --- Debug Modal ---
    openDebugModal() {
        const DEBUG_MODAL_ID = 'gemini-debug-modal';
        if (document.getElementById(DEBUG_MODAL_ID)) return;

        const overlay = document.createElement('div');
        overlay.id = DEBUG_MODAL_ID;
        overlay.className = 'debug-overlay';
        let unsubscribe = null;
        const escHandler = (e) => { if (e.key === 'Escape') closeModal(); };
        document.addEventListener('keydown', escHandler);
        const closeModal = () => {
            document.removeEventListener('keydown', escHandler);
            if (unsubscribe) unsubscribe();
            overlay.remove();
        };
        overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

        const modal = document.createElement('div');
        modal.className = 'debug-modal';
        Core.applyTheme(modal, getCurrentTheme());

        const header = document.createElement('div');
        header.className = 'debug-header';
        const title = document.createElement('h3');
        setIconText(title, 'bug', 'Debug Panel');
        const closeBtn = document.createElement('span');
        closeBtn.className = 'debug-close';
        closeBtn.appendChild(createIcon('x', 16));
        closeBtn.onclick = () => closeModal();
        header.appendChild(title);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'debug-body';

        const info = document.createElement('div');
        info.className = 'debug-kv';

        const infoLine = (label, value) => {
            const div = document.createElement('div');
            const strong = document.createElement('strong');
            strong.textContent = label + ':';
            div.appendChild(strong);
            div.appendChild(document.createTextNode(' ' + value));
            return div;
        };

        const detected = Core.detectUser();
        const current = Core.getCurrentUser();
        const inspecting = Core.getInspectingUser();
        const effective = detected || current;
        const storageKey = (effective && effective.includes('@')) ? `gemini_store_${effective}` : 'N/A';

        info.appendChild(infoLine('Detected', detected || 'null'));
        info.appendChild(infoLine('Current', current));
        info.appendChild(infoLine('Inspecting', inspecting));
        info.appendChild(infoLine('Storage Key', storageKey));
        info.appendChild(infoLine('Debug Enabled', String(isDebugEnabled())));
        info.appendChild(infoLine('Log Level', Logger.getLevel()));

        const filterRow = document.createElement('div');
        filterRow.className = 'debug-filter-row';
        const filters = ['all', 'error', 'warn', 'info', 'debug'];
        let activeFilter = 'all';
        let searchTerm = '';

        const mkFilterBtn = (label) => {
            const b = document.createElement('button');
            b.className = 'debug-filter-btn';
            b.textContent = label.toUpperCase();
            b.onclick = () => {
                activeFilter = label;
                Array.from(filterRow.children).forEach(el => el.classList.remove('active'));
                b.classList.add('active');
                renderLogs();
            };
            return b;
        };
        filters.forEach((f, i) => {
            const btn = mkFilterBtn(f);
            if (i === 0) btn.classList.add('active');
            filterRow.appendChild(btn);
        });

        const search = document.createElement('input');
        search.className = 'debug-search';
        search.placeholder = 'Search logs...';
        search.oninput = () => {
            searchTerm = search.value.trim().toLowerCase();
            renderLogs();
        };

        const actions = document.createElement('div');
        actions.className = 'debug-actions';

        const mkBtn = (label, onClick) => {
            const b = document.createElement('button');
            b.className = 'settings-btn';
            b.textContent = label;
            b.onclick = onClick;
            return b;
        };

        actions.appendChild(mkBtn('Show Detected User', () => debugShowDetectedUser()));
        actions.appendChild(mkBtn('Dump Storage Keys', () => debugDumpStorageKeys()));
        actions.appendChild(mkBtn('Dump Gemini Storage', () => debugDumpGeminiStores()));
        actions.appendChild(mkBtn('Export Legacy Data', () => debugExportLegacyData()));
        actions.appendChild(mkBtn('Export All Storage', () => debugExportAllStorage()));
        actions.appendChild(mkBtn('Export Logs', () => debugExportLogs()));
        actions.appendChild(mkBtn('Clear Logs', () => Logger.clear()));

        const logList = document.createElement('div');
        logList.className = 'debug-log-list';

        const renderLogs = () => {
            logList.replaceChildren();
            let entries = filterLogs(Logger.getEntries(), { level: activeFilter, term: searchTerm }).slice(-120);
            if (entries.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'debug-log-item';
                empty.textContent = 'No logs yet.';
                logList.appendChild(empty);
                return;
            }
            entries.forEach(e => {
                const item = document.createElement('div');
                item.className = 'debug-log-item';
                const meta = `${e.ts}`;
                const lvl = document.createElement('span');
                lvl.className = `debug-level ${e.level}`;
                lvl.textContent = `[${e.level.toUpperCase()}]`;
                const data = e.data ? ` ${JSON.stringify(e.data)}` : '';
                item.textContent = `${meta} `;
                item.appendChild(lvl);
                item.appendChild(document.createTextNode(` ${e.msg}${data}`));
                logList.appendChild(item);
            });
        };

        renderLogs();
        unsubscribe = Logger.subscribe(renderLogs);

        body.appendChild(info);
        body.appendChild(filterRow);
        body.appendChild(search);
        body.appendChild(actions);
        body.appendChild(logList);

        modal.appendChild(header);
        modal.appendChild(body);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    },

    // --- Calibration Modal ---
    openCalibrationModal() {
        const MODAL_ID = 'gemini-calibrate-modal';
        if (document.getElementById(MODAL_ID)) return;

        const cm = CounterModule;
        const todayKey = Core.getDayKey(cm.resetHour);

        const overlay = document.createElement('div');
        overlay.id = MODAL_ID;
        overlay.className = 'settings-overlay';
        const escHandler = (e) => { if (e.key === 'Escape') closeOverlay(); };
        document.addEventListener('keydown', escHandler);
        const closeOverlay = () => { document.removeEventListener('keydown', escHandler); overlay.remove(); };
        overlay.onclick = (e) => { if (e.target === overlay) closeOverlay(); };

        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        Core.applyTheme(modal, getCurrentTheme());

        // Header
        const header = document.createElement('div');
        header.className = 'settings-header';
        const title = document.createElement('h3');
        title.textContent = 'Calibrate Data';
        const closeBtn = document.createElement('span');
        closeBtn.className = 'settings-close';
        closeBtn.appendChild(createIcon('x', 16));
        closeBtn.onclick = () => closeOverlay();
        header.appendChild(title);
        header.appendChild(closeBtn);

        // Body
        const body = document.createElement('div');
        body.className = 'settings-body';

        const mkField = (label, value) => {
            const row = document.createElement('div');
            row.className = 'settings-row';
            const lbl = document.createElement('span');
            lbl.className = 'settings-label';
            lbl.textContent = label;
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.value = value;
            input.className = 'settings-select';
            input.style.width = '80px';
            input.style.textAlign = 'center';
            row.appendChild(lbl);
            row.appendChild(input);
            return { row, input };
        };

        const section = document.createElement('div');
        section.className = 'settings-section';
        const sTitle = document.createElement('div');
        sTitle.className = 'settings-section-title';
        sTitle.textContent = 'Adjust Values';
        section.appendChild(sTitle);

        const todayField = mkField('Today Messages', cm.state.dailyCounts[todayKey]?.messages || 0);
        const totalField = mkField('Lifetime Total', cm.state.total);
        const chatsField = mkField('Chats Created', cm.state.totalChatsCreated);
        section.appendChild(todayField.row);
        section.appendChild(totalField.row);
        section.appendChild(chatsField.row);
        body.appendChild(section);

        // Current Chat field (only if in a chat)
        let chatField = null;
        const currentCid = Core.getChatId();
        if (currentCid) {
            const chatSection = document.createElement('div');
            chatSection.className = 'settings-section';
            const chatTitle = document.createElement('div');
            chatTitle.className = 'settings-section-title';
            chatTitle.textContent = 'Current Chat';
            chatSection.appendChild(chatTitle);
            chatField = mkField('Chat Messages', cm.state.chats[currentCid] || 0);
            chatSection.appendChild(chatField.row);

            const chatIdHint = document.createElement('div');
            chatIdHint.style.cssText = 'font-size: 9px; color: var(--text-sub); opacity: 0.5; margin-top: 2px;';
            chatIdHint.textContent = 'ID: ' + currentCid.slice(0, 12) + '...';
            chatSection.appendChild(chatIdHint);
            body.appendChild(chatSection);
        }

        // Apply button
        const applyBtn = document.createElement('button');
        applyBtn.className = 'settings-btn';
        applyBtn.textContent = 'Apply Calibration';
        applyBtn.style.marginTop = '12px';
        applyBtn.style.background = 'rgba(138, 180, 248, 0.2)';
        applyBtn.style.color = 'var(--accent, #8ab4f8)';
        applyBtn.style.fontWeight = '500';
        applyBtn.onclick = () => {
            const newToday = parseInt(todayField.input.value, 10) || 0;
            const newTotal = parseInt(totalField.input.value, 10) || 0;
            const newChats = parseInt(chatsField.input.value, 10) || 0;

            cm.ensureTodayEntry();
            cm.state.dailyCounts[todayKey].messages = newToday;
            cm.state.total = newTotal;
            cm.state.totalChatsCreated = newChats;

            if (chatField && currentCid) {
                const newChatVal = parseInt(chatField.input.value, 10) || 0;
                cm.state.chats[currentCid] = newChatVal;
            }

            cm.saveData();
            PanelUI.update();
            if (cm.state.isExpanded) PanelUI.renderDetailsPane();

            Logger.info('Data calibrated', {
                today: newToday, total: newTotal, chats: newChats,
                chatId: currentCid || null
            });
            closeOverlay();
        };
        body.appendChild(applyBtn);

        const note = document.createElement('div');
        note.className = 'settings-version';
        note.textContent = 'Manually adjust counter values';
        body.appendChild(note);

        modal.appendChild(header);
        modal.appendChild(body);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    },

    // --- Dashboard Modal ---
    openDashboard() {
        const exist = document.getElementById('gemini-dashboard-overlay');
        if (exist) return;

        const cm = CounterModule;
        const overlay = document.createElement('div');
        overlay.id = 'gemini-dashboard-overlay';
        overlay.className = 'dash-overlay';
        const closeDash = () => {
            document.removeEventListener('keydown', escHandler);
            const tip = document.getElementById('g-heatmap-tooltip');
            if (tip) tip.remove();
            overlay.remove();
        };
        const escHandler = (e) => { if (e.key === 'Escape') closeDash(); };
        document.addEventListener('keydown', escHandler);
        overlay.onclick = (e) => { if (e.target === overlay) closeDash(); };

        const modal = document.createElement('div');
        modal.className = 'dash-modal';
        Core.applyTheme(modal, getCurrentTheme());

        // Header
        const header = document.createElement('div');
        header.className = 'dash-header';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'dash-title';
        titleDiv.textContent = '';
        titleDiv.appendChild(createIcon('chart', 20));
        titleDiv.appendChild(document.createTextNode(' Analytics '));
        const userSpan = document.createElement('span');
        userSpan.style.fontSize = '12px';
        userSpan.style.opacity = '0.5';
        userSpan.style.marginTop = '8px';
        userSpan.textContent = Core.getCurrentUser().split('@')[0];
        titleDiv.appendChild(userSpan);

        const close = document.createElement('div');
        close.className = 'dash-close';
        close.appendChild(createIcon('x', 22));
        close.onclick = () => closeDash();

        header.appendChild(titleDiv);
        header.appendChild(close);
        modal.appendChild(header);

        // Content
        const content = document.createElement('div');
        content.className = 'dash-content';

        // Metric Cards
        const streaks = cm.calculateStreaks();
        const grid = document.createElement('div');
        grid.className = 'metric-grid';

        const metrics = [
            { label: 'Total Messages', val: cm.state.total.toLocaleString() },
            { label: 'Chats Created', val: cm.state.totalChatsCreated.toLocaleString() },
            { label: 'Current Streak', val: streaks.current + ' Days' },
            { label: 'Best Streak', val: streaks.best + ' Days' },
        ];

        metrics.forEach(m => {
            const card = document.createElement('div');
            card.className = 'metric-card';
            const valDiv = document.createElement('div');
            valDiv.className = 'metric-val';
            valDiv.textContent = m.val;
            const labelDiv = document.createElement('div');
            labelDiv.className = 'metric-label';
            labelDiv.textContent = m.label;
            card.appendChild(valDiv);
            card.appendChild(labelDiv);
            grid.appendChild(card);
        });
        content.appendChild(grid);

        // Heatmap
        const hmContainer = document.createElement('div');
        hmContainer.className = 'heatmap-container';

        const hmHeader = document.createElement('div');
        hmHeader.className = 'heatmap-title';
        const titleSpan = document.createElement('span');
        titleSpan.textContent = 'Activity (Last 365 Days)';

        const legend = document.createElement('div');
        legend.className = 'heatmap-legend';
        legend.appendChild(document.createTextNode('Less '));
        ['l-0', 'l-1', 'l-3', 'l-4'].forEach(cls => {
            const item = document.createElement('div');
            item.className = `legend-item ${cls}`;
            legend.appendChild(item);
        });
        legend.appendChild(document.createTextNode(' More'));

        hmHeader.appendChild(titleSpan);
        hmHeader.appendChild(legend);
        hmContainer.appendChild(hmHeader);

        const hmWrapper = document.createElement('div');
        hmWrapper.className = 'heatmap-wrapper';

        // Week Labels
        const weekCol = document.createElement('div');
        weekCol.className = 'heatmap-week-labels';
        ['', 'Mon', '', 'Wed', '', 'Fri', ''].forEach(d => {
            const label = document.createElement('div');
            label.className = 'week-label';
            label.textContent = d;
            weekCol.appendChild(label);
        });
        hmWrapper.appendChild(weekCol);

        const hmMain = document.createElement('div');
        hmMain.className = 'heatmap-main';

        const monthRow = document.createElement('div');
        monthRow.className = 'heatmap-months';

        const hmGrid = document.createElement('div');
        hmGrid.className = 'heatmap-grid';

        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setDate(today.getDate() - 365);

        let maxVal = 0;
        Object.values(cm.state.dailyCounts).forEach(v => { if (v.messages > maxVal) maxVal = v.messages; });
        if (maxVal < 10) maxVal = 10;

        let tooltip = document.getElementById('g-heatmap-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'g-heatmap-tooltip';
            tooltip.className = 'g-tooltip';
            document.body.appendChild(tooltip);
        }

        let iterDate = new Date(oneYearAgo);
        iterDate.setDate(iterDate.getDate() - iterDate.getDay());
        let lastMonth = -1;

        for (let week = 0; week < 53; week++) {
            const currentMonth = iterDate.getMonth();
            const mLabel = document.createElement('div');
            mLabel.className = 'month-label';

            if (currentMonth !== lastMonth) {
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                mLabel.textContent = monthNames[currentMonth];
                lastMonth = currentMonth;
            }
            monthRow.appendChild(mLabel);

            const col = document.createElement('div');
            col.className = 'heatmap-col';
            for (let day = 0; day < 7; day++) {
                const key = formatLocalDate(iterDate);
                const count = cm.state.dailyCounts[key]?.messages || 0;

                const cell = document.createElement('div');
                cell.className = 'heatmap-cell';

                let level = 'l-0';
                if (count > 0) {
                    const ratio = count / maxVal;
                    if (ratio > 0.75) level = 'l-4';
                    else if (ratio > 0.5) level = 'l-3';
                    else if (ratio > 0.25) level = 'l-2';
                    else level = 'l-1';
                }
                cell.classList.add(level);

                cell.onmouseenter = (e) => {
                    tooltip.textContent = '';
                    const b = document.createElement('div');
                    b.style.fontWeight = 'bold';
                    b.textContent = key;
                    const sp = document.createElement('div');
                    sp.textContent = `${count} messages`;
                    tooltip.appendChild(b);
                    tooltip.appendChild(sp);
                    tooltip.classList.add('visible');
                    const rect = cell.getBoundingClientRect();
                    let left = rect.left + rect.width / 2;
                    let top = rect.top;
                    tooltip.style.left = left + 'px';
                    tooltip.style.top = top + 'px';
                    const ttRect = tooltip.getBoundingClientRect();
                    if (ttRect.right > window.innerWidth) tooltip.style.left = (window.innerWidth - ttRect.width / 2 - 10) + 'px';
                    if (ttRect.left < 0) tooltip.style.left = (ttRect.width / 2 + 10) + 'px';
                    if (ttRect.top < 0) tooltip.style.top = (rect.bottom + 10) + 'px';
                    if (ttRect.bottom > window.innerHeight) tooltip.style.top = (rect.top - ttRect.height - 10) + 'px';
                };
                cell.onmouseleave = () => tooltip.classList.remove('visible');

                col.appendChild(cell);
                iterDate.setDate(iterDate.getDate() + 1);

                if (iterDate > today && day === today.getDay()) break;
            }
            hmGrid.appendChild(col);
            if (iterDate > today) break;
        }

        hmMain.appendChild(monthRow);
        hmMain.appendChild(hmGrid);
        hmWrapper.appendChild(hmMain);

        hmContainer.appendChild(hmWrapper);
        content.appendChild(hmContainer);

        // Model Distribution Chart
        const allByModel = { flash: 0, thinking: 0, pro: 0 };
        Object.values(cm.state.dailyCounts).forEach(entry => {
            if (entry.byModel) {
                allByModel.flash += entry.byModel.flash || 0;
                allByModel.thinking += entry.byModel.thinking || 0;
                allByModel.pro += entry.byModel.pro || 0;
            }
        });
        const modelTotal = allByModel.flash + allByModel.thinking + allByModel.pro;

        if (modelTotal > 0) {
            const modelContainer = document.createElement('div');
            modelContainer.className = 'heatmap-container';

            const modelTitle = document.createElement('div');
            modelTitle.className = 'heatmap-title';
            const modelTitleSpan = document.createElement('span');
            modelTitleSpan.textContent = 'Model Usage Distribution';
            modelTitle.appendChild(modelTitleSpan);
            modelContainer.appendChild(modelTitle);

            const modelColors = { flash: CounterModule.MODEL_CONFIG.flash.color, thinking: CounterModule.MODEL_CONFIG.thinking.color, pro: CounterModule.MODEL_CONFIG.pro.color };
            const models = [
                { key: 'flash', label: '3 Flash', count: allByModel.flash },
                { key: 'thinking', label: '3 Flash Thinking', count: allByModel.thinking },
                { key: 'pro', label: '3 Pro', count: allByModel.pro }
            ];

            models.forEach(m => {
                const pct = (m.count / modelTotal * 100).toFixed(1);
                const barRow = document.createElement('div');
                barRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';

                const labelEl = document.createElement('div');
                labelEl.style.cssText = 'font-size: 11px; color: var(--text-sub); width: 110px; flex-shrink: 0;';
                labelEl.textContent = m.label;

                const barBg = document.createElement('div');
                barBg.style.cssText = 'flex: 1; height: 16px; background: var(--btn-bg, rgba(255,255,255,0.05)); border-radius: 4px; overflow: hidden;';
                const barFill = document.createElement('div');
                barFill.style.cssText = `height: 100%; width: ${pct}%; background: ${modelColors[m.key]}; border-radius: 4px; transition: width 0.4s;`;
                barBg.appendChild(barFill);

                const valEl = document.createElement('div');
                valEl.style.cssText = 'font-size: 11px; color: var(--text-main); width: 70px; text-align: right; flex-shrink: 0; font-family: monospace;';
                valEl.textContent = `${m.count} (${pct}%)`;

                barRow.appendChild(labelEl);
                barRow.appendChild(barBg);
                barRow.appendChild(valEl);
                modelContainer.appendChild(barRow);
            });

            // Weighted summary
            const weightedTotal = Object.keys(allByModel).reduce((sum, k) => sum + (allByModel[k] || 0) * (CounterModule.MODEL_CONFIG[k]?.multiplier ?? 1), 0);
            const wStr = weightedTotal % 1 === 0 ? String(weightedTotal) : weightedTotal.toFixed(1);
            const weightedRow = document.createElement('div');
            weightedRow.style.cssText = 'font-size: 11px; color: var(--text-sub); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--divider, rgba(255,255,255,0.05));';
            weightedRow.textContent = `Total Weighted: ${wStr} | Raw Messages: ${modelTotal}`;
            modelContainer.appendChild(weightedRow);

            content.appendChild(modelContainer);
        }

        modal.appendChild(content);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        setTimeout(() => { hmContainer.scrollLeft = hmContainer.scrollWidth; }, 0);
    }
};

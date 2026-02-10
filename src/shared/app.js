// src/shared/app.js — Platform-agnostic application wiring

import { GLOBAL_KEYS, TIMINGS, PANEL_ID, DEFAULT_POS, TEMP_USER, VERSION } from '../core/constants.js';
import { THEMES, applyTheme } from '../core/theme.js';
import { createCore } from '../core/core-utils.js';
import { createModuleRegistry } from '../core/module-registry.js';
import { createLoggerBridge } from '../core/logger-bridge.js';
import { injectStyles } from '../core/style-injector.js';

import { createCounterModule } from '../modules/counter.js';
import { createExportModule } from '../modules/export.js';
import { createFoldersModule } from '../modules/folders.js';
import { createPromptVaultModule } from '../modules/prompt-vault.js';
import { createDefaultModelModule } from '../modules/default-model.js';
import { createBatchDeleteModule } from '../modules/batch-delete.js';
import { createQuoteReplyModule } from '../modules/quote-reply.js';
import { createUITweaksModule } from '../modules/ui-tweaks.js';

import { createPanelUI } from '../ui/panel.js';
import { createSettingsUI } from '../ui/settings.js';
import { createDashboardUI } from '../ui/dashboard.js';
import { createDetailsPaneUI } from '../ui/details-pane.js';

/**
 * Create and wire the entire application.
 * @param {Object} storage - StorageAdapter instance (GM or Extension backend)
 * @param {Object} opts - Platform-specific options
 * @param {Function} opts.createLogger - from lib/debug_logger
 * @param {Function} opts.filterLogs - from lib/debug_logger
 * @param {string} opts.panelCSS - CSS string for panel styles
 * @param {Function} [opts.gmAddStyle] - GM_addStyle (userscript only)
 */
export function createApp(storage, opts) {
    const { createLogger, filterLogs, panelCSS, gmAddStyle } = opts;

    // --- Core ---
    const Core = createCore({ storage });
    // Attach theme helpers to Core for UI access
    Core.getThemes = () => THEMES;

    // --- Logger ---
    const { logger: Logger, isDebugEnabled, setDebugEnabled } = createLoggerBridge({
        storage, createLogger, filterLogs,
    });

    // --- Module Registry ---
    const registry = createModuleRegistry({ storage, GLOBAL_KEYS });

    // --- Lazy getters (avoid circular refs) ---
    const getCounterModule = () => registry.modules['counter'];
    const getModuleRegistry = () => registry;
    const getExportModule = () => registry.modules['export'];
    const getTheme = () => Core.getTheme();

    // --- Inject styles ---
    const doInjectStyles = (css) => injectStyles(css, gmAddStyle);

    // --- Register modules ---
    _registerModules(registry, { storage, Core, Logger, GLOBAL_KEYS, TIMINGS });

    // --- UI ---
    const panelUI = createPanelUI({
        storage, Core, Logger,
        getCounterModule, getModuleRegistry,
        applyTheme, getTheme, injectStyles: doInjectStyles,
    });

    const settingsUI = createSettingsUI({
        storage, Core, Logger,
        getCounterModule, getModuleRegistry, getExportModule,
        applyTheme, getTheme,
        isDebugEnabled, setDebugEnabled, filterLogs,
        debugHelpers: _createDebugHelpers({ storage, Core, Logger }),
    });

    const dashboardUI = createDashboardUI({
        Core, getCounterModule, applyTheme, getTheme,
    });

    const detailsUI = createDetailsPaneUI({
        Core, getCounterModule, getModuleRegistry, applyTheme, getTheme,
    });

    panelUI.setSubModules({ settingsUI, dashboardUI, detailsUI });

    // --- Main Loop ---
    let lastDetectedUser = null;
    let pollTimer = null;

    function checkUserAndPanel() {
        _handleUserDetection(Core, Logger, registry, getCounterModule, lastDetectedUser, (u) => { lastDetectedUser = u; });

        if (registry.isEnabled('counter')) {
            const cm = getCounterModule();
            const newModel = cm.detectModel();
            const newAcct = cm.detectAccountType();
            const modelChanged = newModel !== cm.currentModel;
            const acctChanged = newAcct !== cm.accountType;
            cm.currentModel = newModel;
            cm.accountType = newAcct;

            if (!document.getElementById(PANEL_ID)) {
                panelUI.create();
            } else if (modelChanged || acctChanged) {
                panelUI.update();
            }
        }

        // Tick native UI injections for enabled modules
        registry.getEnabled().forEach(id => {
            const mod = registry.modules[id];
            if (mod && typeof mod.tick === 'function') {
                try { mod.tick(); } catch (e) { /* silent */ }
            }
        });
    }

    return {
        start() {
            if (panelCSS) doInjectStyles(panelCSS);
            registry.init();

            // Onboarding for newly enabled modules
            _handleOnboarding(storage, registry, panelUI);

            pollTimer = setInterval(checkUserAndPanel, TIMINGS.POLL_INTERVAL);

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    if (!pollTimer) pollTimer = setInterval(checkUserAndPanel, TIMINGS.POLL_INTERVAL);
                    const inspecting = Core.getInspectingUser();
                    if (inspecting && registry.isEnabled('counter')) {
                        getCounterModule().loadDataForUser(inspecting);
                    }
                } else {
                    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
                }
            });
        },
    };
}

// --- Helper: Register all feature modules ---
function _registerModules(registry, deps) {
    const { storage, Core, Logger, GLOBAL_KEYS, TIMINGS } = deps;
    const shared = { storage, Core, Logger, GLOBAL_KEYS, TIMINGS };

    registry.register(createCounterModule(shared));
    registry.register(createExportModule(shared));
    registry.register(createFoldersModule(shared));
    registry.register(createPromptVaultModule(shared));
    registry.register(createDefaultModelModule(shared));
    registry.register(createBatchDeleteModule(shared));
    registry.register(createQuoteReplyModule(shared));
    registry.register(createUITweaksModule(shared));
}

// --- Helper: Debug action helpers for settings UI ---
function _createDebugHelpers({ storage, Core, Logger }) {
    const _downloadJSON = (data, filename) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return {
        showDetectedUser() {
            const detected = Core.detectUser();
            const current = Core.getCurrentUser();
            const effective = detected || current;
            const storageKey = (effective && effective.includes('@')) ? `gemini_store_${effective}` : null;
            console.group('\uD83D\uDC8E Gemini Debug: User');
            console.log('detected:', detected);
            console.log('currentUser:', current);
            console.log('effectiveUser:', effective);
            console.log('storageKey:', storageKey);
            console.groupEnd();
            Logger.info('Debug: show detected user', { detected, current, effective });
        },

        dumpStorageKeys() {
            try {
                const keys = storage.listKeys().slice().sort();
                const geminiKeys = keys.filter(k => k.startsWith('gemini_'));
                console.group('\uD83D\uDC8E Gemini Debug: Storage Keys');
                console.log('All keys:', keys);
                console.log('Gemini keys:', geminiKeys);
                console.groupEnd();
                Logger.info('Debug: dumped storage keys', { count: keys.length });
            } catch (e) {
                Logger.warn('Debug: failed to list storage keys', { error: String(e) });
            }
        },

        dumpGeminiStores() {
            try {
                const keys = storage.listKeys().slice().sort();
                const targets = keys.filter(k => k.startsWith('gemini_store_') || k.startsWith('gemini_'));
                console.group('\uD83D\uDC8E Gemini Debug: Storage Dump');
                targets.forEach(k => {
                    try { console.log(k, storage.get(k)); } catch (err) { console.warn('Failed to read', k, err); }
                });
                console.groupEnd();
            } catch (e) {
                Logger.warn('Debug: failed to dump storage', { error: String(e) });
            }
        },

        exportLegacyData() {
            try {
                const legacyKeys = [
                    'gemini_count_chats_map', 'gemini_count_session', 'gemini_count_total',
                    'gemini_interaction_count', 'gemini_view_mode',
                    'gemini_panel_position', 'gemini_panel_pos_v64', 'gemini_panel_pos',
                ];
                const data = {};
                legacyKeys.forEach(k => {
                    try { data[k] = storage.get(k); } catch (e) { data[k] = { error: String(e) }; }
                });
                _downloadJSON({ exportedAt: new Date().toISOString(), legacyKeys, data }, 'gemini_legacy_export.json');
                Logger.info('Debug: export legacy data');
            } catch (e) {
                Logger.warn('Debug: failed to export legacy data', { error: String(e) });
            }
        },

        exportAllStorage() {
            try {
                const keys = storage.listKeys().slice().sort();
                const data = {};
                keys.forEach(k => {
                    try { data[k] = storage.get(k); } catch (e) { data[k] = { error: String(e) }; }
                });
                _downloadJSON({ exportedAt: new Date().toISOString(), keys, data }, 'gemini_storage_export.json');
                Logger.info('Debug: export all storage');
            } catch (e) {
                Logger.warn('Debug: failed to export storage', { error: String(e) });
            }
        },

        exportLogs() {
            try {
                _downloadJSON(Logger.export(), 'gemini_logs_export.json');
                Logger.info('Debug: export logs');
            } catch (e) {
                Logger.warn('Debug: failed to export logs', { error: String(e) });
            }
        },
    };
}

// --- Helper: User detection + guest data merge ---
function _handleUserDetection(Core, Logger, registry, getCounterModule, lastDetected, setLastDetected) {
    const detected = Core.detectUser();
    if (detected !== lastDetected) {
        Logger.debug('User detection changed', { detected });
        setLastDetected(detected);
    }

    const currentUser = Core.getCurrentUser();
    if (!detected || detected === currentUser) return;

    // Merge guest state if switching from TEMP_USER
    let guestState = null;
    if (currentUser === TEMP_USER && registry.isEnabled('counter')) {
        guestState = JSON.parse(JSON.stringify(getCounterModule().state));
    }

    Core.setCurrentUser(detected);
    Core.registerUser(detected);
    Logger.info('User switched', { currentUser: detected });

    const inspecting = Core.getInspectingUser();
    if (inspecting === TEMP_USER || inspecting === currentUser) {
        Core.setInspectingUser(detected);
    }

    registry.notifyUserChange(Core.getInspectingUser());

    // Merge guest data into real user
    if (guestState && (guestState.total > 0 || Object.keys(guestState.chats).length > 0)) {
        _mergeGuestData(getCounterModule(), guestState, detected);
    }
}

// --- Helper: Merge guest session data into real user ---
function _mergeGuestData(cm, guestState, userName) {
    cm.state.total += guestState.total;
    cm.state.totalChatsCreated += guestState.totalChatsCreated;

    for (const [day, counts] of Object.entries(guestState.dailyCounts)) {
        if (!cm.state.dailyCounts[day]) {
            cm.state.dailyCounts[day] = counts;
        } else {
            cm.state.dailyCounts[day].messages += counts.messages;
            cm.state.dailyCounts[day].chats += counts.chats;
            if (counts.byModel) {
                if (!cm.state.dailyCounts[day].byModel) {
                    cm.state.dailyCounts[day].byModel = { flash: 0, thinking: 0, pro: 0 };
                }
                cm.state.dailyCounts[day].byModel.flash += counts.byModel.flash || 0;
                cm.state.dailyCounts[day].byModel.thinking += counts.byModel.thinking || 0;
                cm.state.dailyCounts[day].byModel.pro += counts.byModel.pro || 0;
            }
        }
    }

    for (const [cid, count] of Object.entries(guestState.chats)) {
        cm.state.chats[cid] = (cm.state.chats[cid] || 0) + count;
    }

    console.log(`\uD83D\uDC8E Merged ${guestState.total} messages from Guest session to ${userName}`);
    cm.saveData();
}

// --- Helper: Show onboarding for newly enabled modules ---
function _handleOnboarding(storage, registry, panelUI) {
    const seen = storage.get(GLOBAL_KEYS.ONBOARDING, {});
    let updated = false;

    registry.getEnabled().forEach(id => {
        const mod = registry.modules[id];
        if (!seen[id] && typeof mod?.getOnboarding === 'function') {
            setTimeout(() => panelUI.showOnboarding(id), 2000);
            seen[id] = true;
            updated = true;
        }
    });

    if (updated) storage.set(GLOBAL_KEYS.ONBOARDING, seen);
}

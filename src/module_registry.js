import { GLOBAL_KEYS } from './constants.js';
import { Logger } from './logger.js';
// NativeUI and PanelUI — circular deps are safe (cross-refs in function bodies only)
import { NativeUI } from './native_ui.js';
import { PanelUI } from './panel_ui.js';

export const ModuleRegistry = {
    modules: {},
    enabledModules: new Set(),

    register(module) {
        this.modules[module.id] = module;
        Logger.debug('Module registered', { id: module.id });
    },

    init() {
        let saved;
        try { saved = GM_getValue(GLOBAL_KEYS.MODULES, null); }
        catch (e) { saved = null; }
        if (saved) {
            this.enabledModules = new Set(saved);
        } else {
            Object.values(this.modules).forEach(m => {
                if (m.defaultEnabled) this.enabledModules.add(m.id);
            });
            this.save();
        }

        this.enabledModules.forEach(id => {
            if (this.modules[id]?.init) {
                try {
                    this.modules[id].init();
                } catch (e) {
                    Logger.error('Module init failed', { id, error: String(e) });
                }
            }
        });
    },

    isEnabled(id) {
        return this.enabledModules.has(id);
    },

    toggle(id) {
        if (this.enabledModules.has(id)) {
            this.enabledModules.delete(id);
            if (this.modules[id]?.destroy) {
                try {
                    this.modules[id].destroy();
                } catch (e) {
                    Logger.error('Module destroy failed', { id, error: String(e) });
                }
            }
        } else {
            this.enabledModules.add(id);
            if (this.modules[id]?.init) {
                try {
                    this.modules[id].init();
                } catch (e) {
                    Logger.error('Module init failed (toggle)', { id, error: String(e) });
                }
            }
            // Inject native UI when enabling
            if (typeof this.modules[id]?.injectNativeUI === 'function') {
                try { this.modules[id].injectNativeUI(); }
                catch (e) { NativeUI.markDirty(id); }
            }
            // Show onboarding on first enable
            let seen;
            try { seen = GM_getValue(GLOBAL_KEYS.ONBOARDING, {}); }
            catch (e) { seen = {}; }
            if (!seen[id] && typeof this.modules[id]?.getOnboarding === 'function') {
                PanelUI.showOnboarding(id);
                seen[id] = true;
                try { GM_setValue(GLOBAL_KEYS.ONBOARDING, seen); } catch (e) { /* silent */ }
            }
        }
        this.save();
        Logger.info('Module toggled', { id, enabled: this.enabledModules.has(id) });
    },

    save() {
        try { GM_setValue(GLOBAL_KEYS.MODULES, Array.from(this.enabledModules)); } catch (e) { /* silent */ }
    },

    notifyUserChange(user) {
        this.enabledModules.forEach(id => {
            if (this.modules[id]?.onUserChange) {
                try {
                    this.modules[id].onUserChange(user);
                } catch (e) {
                    Logger.error('Module onUserChange failed', { id, error: String(e) });
                }
            }
        });
    },

    getAll() {
        return Object.values(this.modules);
    }
};

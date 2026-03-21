import { ModuleRegistry } from './module_registry.js';

export const NativeUI = {
    isZH: navigator.language.startsWith('zh'),
    t(zh, en) { return this.isZH ? zh : en; },

    _findFirst(selectors) {
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    },

    // Dirty tracking: only re-inject modules when DOM structure changes
    _dirtyModules: new Set(),
    _retryCount: {},

    markAllDirty() {
        ModuleRegistry.enabledModules.forEach(id => {
            this._dirtyModules.add(id);
            delete this._retryCount[id];
        });
    },

    markDirty(id) {
        this._dirtyModules.add(id);
        delete this._retryCount[id];
    },

    remove(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    },

    getSidebar() {
        return this._findFirst([
            '.sidenav-with-history-container',
            'bard-sidenav',
            'nav[role="navigation"]'
        ]);
    },

    getInputArea() {
        return this._findFirst([
            'input-area-v2',
            '.input-area-container',
            '.bottom-container'
        ]);
    },

    getChatHeader() {
        return this._findFirst([
            '.conversation-title-container',
            'span.conversation-title',
            'h1.conversation-title',
            '[data-test-id="conversation-title"]'
        ]);
    },

    getModelSwitch() {
        return this._findFirst([
            'button.input-area-switch',
            '[data-test-id="bard-mode-menu-button"]'
        ]);
    },

    // Called from onDOMStructureChange — only processes dirty modules
    tick() {
        if (this._dirtyModules.size === 0) return;

        const toProcess = [...this._dirtyModules];
        for (const id of toProcess) {
            const mod = ModuleRegistry.modules[id];
            if (typeof mod?.injectNativeUI === 'function') {
                try {
                    mod.injectNativeUI();
                    this._dirtyModules.delete(id);
                    delete this._retryCount[id];
                } catch (e) {
                    this._retryCount[id] = (this._retryCount[id] || 0) + 1;
                    if (this._retryCount[id] >= 3) {
                        this._dirtyModules.delete(id);
                        delete this._retryCount[id];
                    }
                }
            } else {
                this._dirtyModules.delete(id);
            }
        }
    }
};

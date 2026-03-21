import { ModuleRegistry } from './module_registry.js';
import { Core } from './core.js';
import { getCurrentTheme } from './state.js';

export const NativeUI = {
    isZH: navigator.language.startsWith('zh'),
    t(zh, en) { return this.isZH ? zh : en; },

    /**
     * Show a brief toast notification at the bottom of the screen.
     * @param {string} message
     * @param {number} [duration=2000] - ms before auto-dismiss
     */
    showToast(message, duration = 2000) {
        const toast = document.createElement('div');
        toast.className = 'gc-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 200);
        }, duration);
    },

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

    /**
     * Show a themed confirmation dialog (replaces native confirm()).
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Called when user confirms
     * @param {Object} [opts] - { confirmText, cancelText, danger }
     */
    showConfirm(message, onConfirm, opts = {}) {
        const overlay = document.createElement('div');
        overlay.className = 'settings-overlay';
        const escHandler = (e) => { if (e.key === 'Escape') close(false); };
        document.addEventListener('keydown', escHandler);
        const close = (confirmed) => {
            document.removeEventListener('keydown', escHandler);
            overlay.remove();
            if (confirmed) onConfirm();
        };
        overlay.onclick = (e) => { if (e.target === overlay) close(false); };

        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.style.width = '280px';
        try { Core.applyTheme(modal, getCurrentTheme()); } catch {}

        const body = document.createElement('div');
        body.style.cssText = 'padding:20px;font-size:13px;color:var(--text-main,#e8eaed);line-height:1.6;';
        body.textContent = message;

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;padding:0 20px 16px;';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'settings-btn';
        cancelBtn.style.cssText = 'width:auto;padding:8px 16px;';
        cancelBtn.textContent = opts.cancelText || this.t('取消', 'Cancel');
        cancelBtn.onclick = () => close(false);

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'settings-btn';
        confirmBtn.style.cssText = `width:auto;padding:8px 16px;background:${opts.danger ? '#ea4335' : 'var(--accent,#8ab4f8)'};color:${opts.danger ? '#fff' : '#000'};font-weight:600;`;
        confirmBtn.textContent = opts.confirmText || this.t('确认', 'Confirm');
        confirmBtn.onclick = () => close(true);

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        modal.appendChild(body);
        modal.appendChild(actions);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        confirmBtn.focus();
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

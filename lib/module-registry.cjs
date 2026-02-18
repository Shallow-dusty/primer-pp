// lib/module-registry.cjs — Module lifecycle manager (platform-agnostic, testable)

'use strict';

/**
 * @param {{ storage: Object, GLOBAL_KEYS: Object }} deps
 */
function createModuleRegistry({ storage, GLOBAL_KEYS }) {
    const modules = Object.create(null);
    let enabledIds = [];

    return {
        modules,

        init() {
            const stored = storage.get(GLOBAL_KEYS.MODULES, null);
            enabledIds = stored ? [...stored] : null;
            if (!enabledIds) {
                enabledIds = Object.values(modules)
                    .filter(m => m.defaultEnabled)
                    .map(m => m.id);
                storage.set(GLOBAL_KEYS.MODULES, enabledIds);
            }
            for (const id of enabledIds) {
                const mod = modules[id];
                if (mod && typeof mod.init === 'function') {
                    try { mod.init(); } catch (e) {
                        console.error(`Module init failed: ${id}`, e);
                    }
                }
            }
        },

        register(mod) {
            if (!mod || !mod.id) throw new Error('Module must have an id');
            modules[mod.id] = mod;
        },

        isEnabled(id) {
            return enabledIds.includes(id);
        },

        toggle(id) {
            const mod = modules[id];
            if (!mod) return;
            const idx = enabledIds.indexOf(id);
            if (idx >= 0) {
                enabledIds.splice(idx, 1);
                if (typeof mod.destroy === 'function') {
                    try { mod.destroy(); } catch (e) {
                        console.error(`Module destroy failed: ${id}`, e);
                    }
                }
            } else {
                enabledIds.push(id);
                if (typeof mod.init === 'function') {
                    try { mod.init(); } catch (e) {
                        console.error(`Module init failed: ${id}`, e);
                    }
                }
            }
            storage.set(GLOBAL_KEYS.MODULES, enabledIds);
        },

        notifyUserChange(user) {
            for (const id of enabledIds) {
                const mod = modules[id];
                if (mod && typeof mod.onUserChange === 'function') {
                    try { mod.onUserChange(user); } catch (e) {
                        console.error(`Module onUserChange failed: ${id}`, e);
                    }
                }
            }
        },

        getAll() {
            return Object.values(modules);
        },

        getEnabled() {
            return enabledIds.slice();
        },
    };
}

module.exports = { createModuleRegistry };

// src/core/module-registry.js — Module lifecycle manager (decoupled from GM_*)

export function createModuleRegistry({ storage, GLOBAL_KEYS }) {
    const modules = Object.create(null);
    let enabledIds = [];

    return {
        modules,

        init() {
            enabledIds = storage.get(GLOBAL_KEYS.MODULES, null);
            if (!enabledIds) {
                // First run — enable modules with defaultEnabled: true
                enabledIds = Object.values(modules)
                    .filter(m => m.defaultEnabled)
                    .map(m => m.id);
                storage.set(GLOBAL_KEYS.MODULES, enabledIds);
            }
            // Init enabled modules
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

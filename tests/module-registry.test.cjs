const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Inline memory storage for testing
function createMemoryStorage(initial = {}) {
    const data = { ...initial };
    return {
        async init() {},
        get(key, defaultVal) { return key in data ? data[key] : defaultVal; },
        set(key, value) { data[key] = value; },
        listKeys() { return Object.keys(data); },
        onChange() { return () => {}; },
        _raw() { return data; },
    };
}

// Inline registry factory (mirrors src/core/module-registry.js logic)
function createModuleRegistry({ storage, GLOBAL_KEYS }) {
    const modules = Object.create(null);
    let enabledIds = [];
    return {
        modules,
        init() {
            enabledIds = storage.get(GLOBAL_KEYS.MODULES, null);
            if (!enabledIds) {
                enabledIds = Object.values(modules)
                    .filter(m => m.defaultEnabled).map(m => m.id);
                storage.set(GLOBAL_KEYS.MODULES, enabledIds);
            }
            for (const id of enabledIds) {
                const mod = modules[id];
                if (mod && typeof mod.init === 'function') {
                    try { mod.init(); } catch (e) { /* ignore */ }
                }
            }
        },
        register(mod) {
            if (!mod || !mod.id) throw new Error('Module must have an id');
            modules[mod.id] = mod;
        },
        isEnabled(id) { return enabledIds.includes(id); },
        toggle(id) {
            const mod = modules[id];
            if (!mod) return;
            const idx = enabledIds.indexOf(id);
            if (idx >= 0) {
                enabledIds.splice(idx, 1);
                if (typeof mod.destroy === 'function') mod.destroy();
            } else {
                enabledIds.push(id);
                if (typeof mod.init === 'function') mod.init();
            }
            storage.set(GLOBAL_KEYS.MODULES, enabledIds);
        },
        notifyUserChange(user) {
            for (const id of enabledIds) {
                const mod = modules[id];
                if (mod && typeof mod.onUserChange === 'function') {
                    mod.onUserChange(user);
                }
            }
        },
        getAll() { return Object.values(modules); },
        getEnabled() { return enabledIds.slice(); },
    };
}

const KEYS = { MODULES: 'gemini_enabled_modules' };

describe('ModuleRegistry', () => {

    it('register adds module', () => {
        const reg = createModuleRegistry({ storage: createMemoryStorage(), GLOBAL_KEYS: KEYS });
        reg.register({ id: 'a', name: 'A', defaultEnabled: false });
        assert.equal(reg.getAll().length, 1);
    });

    it('register throws without id', () => {
        const reg = createModuleRegistry({ storage: createMemoryStorage(), GLOBAL_KEYS: KEYS });
        assert.throws(() => reg.register({}), /id/);
        assert.throws(() => reg.register(null), /id/);
    });

    it('init enables defaultEnabled modules', () => {
        const storage = createMemoryStorage();
        const reg = createModuleRegistry({ storage, GLOBAL_KEYS: KEYS });
        const inited = [];
        reg.register({ id: 'a', defaultEnabled: true, init() { inited.push('a'); } });
        reg.register({ id: 'b', defaultEnabled: false, init() { inited.push('b'); } });
        reg.init();
        assert.ok(reg.isEnabled('a'));
        assert.ok(!reg.isEnabled('b'));
        assert.deepEqual(inited, ['a']);
    });

    it('init respects saved enabled list', () => {
        const storage = createMemoryStorage({ gemini_enabled_modules: ['b'] });
        const reg = createModuleRegistry({ storage, GLOBAL_KEYS: KEYS });
        const inited = [];
        reg.register({ id: 'a', defaultEnabled: true, init() { inited.push('a'); } });
        reg.register({ id: 'b', defaultEnabled: false, init() { inited.push('b'); } });
        reg.init();
        assert.ok(!reg.isEnabled('a'));
        assert.ok(reg.isEnabled('b'));
        assert.deepEqual(inited, ['b']);
    });

    it('toggle enables then disables', () => {
        const storage = createMemoryStorage();
        const reg = createModuleRegistry({ storage, GLOBAL_KEYS: KEYS });
        let destroyed = false;
        reg.register({ id: 'x', defaultEnabled: false, init() {}, destroy() { destroyed = true; } });
        reg.init();
        assert.ok(!reg.isEnabled('x'));
        reg.toggle('x');
        assert.ok(reg.isEnabled('x'));
        reg.toggle('x');
        assert.ok(!reg.isEnabled('x'));
        assert.ok(destroyed);
    });

    it('toggle persists to storage', () => {
        const storage = createMemoryStorage();
        const reg = createModuleRegistry({ storage, GLOBAL_KEYS: KEYS });
        reg.register({ id: 'x', defaultEnabled: false });
        reg.init();
        reg.toggle('x');
        assert.deepEqual(storage.get(KEYS.MODULES), ['x']);
    });

    it('toggle unknown module is no-op', () => {
        const storage = createMemoryStorage();
        const reg = createModuleRegistry({ storage, GLOBAL_KEYS: KEYS });
        reg.init();
        reg.toggle('nonexistent'); // should not throw
    });

    it('notifyUserChange calls enabled modules', () => {
        const storage = createMemoryStorage();
        const reg = createModuleRegistry({ storage, GLOBAL_KEYS: KEYS });
        const calls = [];
        reg.register({ id: 'a', defaultEnabled: true, init() {}, onUserChange(u) { calls.push(u); } });
        reg.register({ id: 'b', defaultEnabled: false, onUserChange(u) { calls.push('b:' + u); } });
        reg.init();
        reg.notifyUserChange('test@example.com');
        assert.deepEqual(calls, ['test@example.com']);
    });

    it('getEnabled returns copy of enabled list', () => {
        const storage = createMemoryStorage();
        const reg = createModuleRegistry({ storage, GLOBAL_KEYS: KEYS });
        reg.register({ id: 'a', defaultEnabled: true, init() {} });
        reg.init();
        const list = reg.getEnabled();
        list.push('fake');
        assert.ok(!reg.isEnabled('fake'));
    });
});

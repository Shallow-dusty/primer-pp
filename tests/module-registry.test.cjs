const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createMemoryStorage } = require('../lib/storage.cjs');
const { createModuleRegistry } = require('../lib/module-registry.cjs');

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

    it('init swallows module init errors', () => {
        const storage = createMemoryStorage();
        const reg = createModuleRegistry({ storage, GLOBAL_KEYS: KEYS });
        reg.register({ id: 'bad', defaultEnabled: true, init() { throw new Error('boom'); } });
        assert.doesNotThrow(() => reg.init());
    });

    it('toggle swallows destroy errors', () => {
        const storage = createMemoryStorage();
        const reg = createModuleRegistry({ storage, GLOBAL_KEYS: KEYS });
        reg.register({ id: 'x', defaultEnabled: true, init() {}, destroy() { throw new Error('boom'); } });
        reg.init();
        assert.doesNotThrow(() => reg.toggle('x'));
    });

    it('toggle swallows init errors on enable', () => {
        const storage = createMemoryStorage();
        const reg = createModuleRegistry({ storage, GLOBAL_KEYS: KEYS });
        reg.register({ id: 'x', defaultEnabled: false, init() { throw new Error('boom'); } });
        reg.init();
        assert.doesNotThrow(() => reg.toggle('x'));
    });

    it('notifyUserChange swallows onUserChange errors', () => {
        const storage = createMemoryStorage();
        const reg = createModuleRegistry({ storage, GLOBAL_KEYS: KEYS });
        reg.register({ id: 'a', defaultEnabled: true, init() {}, onUserChange() { throw new Error('boom'); } });
        reg.init();
        assert.doesNotThrow(() => reg.notifyUserChange('user@example.com'));
    });
});

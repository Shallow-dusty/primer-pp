const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Inline minimal StorageAdapter for unit testing (mirrors createGMStorage logic)
function createMemoryStorage(initial = {}) {
    const data = { ...initial };
    const listeners = {};
    return {
        async init() {},
        get(key, defaultVal) {
            return key in data ? data[key] : defaultVal;
        },
        set(key, value) {
            const old = data[key];
            data[key] = value;
            if (listeners[key]) {
                listeners[key].forEach(cb => cb(value, old));
            }
        },
        listKeys() {
            return Object.keys(data);
        },
        onChange(key, cb) {
            if (!listeners[key]) listeners[key] = [];
            listeners[key].push(cb);
            return () => {
                listeners[key] = listeners[key].filter(f => f !== cb);
            };
        },
        _raw() { return data; },
    };
}

describe('StorageAdapter (memory)', () => {

    it('get returns default when key missing', () => {
        const s = createMemoryStorage();
        assert.equal(s.get('nope', 42), 42);
    });

    it('set then get returns value', () => {
        const s = createMemoryStorage();
        s.set('foo', 'bar');
        assert.equal(s.get('foo'), 'bar');
    });

    it('listKeys returns all keys', () => {
        const s = createMemoryStorage({ a: 1, b: 2 });
        assert.deepEqual(s.listKeys().sort(), ['a', 'b']);
    });

    it('onChange fires on set', () => {
        const s = createMemoryStorage();
        const calls = [];
        s.onChange('x', (val) => calls.push(val));
        s.set('x', 10);
        s.set('x', 20);
        assert.deepEqual(calls, [10, 20]);
    });

    it('onChange unsubscribe stops notifications', () => {
        const s = createMemoryStorage();
        const calls = [];
        const unsub = s.onChange('x', (val) => calls.push(val));
        s.set('x', 1);
        unsub();
        s.set('x', 2);
        assert.deepEqual(calls, [1]);
    });

    it('init resolves without error', async () => {
        const s = createMemoryStorage();
        await s.init();
    });

    it('get returns stored object by reference', () => {
        const obj = { nested: true };
        const s = createMemoryStorage({ k: obj });
        assert.equal(s.get('k'), obj);
    });

    it('set overwrites previous value', () => {
        const s = createMemoryStorage({ k: 'old' });
        s.set('k', 'new');
        assert.equal(s.get('k'), 'new');
    });
});

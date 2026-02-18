const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createMemoryStorage } = require('../lib/storage.cjs');

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

    it('onChange swallows callback errors', () => {
        const s = createMemoryStorage();
        s.onChange('x', () => { throw new Error('boom'); });
        assert.doesNotThrow(() => s.set('x', 1));
    });

    it('_raw returns internal data object', () => {
        const s = createMemoryStorage({ a: 1 });
        assert.deepEqual(s._raw(), { a: 1 });
    });
});

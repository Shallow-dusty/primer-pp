// lib/storage.cjs — StorageAdapter: memory backend (platform-agnostic, testable)

'use strict';

/**
 * Creates an in-memory StorageAdapter. Used in tests and as a reference implementation.
 * @param {Object} [initial={}]
 * @returns {import('../src/core/storage.js').StorageAdapter}
 */
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
                listeners[key].forEach(cb => { try { cb(value, old); } catch (_) {} });
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

module.exports = { createMemoryStorage };

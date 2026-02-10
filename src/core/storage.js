// src/core/storage.js — StorageAdapter interface + GM/Extension backends

/**
 * @typedef {Object} StorageAdapter
 * @property {() => Promise<void>} init
 * @property {(key: string, defaultVal?: any) => any} get
 * @property {(key: string, value: any) => void} set
 * @property {() => string[]} listKeys
 * @property {(key: string, cb: Function) => () => void} onChange
 */

// --------------- GM Backend (Tampermonkey) ---------------

export function createGMStorage(gmApi) {
    return {
        async init() { /* no-op: GM_getValue is synchronous */ },

        get(key, defaultVal) {
            return gmApi.getValue(key, defaultVal);
        },

        set(key, value) {
            gmApi.setValue(key, value);
        },

        listKeys() {
            return typeof gmApi.listValues === 'function'
                ? gmApi.listValues()
                : [];
        },

        onChange(key, cb) {
            if (typeof gmApi.addValueChangeListener !== 'function') {
                return () => {};
            }
            const id = gmApi.addValueChangeListener(key, (_name, _old, newVal, remote) => {
                if (remote) cb(newVal);
            });
            return () => {
                if (typeof gmApi.removeValueChangeListener === 'function') {
                    gmApi.removeValueChangeListener(id);
                }
            };
        },
    };
}

// --------------- Extension Backend (chrome.storage.local) ---------------

export function createExtensionStorage() {
    const cache = Object.create(null);

    return {
        async init() {
            const data = await chrome.storage.local.get(null);
            Object.assign(cache, data);
        },

        get(key, defaultVal) {
            return key in cache ? cache[key] : defaultVal;
        },

        set(key, value) {
            cache[key] = value;
            chrome.storage.local.set({ [key]: value });
        },

        listKeys() {
            return Object.keys(cache);
        },

        onChange(key, cb) {
            const listener = (changes) => {
                if (changes[key]) {
                    cache[key] = changes[key].newValue;
                    cb(changes[key].newValue);
                }
            };
            chrome.storage.onChanged.addListener(listener);
            return () => chrome.storage.onChanged.removeListener(listener);
        },
    };
}

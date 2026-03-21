/**
 * GM_* API polyfill for browser extension environment.
 * Implements Tampermonkey-compatible APIs using chrome.storage.local
 * with a synchronous in-memory cache (preloaded before main script runs).
 */

const _cache = Object.create(null);
const _changeListeners = new Map();
let _nextListenerId = 1;

export async function __initGMPolyfill() {
    const data = await chrome.storage.local.get(null);
    Object.assign(_cache, data);

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        for (const [key, { newValue, oldValue }] of Object.entries(changes)) {
            _cache[key] = newValue;
            for (const [, entry] of _changeListeners) {
                if (entry.key === key) {
                    try { entry.cb(key, oldValue, newValue, true); } catch (e) { /* silent */ }
                }
            }
        }
    });
}

export function GM_getValue(key, defaultValue) {
    return key in _cache ? _cache[key] : defaultValue;
}

export function GM_setValue(key, value) {
    _cache[key] = value;
    chrome.storage.local.set({ [key]: value });
}

export function GM_listValues() {
    return Object.keys(_cache);
}

export function GM_addValueChangeListener(key, cb) {
    const id = _nextListenerId++;
    _changeListeners.set(id, { key, cb });
    return id;
}

export function GM_removeValueChangeListener(id) {
    _changeListeners.delete(id);
}

export function GM_addStyle(css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    return style;
}

export function GM_registerMenuCommand(_name, _fn) {
    // No-op in extension: context menus handled by background.js
}

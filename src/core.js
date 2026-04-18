import { TEMP_USER, GLOBAL_KEYS, THEMES, PANEL_ID } from './constants.js';
import {
    getCurrentUser, setCurrentUser,
    getInspectingUser, setInspectingUser,
    getCurrentTheme, setCurrentTheme,
    getStorageListenerId, setStorageListenerId
} from './state.js';

export const Core = {
    // --- User management ---
    registerUser(userId) {
        if (!userId || userId === TEMP_USER || !userId.includes('@')) return;
        let registry;
        try { registry = GM_getValue(GLOBAL_KEYS.REGISTRY, []); } catch (e) { registry = []; }
        if (!registry.includes(userId)) {
            registry.push(userId);
            try { GM_setValue(GLOBAL_KEYS.REGISTRY, registry); } catch (e) { /* silent */ }
        }
    },

    getAllUsers() {
        try { return GM_getValue(GLOBAL_KEYS.REGISTRY, []); } catch (e) { return []; }
    },

    detectUser() {
        try {
            const candidates = document.querySelectorAll('a[aria-label*="@"], button[aria-label*="@"], div[aria-label*="\u5E10\u53F7"], div[aria-label*="Account"], img[alt*="@"], img[aria-label*="@"]');
            for (let el of candidates) {
                const label = el.getAttribute('aria-label') || el.getAttribute('alt') || "";
                const match = label.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
                if (match && match[1]) return match[1];
            }
        } catch (e) { }
        return null;
    },

    getCurrentUser() { return getCurrentUser(); },
    getInspectingUser() { return getInspectingUser(); },
    setInspectingUser(user) { setInspectingUser(user); },
    getTempUser() { return TEMP_USER; },

    // --- Theme management ---
    _autoThemeQuery: null,
    _autoThemeHandler: null,
    _appliedRootTheme: null,

    /** Resolve 'auto' to a concrete theme key based on system preference */
    resolveTheme(key) {
        if (key !== 'auto') return key;
        try {
            return window.matchMedia('(prefers-color-scheme: light)').matches ? 'paper' : 'glass';
        } catch (e) {
            return 'glass';
        }
    },

    getTheme() { return getCurrentTheme(); },
    setTheme(key) {
        if (THEMES[key]) {
            setCurrentTheme(key);
            try { GM_setValue(GLOBAL_KEYS.THEME, key); } catch (e) { /* silent */ }
            this._updateAutoListener(key);
        }
    },
    getThemes() { return THEMES; },
    applyTheme(el, themeKey) {
        if (!el) return;
        const resolved = this.resolveTheme(themeKey);
        if (!THEMES[resolved]) return;
        const vars = THEMES[resolved].vars;
        for (const [key, val] of Object.entries(vars)) {
            el.style.setProperty(key, val);
        }
        // Set on :root only when theme actually changes (avoids redundant 20+ writes)
        if (this._appliedRootTheme !== resolved) {
            for (const [key, val] of Object.entries(vars)) {
                document.documentElement.style.setProperty(key, val);
            }
            this._appliedRootTheme = resolved;
        }
    },

    /** Start/stop matchMedia listener for auto theme */
    _updateAutoListener(key) {
        // Remove existing listener
        if (this._autoThemeQuery && this._autoThemeHandler) {
            this._autoThemeQuery.removeEventListener('change', this._autoThemeHandler);
            this._autoThemeQuery = null;
            this._autoThemeHandler = null;
        }
        if (key !== 'auto') return;

        // Register matchMedia listener
        try {
            this._autoThemeQuery = window.matchMedia('(prefers-color-scheme: light)');
            this._autoThemeHandler = () => {
                const panel = document.getElementById(PANEL_ID);
                if (panel) this.applyTheme(panel, 'auto');
            };
            this._autoThemeQuery.addEventListener('change', this._autoThemeHandler);
        } catch (e) { /* matchMedia not supported — no-op */ }
    },

    // --- Storage listener ---
    setupStorageListener(targetUser, callback) {
        const lid = getStorageListenerId();
        if (lid) {
            try { GM_removeValueChangeListener(lid); } catch (e) { /* silent */ }
            setStorageListenerId(null);
        }
        if (!targetUser || targetUser === TEMP_USER) return;

        const storageKey = `gemini_store_${targetUser}`;
        try {
            const newId = GM_addValueChangeListener(storageKey, (name, oldVal, newVal, remote) => {
                if (remote && newVal && callback) {
                    try { callback(newVal); } catch (e) { /* silent */ }
                }
            });
            setStorageListenerId(newId);
        } catch (e) { /* silent */ }
    },

    // --- Shared utilities ---
    sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    },

    _sidebarCache: null,
    _sidebarCacheTime: 0,

    scanSidebarChats(forceRefresh = false) {
        const now = Date.now();
        // Count live chat links up front — cheap query, reused for cache
        // validation and for building the item list below. The count check
        // catches the races the TTL alone cannot:
        //   1. Initial load: cache was seeded with [] while Gemini was still
        //      wiring up the sidebar; chat links appear inside the TTL but
        //      the old length===0 cache path kept returning empty.
        //   2. Incremental load / virtual scroll: new chats are appended
        //      while the cached first element is still connected, so the
        //      previous `isConnected` probe missed the growth.
        const links = document.querySelectorAll('a[href*="/app/"]');
        if (!forceRefresh && this._sidebarCache &&
            now - this._sidebarCacheTime < 2000 &&
            this._sidebarCache.length === links.length &&
            (this._sidebarCache.length === 0 || this._sidebarCache[0].element?.isConnected)) {
            return this._sidebarCache;
        }
        const items = [];
        links.forEach(el => {
            const href = el.getAttribute('href') || '';
            const match = href.match(/\/app\/([a-zA-Z0-9\-_]+)/);
            if (match) {
                let title = '';
                const textEl = el.querySelector('span, div');
                if (textEl) title = textEl.textContent.trim();
                if (!title) title = 'Untitled';
                items.push({ id: match[1], title, element: el, href });
            }
        });
        this._sidebarCache = items;
        this._sidebarCacheTime = now;
        return items;
    },

    invalidateSidebarCache() {
        this._sidebarCache = null;
        this._sidebarCacheTime = 0;
    },

    // --- URL utilities ---
    getChatId() {
        try {
            const match = window.location.pathname.match(/\/app\/([a-zA-Z0-9\-_]+)/);
            return match ? match[1] : null;
        } catch (e) { return null; }
    },

    // --- Date utilities ---
    getDayKey(resetHour = 0) {
        const now = new Date();
        if (now.getHours() < resetHour) {
            now.setDate(now.getDate() - 1);
        }
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
};

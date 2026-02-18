// src/core/core-utils.js — User detection, URL tools, date tools, sidebar scanning

import { GLOBAL_KEYS, TEMP_USER } from './constants.js';
import { SELECTORS } from './selectors.js';

export function createCore({ storage }) {
    let currentUser = TEMP_USER;
    let inspectingUser = TEMP_USER;

    const core = {
        // --- User Detection ---
        detectUser() {
            const selectors = [
                SELECTORS.USER_AVATAR,
                SELECTORS.USER_IMG_ALT,
                SELECTORS.USER_BTN_ARIA,
                SELECTORS.USER_LINK_ARIA,
            ];
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el) {
                    const attr = el.alt || el.getAttribute('aria-label') || '';
                    const match = attr.match(/[\w.+-]+@[\w.-]+/);
                    if (match) return match[0];
                }
            }
            return null;
        },

        getCurrentUser() { return currentUser; },
        setCurrentUser(u) { currentUser = u; },
        getInspectingUser() { return inspectingUser; },
        setInspectingUser(u) { inspectingUser = u; },

        registerUser(email) {
            const registry = storage.get(GLOBAL_KEYS.REGISTRY, []);
            if (!registry.includes(email)) {
                registry.push(email);
                storage.set(GLOBAL_KEYS.REGISTRY, registry);
            }
        },

        getAllUsers() {
            return storage.get(GLOBAL_KEYS.REGISTRY, []);
        },

        // --- URL / Chat ID ---
        getChatId() {
            const m = location.pathname.match(/\/app\/([a-f0-9]+)/);
            return m ? m[1] : null;
        },

        // --- Date Tools ---
        getDayKey(resetHour) {
            const now = new Date();
            const adjusted = new Date(now.getTime() - resetHour * 3600000);
            return adjusted.toISOString().slice(0, 10);
        },

        // --- Theme ---
        getTheme() {
            return storage.get(GLOBAL_KEYS.THEME, 'glass');
        },
        setTheme(id) {
            storage.set(GLOBAL_KEYS.THEME, id);
        },

        // --- Sidebar Scanning ---
        scanSidebarChats() {
            const items = document.querySelectorAll(SELECTORS.SIDEBAR_ITEMS);
            const chats = [];
            items.forEach((el, i) => {
                const title = el.textContent.trim();
                const href = el.getAttribute('href') || '';
                const idMatch = href.match(/\/app\/([a-f0-9]+)/);
                chats.push({
                    id: idMatch ? idMatch[1] : `sidebar-${i}`,
                    title: title || `Chat ${i + 1}`,
                    element: el,
                });
            });
            return chats;
        },

        // --- Utility ---
        sleep(ms) {
            return new Promise(r => setTimeout(r, ms));
        },
    };

    return core;
}

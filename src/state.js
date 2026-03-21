import { TEMP_USER, GLOBAL_KEYS } from './constants.js';

// --- Mutable shared state ---
let currentUser = TEMP_USER;
let inspectingUser = TEMP_USER;
let currentTheme;
try { currentTheme = GM_getValue(GLOBAL_KEYS.THEME, 'glass'); }
catch (e) { currentTheme = 'glass'; }
let storageListenerId = null;

export function getCurrentUser() { return currentUser; }
export function setCurrentUser(u) { currentUser = u; }

export function getInspectingUser() { return inspectingUser; }
export function setInspectingUser(u) { inspectingUser = u; }

export function getCurrentTheme() { return currentTheme; }
export function setCurrentTheme(t) { currentTheme = t; }

export function getStorageListenerId() { return storageListenerId; }
export function setStorageListenerId(id) { storageListenerId = id; }

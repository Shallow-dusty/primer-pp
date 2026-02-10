// src/core/constants.js — Global keys, timings, and defaults

export const GLOBAL_KEYS = {
    POS: 'gemini_panel_pos',
    REGISTRY: 'gemini_user_registry',
    THEME: 'gemini_current_theme',
    RESET_HOUR: 'gemini_reset_hour',
    QUOTA: 'gemini_quota_limit',
    MODULES: 'gemini_enabled_modules',
    DEBUG: 'gemini_debug_enabled',
    LOG_LEVEL: 'gemini_log_level',
    LOGS: 'gemini_logs_store',
    ONBOARDING: 'gemini_onboarding_seen',
    ONBOARDING_LANG: 'gemini_onboarding_lang',
};

export const TIMINGS = {
    POLL_INTERVAL: 1500,
    COUNTER_COOLDOWN: 1000,
    OBSERVER_DEBOUNCE: 500,
    TITLE_DEBOUNCE: 300,
    FAB_AUTO_DISMISS: 5000,
    MODEL_MENU_TIMEOUT: 2000,
};

export const PANEL_ID = 'gemini-counter-panel';

export const DEFAULT_POS = {
    top: 'auto',
    left: 'auto',
    bottom: '20px',
    right: '20px',
};

export const TEMP_USER = '__temp_detecting__';

export const VERSION = '9.0.0';

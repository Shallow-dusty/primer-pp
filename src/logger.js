import { createLogger, filterLogs } from '../lib/debug_logger.js';
import { GLOBAL_KEYS } from './constants.js';

export { createLogger, filterLogs };

// --- Singleton Logger instance ---
let _initLevel;
try { _initLevel = GM_getValue(GLOBAL_KEYS.LOG_LEVEL, 'info'); }
catch (e) { _initLevel = 'info'; }
export const Logger = createLogger({
    level: _initLevel,
    store: {
        get: () => { try { return GM_getValue(GLOBAL_KEYS.LOGS, []); } catch (e) { return []; } },
        set: (v) => { try { GM_setValue(GLOBAL_KEYS.LOGS, v); } catch (e) { /* silent */ } }
    },
    onLevelChange: (lvl) => { try { GM_setValue(GLOBAL_KEYS.LOG_LEVEL, lvl); } catch (e) { /* silent */ } },
    sink: (lvl, msg, data) => {
        const fn = (lvl === 'error') ? console.error
            : (lvl === 'warn') ? console.warn
                : (lvl === 'debug') ? console.debug
                    : console.log;
        fn(`[Gemini] ${msg}`, data || '');
    }
});

export function isDebugEnabled() {
    try { return GM_getValue(GLOBAL_KEYS.DEBUG, false); }
    catch (e) { return false; }
}

export function setDebugEnabled(v) {
    try { GM_setValue(GLOBAL_KEYS.DEBUG, v); } catch (e) { /* silent */ }
}

Logger.info('Logger initialized', { level: Logger.getLevel() });

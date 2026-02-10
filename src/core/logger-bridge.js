// src/core/logger-bridge.js — Bridge lib/debug_logger into runtime

import { GLOBAL_KEYS } from './constants.js';

export function createLoggerBridge({ storage, createLogger, filterLogs: filterLogsFn }) {
    const logger = createLogger({
        persist(entries) {
            storage.set(GLOBAL_KEYS.LOGS, entries);
        },
        restore() {
            return storage.get(GLOBAL_KEYS.LOGS, []);
        },
        level: storage.get(GLOBAL_KEYS.LOG_LEVEL, 'info'),
    });

    return {
        logger,
        filterLogs: filterLogsFn,

        isDebugEnabled() {
            return storage.get(GLOBAL_KEYS.DEBUG, false);
        },
        setDebugEnabled(val) {
            storage.set(GLOBAL_KEYS.DEBUG, val);
        },
    };
}

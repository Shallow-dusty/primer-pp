// src/platforms/userscript/entry.js — Tampermonkey entry point

import { createGMStorage } from '../../core/storage.js';
import { createApp } from '../../shared/app.js';
import { GLOBAL_KEYS, DEFAULT_POS } from '../../core/constants.js';
import { createLogger, filterLogs } from '../../../lib/debug_logger.cjs';
import panelCSS from '../../styles/panel.css';

(async () => {
    const gmApi = {
        getValue: GM_getValue,
        setValue: GM_setValue,
        listValues: GM_listValues,
        addValueChangeListener: GM_addValueChangeListener,
        removeValueChangeListener: GM_removeValueChangeListener,
    };

    const storage = createGMStorage(gmApi);
    await storage.init();

    const app = createApp(storage, {
        createLogger,
        filterLogs,
        panelCSS,
        gmAddStyle: GM_addStyle,
    });

    app.start();

    // --- Tampermonkey menu commands ---
    GM_registerMenuCommand('\uD83D\uDD04 Reset Position', () => {
        GM_setValue(GLOBAL_KEYS.POS, DEFAULT_POS);
        location.reload();
    });
})();

// src/platforms/extension/content.js — Browser extension content script entry

import { createExtensionStorage } from '../../core/storage.js';
import { createApp } from '../../shared/app.js';
import { createLogger, filterLogs } from '../../../lib/debug_logger.cjs';
import '../../styles/panel.css';  // side-effect import → extracted to styles.css by rollup

(async () => {
    const storage = createExtensionStorage();
    await storage.init();

    const app = createApp(storage, {
        createLogger,
        filterLogs,
        panelCSS: null,   // CSS loaded via manifest.json content_scripts.css
        gmAddStyle: null,
    });

    app.start();
})();

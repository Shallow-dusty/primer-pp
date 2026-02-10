// src/ui/settings.js — Settings, Calibration, Debug, and Onboarding modals

import { PANEL_ID, GLOBAL_KEYS, VERSION } from '../core/constants.js';

export function createSettingsUI({ storage, Core, Logger, getCounterModule, getModuleRegistry, getExportModule, applyTheme, getTheme, isDebugEnabled, setDebugEnabled, filterLogs, debugHelpers }) {
    return {
        // --- Settings Modal ---
        open(panelUI) {
            const SETTINGS_MODAL_ID = 'gemini-settings-modal';
            if (document.getElementById(SETTINGS_MODAL_ID)) return;

            const overlay = document.createElement('div');
            overlay.id = SETTINGS_MODAL_ID;
            overlay.className = 'settings-overlay';
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

            const modal = document.createElement('div');
            modal.className = 'settings-modal';
            applyTheme(modal, getTheme());

            // Header
            const header = document.createElement('div');
            header.className = 'settings-header';
            const title = document.createElement('h3');
            title.textContent = '\u2699\uFE0F Settings';
            const closeBtn = document.createElement('span');
            closeBtn.className = 'settings-close';
            closeBtn.textContent = '\u2715';
            closeBtn.onclick = () => overlay.remove();
            header.appendChild(title);
            header.appendChild(closeBtn);

            // Body
            const body = document.createElement('div');
            body.className = 'settings-body';

            // Feature Extensions
            this._renderExtensionsSection(body, panelUI);

            // Module-specific Settings
            this._renderModuleSettings(body);

            // Counter Settings
            this._renderCounterSettings(body, panelUI);

            // Data Section
            this._renderDataSection(body, panelUI, overlay);

            // Debug Section
            this._renderDebugSection(body, panelUI);

            // Version
            const version = document.createElement('div');
            version.className = 'settings-version';
            version.textContent = `Gemini Ultra Toolkit v${VERSION}`;
            body.appendChild(version);

            modal.appendChild(header);
            modal.appendChild(body);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        },

        _renderExtensionsSection(body, panelUI) {
            const registry = getModuleRegistry();
            const cm = getCounterModule();

            const extSection = document.createElement('div');
            extSection.className = 'settings-section';
            const extTitle = document.createElement('div');
            extTitle.className = 'settings-section-title';
            extTitle.textContent = '\uD83D\uDCE6 Feature Extensions';
            extSection.appendChild(extTitle);

            registry.getAll().forEach(mod => {
                const row = document.createElement('div');
                row.className = 'module-toggle-compact';
                row.title = mod.description;

                const label = document.createElement('div');
                label.className = 'module-compact-label';
                const icon = document.createElement('span');
                icon.className = 'module-icon';
                icon.textContent = mod.icon;
                const name = document.createElement('span');
                name.textContent = mod.name;
                label.appendChild(icon);
                label.appendChild(name);

                const rightSide = document.createElement('div');
                rightSide.style.cssText = 'display:flex;align-items:center;gap:6px;';

                if (typeof mod.getOnboarding === 'function') {
                    const infoBtn = document.createElement('span');
                    infoBtn.className = 'onboarding-info-btn';
                    infoBtn.textContent = '\u24D8';
                    infoBtn.title = 'Show guide';
                    infoBtn.onclick = (e) => {
                        e.stopPropagation();
                        panelUI.showOnboarding(mod.id);
                    };
                    rightSide.appendChild(infoBtn);
                }

                const toggle = document.createElement('div');
                toggle.className = `toggle-switch ${registry.isEnabled(mod.id) ? 'on' : ''}`;
                toggle.onclick = () => {
                    registry.toggle(mod.id);
                    toggle.classList.toggle('on');
                    if (cm.state.isExpanded) {
                        panelUI.renderDetailsPane();
                    }
                };
                rightSide.appendChild(toggle);

                row.appendChild(label);
                row.appendChild(rightSide);
                extSection.appendChild(row);
            });
            body.appendChild(extSection);
        },

        _renderModuleSettings(body) {
            const registry = getModuleRegistry();
            registry.getAll().forEach(mod => {
                if (registry.isEnabled(mod.id) && typeof mod.renderToSettings === 'function') {
                    const modSection = document.createElement('div');
                    modSection.className = 'settings-section';
                    const modTitle = document.createElement('div');
                    modTitle.className = 'settings-section-title';
                    modTitle.textContent = mod.icon + ' ' + mod.name + ' Settings';
                    modSection.appendChild(modTitle);
                    mod.renderToSettings(modSection);
                    body.appendChild(modSection);
                }
            });
        },

        _renderCounterSettings(body, panelUI) {
            const cm = getCounterModule();

            // Reset Hour
            const resetSection = document.createElement('div');
            resetSection.className = 'settings-section';
            const resetTitle = document.createElement('div');
            resetTitle.className = 'settings-section-title';
            resetTitle.textContent = 'Daily Reset';
            resetSection.appendChild(resetTitle);

            const resetRow = document.createElement('div');
            resetRow.className = 'settings-row';
            const resetLabel = document.createElement('span');
            resetLabel.className = 'settings-label';
            resetLabel.textContent = 'Reset Hour';
            const resetSelect = document.createElement('select');
            resetSelect.className = 'settings-select';
            for (let h = 0; h < 24; h++) {
                const opt = document.createElement('option');
                opt.value = h;
                opt.textContent = `${h.toString().padStart(2, '0')}:00`;
                if (h === cm.resetHour) opt.selected = true;
                resetSelect.appendChild(opt);
            }
            resetSelect.onchange = () => {
                cm.resetHour = parseInt(resetSelect.value, 10);
                storage.set(GLOBAL_KEYS.RESET_HOUR, cm.resetHour);
                panelUI.update();
            };
            resetRow.appendChild(resetLabel);
            resetRow.appendChild(resetSelect);
            resetSection.appendChild(resetRow);
            body.appendChild(resetSection);

            // Quota
            const quotaSection = document.createElement('div');
            quotaSection.className = 'settings-section';
            const quotaTitle = document.createElement('div');
            quotaTitle.className = 'settings-section-title';
            quotaTitle.textContent = 'Daily Quota';
            quotaSection.appendChild(quotaTitle);

            const quotaRow = document.createElement('div');
            quotaRow.className = 'settings-row';
            const quotaLabelEl = document.createElement('span');
            quotaLabelEl.className = 'settings-label';
            quotaLabelEl.textContent = 'Message Limit';
            const quotaInput = document.createElement('input');
            quotaInput.type = 'number';
            quotaInput.min = '1';
            quotaInput.max = '999';
            quotaInput.value = cm.quotaLimit;
            quotaInput.className = 'settings-select';
            quotaInput.style.width = '60px';
            quotaInput.style.textAlign = 'center';
            quotaInput.onchange = () => {
                const v = parseInt(quotaInput.value, 10);
                if (v > 0 && v <= 999) {
                    cm.quotaLimit = v;
                    storage.set(GLOBAL_KEYS.QUOTA, v);
                    panelUI.update();
                }
            };
            quotaRow.appendChild(quotaLabelEl);
            quotaRow.appendChild(quotaInput);
            quotaSection.appendChild(quotaRow);
            body.appendChild(quotaSection);

            // Usage Chart
            this._renderUsageChart(body, cm);
        },

        _renderUsageChart(body, cm) {
            const chartSection = document.createElement('div');
            chartSection.className = 'settings-section';
            const chartTitle = document.createElement('div');
            chartTitle.className = 'settings-section-title';
            chartTitle.textContent = 'Usage History (Last 7 Days)';
            chartSection.appendChild(chartTitle);

            const chartContainer = document.createElement('div');
            chartContainer.style.cssText = 'background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px; margin-top: 4px;';

            const data = cm.getLast7DaysData();
            const svgWidth = 268, svgHeight = 80, padding = 20;
            const maxVal = Math.max(...data.map(d => d.messages), 1);

            const points = data.map((d, i) => ({
                x: padding + i * ((svgWidth - 2 * padding) / 6),
                y: svgHeight - padding - (d.messages / maxVal) * (svgHeight - 2 * padding),
                val: d.messages,
                label: d.label,
            }));

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', svgWidth);
            svg.setAttribute('height', svgHeight + 20);
            svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight + 20}`);

            const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const areaD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                + ` L ${points[6].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`;
            areaPath.setAttribute('d', areaD);
            areaPath.setAttribute('fill', 'rgba(138, 180, 248, 0.2)');
            svg.appendChild(areaPath);

            const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            linePath.setAttribute('d', lineD);
            linePath.setAttribute('fill', 'none');
            linePath.setAttribute('stroke', 'var(--accent, #8ab4f8)');
            linePath.setAttribute('stroke-width', '2');
            linePath.setAttribute('stroke-linecap', 'round');
            linePath.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(linePath);

            points.forEach((p) => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', p.x);
                circle.setAttribute('cy', p.y);
                circle.setAttribute('r', '3');
                circle.setAttribute('fill', 'var(--accent, #8ab4f8)');
                svg.appendChild(circle);

                if (p.val > 0) {
                    const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    valText.setAttribute('x', p.x);
                    valText.setAttribute('y', p.y - 6);
                    valText.setAttribute('text-anchor', 'middle');
                    valText.setAttribute('font-size', '8');
                    valText.setAttribute('fill', 'var(--text-sub, #9aa0a6)');
                    valText.textContent = p.val;
                    svg.appendChild(valText);
                }

                const dateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                dateText.setAttribute('x', p.x);
                dateText.setAttribute('y', svgHeight + 10);
                dateText.setAttribute('text-anchor', 'middle');
                dateText.setAttribute('font-size', '8');
                dateText.setAttribute('fill', 'var(--text-sub, #9aa0a6)');
                dateText.textContent = p.label;
                svg.appendChild(dateText);
            });

            chartContainer.appendChild(svg);
            chartSection.appendChild(chartContainer);
            body.appendChild(chartSection);
        },

        _renderDataSection(body, panelUI, overlay) {
            const cm = getCounterModule();
            const registry = getModuleRegistry();

            const dataSection = document.createElement('div');
            dataSection.className = 'settings-section';
            const dataTitle = document.createElement('div');
            dataTitle.className = 'settings-section-title';
            dataTitle.textContent = 'Data';
            dataSection.appendChild(dataTitle);

            // Export buttons
            if (registry.isEnabled('export')) {
                const exportMod = getExportModule();
                if (exportMod) exportMod.renderExportButtons(dataSection);
            } else {
                const exportBtn = document.createElement('button');
                exportBtn.className = 'settings-btn';
                exportBtn.textContent = '\uD83D\uDCE4 Export Data (JSON)';
                exportBtn.onclick = () => {
                    const exportData = {
                        total: cm.state.total,
                        totalChatsCreated: cm.state.totalChatsCreated,
                        chats: cm.state.chats,
                        dailyCounts: cm.state.dailyCounts,
                        exportedAt: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `gemini-counter-${Core.getCurrentUser().split('@')[0]}-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                };
                dataSection.appendChild(exportBtn);
            }

            const calibrateBtn = document.createElement('button');
            calibrateBtn.className = 'settings-btn';
            calibrateBtn.textContent = '\uD83D\uDD27 Calibrate Data';
            calibrateBtn.onclick = () => this.openCalibration(panelUI);
            dataSection.appendChild(calibrateBtn);

            const resetPosBtn = document.createElement('button');
            resetPosBtn.className = 'settings-btn';
            resetPosBtn.textContent = '\uD83D\uDCCD Reset Panel Position';
            resetPosBtn.onclick = () => {
                storage.set(GLOBAL_KEYS.POS, { top: 'auto', left: 'auto', bottom: '20px', right: '20px' });
                overlay.remove();
                location.reload();
            };
            dataSection.appendChild(resetPosBtn);
            body.appendChild(dataSection);
        },

        _renderDebugSection(body, panelUI) {
            const debugSection = document.createElement('div');
            debugSection.className = 'settings-section';
            const debugTitle = document.createElement('div');
            debugTitle.className = 'settings-section-title';
            debugTitle.textContent = 'Debug';
            debugSection.appendChild(debugTitle);

            const debugToggleRow = document.createElement('div');
            debugToggleRow.className = 'settings-row';
            const debugLabel = document.createElement('span');
            debugLabel.className = 'settings-label';
            debugLabel.textContent = 'Enable Debug';
            const debugToggle = document.createElement('div');
            debugToggle.className = `toggle-switch ${isDebugEnabled() ? 'on' : ''}`;
            debugToggle.onclick = () => {
                const enabled = !isDebugEnabled();
                setDebugEnabled(enabled);
                debugToggle.classList.toggle('on');
                Logger.info('Debug mode toggled', { enabled });
            };
            debugToggleRow.appendChild(debugLabel);
            debugToggleRow.appendChild(debugToggle);
            debugSection.appendChild(debugToggleRow);

            const logLevelRow = document.createElement('div');
            logLevelRow.className = 'settings-row';
            const logLevelLabel = document.createElement('span');
            logLevelLabel.className = 'settings-label';
            logLevelLabel.textContent = 'Log Level';
            const logSelect = document.createElement('select');
            logSelect.className = 'settings-select';
            ['error', 'warn', 'info', 'debug'].forEach(lvl => {
                const opt = document.createElement('option');
                opt.value = lvl;
                opt.textContent = lvl.toUpperCase();
                if (lvl === Logger.getLevel()) opt.selected = true;
                logSelect.appendChild(opt);
            });
            logSelect.onchange = () => Logger.setLevel(logSelect.value);
            logLevelRow.appendChild(logLevelLabel);
            logLevelRow.appendChild(logSelect);
            debugSection.appendChild(logLevelRow);

            const debugPanelBtn = document.createElement('button');
            debugPanelBtn.className = 'settings-btn';
            debugPanelBtn.textContent = '\uD83E\uDDF0 Open Debug Panel';
            debugPanelBtn.onclick = () => this.openDebug(panelUI);
            debugSection.appendChild(debugPanelBtn);

            body.appendChild(debugSection);
        },

        // --- Calibration Modal ---
        openCalibration(panelUI) {
            const MODAL_ID = 'gemini-calibrate-modal';
            if (document.getElementById(MODAL_ID)) return;

            const cm = getCounterModule();
            const todayKey = Core.getDayKey(cm.resetHour);

            const overlay = document.createElement('div');
            overlay.id = MODAL_ID;
            overlay.className = 'settings-overlay';
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

            const modal = document.createElement('div');
            modal.className = 'settings-modal';
            applyTheme(modal, getTheme());

            // Header
            const header = document.createElement('div');
            header.className = 'settings-header';
            const title = document.createElement('h3');
            title.textContent = 'Calibrate Data';
            const closeBtn = document.createElement('span');
            closeBtn.className = 'settings-close';
            closeBtn.textContent = '\u2715';
            closeBtn.onclick = () => overlay.remove();
            header.appendChild(title);
            header.appendChild(closeBtn);

            // Body
            const body = document.createElement('div');
            body.className = 'settings-body';

            const mkField = (label, value) => {
                const row = document.createElement('div');
                row.className = 'settings-row';
                const lbl = document.createElement('span');
                lbl.className = 'settings-label';
                lbl.textContent = label;
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '0';
                input.value = value;
                input.className = 'settings-select';
                input.style.width = '80px';
                input.style.textAlign = 'center';
                row.appendChild(lbl);
                row.appendChild(input);
                return { row, input };
            };

            const section = document.createElement('div');
            section.className = 'settings-section';
            const sTitle = document.createElement('div');
            sTitle.className = 'settings-section-title';
            sTitle.textContent = 'Adjust Values';
            section.appendChild(sTitle);

            const todayField = mkField('Today Messages', cm.state.dailyCounts[todayKey]?.messages || 0);
            const totalField = mkField('Lifetime Total', cm.state.total);
            const chatsField = mkField('Chats Created', cm.state.totalChatsCreated);
            section.appendChild(todayField.row);
            section.appendChild(totalField.row);
            section.appendChild(chatsField.row);
            body.appendChild(section);

            // Current Chat field
            let chatField = null;
            const currentCid = Core.getChatId();
            if (currentCid) {
                const chatSection = document.createElement('div');
                chatSection.className = 'settings-section';
                const chatTitle = document.createElement('div');
                chatTitle.className = 'settings-section-title';
                chatTitle.textContent = 'Current Chat';
                chatSection.appendChild(chatTitle);
                chatField = mkField('Chat Messages', cm.state.chats[currentCid] || 0);
                chatSection.appendChild(chatField.row);

                const chatIdHint = document.createElement('div');
                chatIdHint.style.cssText = 'font-size: 9px; color: var(--text-sub); opacity: 0.5; margin-top: 2px;';
                chatIdHint.textContent = 'ID: ' + currentCid.slice(0, 12) + '...';
                chatSection.appendChild(chatIdHint);
                body.appendChild(chatSection);
            }

            // Apply button
            const applyBtn = document.createElement('button');
            applyBtn.className = 'settings-btn';
            applyBtn.textContent = 'Apply Calibration';
            applyBtn.style.marginTop = '12px';
            applyBtn.style.background = 'rgba(138, 180, 248, 0.2)';
            applyBtn.style.color = 'var(--accent, #8ab4f8)';
            applyBtn.style.fontWeight = '500';
            applyBtn.onclick = () => {
                const newToday = parseInt(todayField.input.value, 10) || 0;
                const newTotal = parseInt(totalField.input.value, 10) || 0;
                const newChats = parseInt(chatsField.input.value, 10) || 0;

                cm.ensureTodayEntry();
                cm.state.dailyCounts[todayKey].messages = newToday;
                cm.state.total = newTotal;
                cm.state.totalChatsCreated = newChats;

                if (chatField && currentCid) {
                    const newChatVal = parseInt(chatField.input.value, 10) || 0;
                    cm.state.chats[currentCid] = newChatVal;
                }

                cm.saveData();
                panelUI.update();
                if (cm.state.isExpanded) panelUI.renderDetailsPane();

                Logger.info('Data calibrated', {
                    today: newToday, total: newTotal, chats: newChats,
                    chatId: currentCid || null,
                });
                overlay.remove();
            };
            body.appendChild(applyBtn);

            const note = document.createElement('div');
            note.className = 'settings-version';
            note.textContent = 'Manually adjust counter values';
            body.appendChild(note);

            modal.appendChild(header);
            modal.appendChild(body);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        },

        // --- Debug Modal ---
        openDebug(panelUI) {
            const DEBUG_MODAL_ID = 'gemini-debug-modal';
            if (document.getElementById(DEBUG_MODAL_ID)) return;

            const overlay = document.createElement('div');
            overlay.id = DEBUG_MODAL_ID;
            overlay.className = 'debug-overlay';
            let unsubscribe = null;
            const closeModal = () => {
                if (unsubscribe) unsubscribe();
                overlay.remove();
            };
            overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

            const modal = document.createElement('div');
            modal.className = 'debug-modal';
            applyTheme(modal, getTheme());

            const header = document.createElement('div');
            header.className = 'debug-header';
            const title = document.createElement('h3');
            title.textContent = '\uD83E\uDDF0 Debug Panel';
            const closeBtn = document.createElement('span');
            closeBtn.className = 'debug-close';
            closeBtn.textContent = '\u2715';
            closeBtn.onclick = () => closeModal();
            header.appendChild(title);
            header.appendChild(closeBtn);

            const body = document.createElement('div');
            body.className = 'debug-body';

            // Info section
            const info = document.createElement('div');
            info.className = 'debug-kv';

            const infoLine = (label, value) => {
                const div = document.createElement('div');
                const strong = document.createElement('strong');
                strong.textContent = label + ':';
                div.appendChild(strong);
                div.appendChild(document.createTextNode(' ' + value));
                return div;
            };

            const detected = Core.detectUser();
            const current = Core.getCurrentUser();
            const inspecting = Core.getInspectingUser();
            const effective = detected || current;
            const storageKey = (effective && effective.includes('@')) ? `gemini_store_${effective}` : 'N/A';

            info.appendChild(infoLine('Detected', detected || 'null'));
            info.appendChild(infoLine('Current', current));
            info.appendChild(infoLine('Inspecting', inspecting));
            info.appendChild(infoLine('Storage Key', storageKey));
            info.appendChild(infoLine('Debug Enabled', String(isDebugEnabled())));
            info.appendChild(infoLine('Log Level', Logger.getLevel()));

            // Filter row
            const filterRow = document.createElement('div');
            filterRow.className = 'debug-filter-row';
            const filters = ['all', 'error', 'warn', 'info', 'debug'];
            let activeFilter = 'all';
            let searchTerm = '';

            const mkFilterBtn = (label) => {
                const b = document.createElement('button');
                b.className = 'debug-filter-btn';
                b.textContent = label.toUpperCase();
                b.onclick = () => {
                    activeFilter = label;
                    Array.from(filterRow.children).forEach(el => el.classList.remove('active'));
                    b.classList.add('active');
                    renderLogs();
                };
                return b;
            };
            filters.forEach((f, i) => {
                const btn = mkFilterBtn(f);
                if (i === 0) btn.classList.add('active');
                filterRow.appendChild(btn);
            });

            // Search
            const search = document.createElement('input');
            search.className = 'debug-search';
            search.placeholder = 'Search logs...';
            search.oninput = () => {
                searchTerm = search.value.trim().toLowerCase();
                renderLogs();
            };

            // Debug actions
            const actions = document.createElement('div');
            actions.className = 'debug-actions';

            const mkBtn = (label, onClick) => {
                const b = document.createElement('button');
                b.className = 'settings-btn';
                b.textContent = label;
                b.onclick = onClick;
                return b;
            };

            actions.appendChild(mkBtn('Show Detected User', () => debugHelpers.showDetectedUser()));
            actions.appendChild(mkBtn('Dump Storage Keys', () => debugHelpers.dumpStorageKeys()));
            actions.appendChild(mkBtn('Dump Gemini Storage', () => debugHelpers.dumpGeminiStores()));
            actions.appendChild(mkBtn('Export Legacy Data', () => debugHelpers.exportLegacyData()));
            actions.appendChild(mkBtn('Export All Storage', () => debugHelpers.exportAllStorage()));
            actions.appendChild(mkBtn('Export Logs', () => debugHelpers.exportLogs()));
            actions.appendChild(mkBtn('Clear Logs', () => Logger.clear()));

            // Log list
            const logList = document.createElement('div');
            logList.className = 'debug-log-list';

            const renderLogs = () => {
                logList.replaceChildren();
                let entries = filterLogs(Logger.getEntries(), { level: activeFilter, term: searchTerm }).slice(-120);
                if (entries.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'debug-log-item';
                    empty.textContent = 'No logs yet.';
                    logList.appendChild(empty);
                    return;
                }
                entries.forEach(e => {
                    const item = document.createElement('div');
                    item.className = 'debug-log-item';
                    const meta = `${e.ts}`;
                    const lvl = document.createElement('span');
                    lvl.className = `debug-level ${e.level}`;
                    lvl.textContent = `[${e.level.toUpperCase()}]`;
                    const data = e.data ? ` ${JSON.stringify(e.data)}` : '';
                    item.textContent = `${meta} `;
                    item.appendChild(lvl);
                    item.appendChild(document.createTextNode(` ${e.msg}${data}`));
                    logList.appendChild(item);
                });
            };

            renderLogs();
            unsubscribe = Logger.subscribe(renderLogs);

            body.appendChild(info);
            body.appendChild(filterRow);
            body.appendChild(search);
            body.appendChild(actions);
            body.appendChild(logList);

            modal.appendChild(header);
            modal.appendChild(body);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        },

        // --- Onboarding Modal ---
        showOnboarding(moduleId, panelUI) {
            const registry = getModuleRegistry();
            const mod = registry.modules[moduleId];
            if (!mod || typeof mod.getOnboarding !== 'function') return;

            const content = mod.getOnboarding();
            if (!content) return;

            let lang = storage.get(GLOBAL_KEYS.ONBOARDING_LANG, 'zh');
            const MODAL_ID = 'gemini-onboarding-modal';
            const existing = document.getElementById(MODAL_ID);
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = MODAL_ID;
            overlay.className = 'onboarding-overlay';
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

            const modal = document.createElement('div');
            modal.className = 'onboarding-modal';
            applyTheme(modal, getTheme());

            const renderContent = () => {
                modal.replaceChildren();
                const t = content[lang] || content.zh || content.en;

                // Header
                const header = document.createElement('div');
                header.className = 'onboarding-header';
                const title = document.createElement('h3');
                title.textContent = mod.icon + ' ' + mod.name;
                const closeBtn = document.createElement('span');
                closeBtn.className = 'onboarding-close';
                closeBtn.textContent = '\u2715';
                closeBtn.onclick = () => overlay.remove();
                header.appendChild(title);
                header.appendChild(closeBtn);
                modal.appendChild(header);

                // Body
                const body = document.createElement('div');
                body.className = 'onboarding-body';

                if (t.rant) {
                    const sec1 = document.createElement('div');
                    sec1.className = 'onboarding-section';
                    const h1 = document.createElement('div');
                    h1.className = 'onboarding-section-title';
                    h1.textContent = lang === 'zh' ? '\uD83D\uDCA2 \u4E3A\u4EC0\u4E48\u9700\u8981\u8FD9\u4E2A\uFF1F' : '\uD83D\uDCA2 Why does this exist?';
                    const p1 = document.createElement('div');
                    p1.className = 'onboarding-text';
                    p1.textContent = t.rant;
                    sec1.appendChild(h1);
                    sec1.appendChild(p1);
                    body.appendChild(sec1);
                }

                if (t.features) {
                    const sec2 = document.createElement('div');
                    sec2.className = 'onboarding-section';
                    const h2 = document.createElement('div');
                    h2.className = 'onboarding-section-title';
                    h2.textContent = lang === 'zh' ? '\u2728 \u5B83\u80FD\u505A\u4EC0\u4E48\uFF1F' : '\u2728 What does it do?';
                    const p2 = document.createElement('div');
                    p2.className = 'onboarding-text';
                    p2.textContent = t.features;
                    sec2.appendChild(h2);
                    sec2.appendChild(p2);
                    body.appendChild(sec2);
                }

                if (t.guide) {
                    const sec3 = document.createElement('div');
                    sec3.className = 'onboarding-section';
                    const h3el = document.createElement('div');
                    h3el.className = 'onboarding-section-title';
                    h3el.textContent = lang === 'zh' ? '\uD83C\uDFAF \u5982\u4F55\u4F7F\u7528\uFF1F' : '\uD83C\uDFAF How to use?';
                    const p3 = document.createElement('div');
                    p3.className = 'onboarding-text';
                    p3.textContent = t.guide;
                    sec3.appendChild(h3el);
                    sec3.appendChild(p3);
                    body.appendChild(sec3);
                }

                modal.appendChild(body);

                // Footer
                const footer = document.createElement('div');
                footer.className = 'onboarding-footer';
                const langBtn = document.createElement('button');
                langBtn.className = 'onboarding-lang-btn';
                langBtn.textContent = lang === 'zh' ? '\uD83C\uDF10 EN' : '\uD83C\uDF10 \u4E2D';
                langBtn.onclick = () => {
                    lang = lang === 'zh' ? 'en' : 'zh';
                    storage.set(GLOBAL_KEYS.ONBOARDING_LANG, lang);
                    renderContent();
                };
                const startBtn = document.createElement('button');
                startBtn.className = 'onboarding-start-btn';
                startBtn.textContent = lang === 'zh' ? '\u5F00\u59CB\u4F7F\u7528 \u2192' : 'Get Started \u2192';
                startBtn.onclick = () => overlay.remove();
                footer.appendChild(langBtn);
                footer.appendChild(startBtn);
                modal.appendChild(footer);
            };

            renderContent();
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        },
    };
}

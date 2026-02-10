// src/ui/details-pane.js — Details pane tab bar and stats tab rendering

import { PANEL_ID, TEMP_USER } from '../core/constants.js';

export function createDetailsPaneUI({ Core, getCounterModule, getModuleRegistry, applyTheme, getTheme }) {
    return {
        // --- Render Details Pane ---
        render(panelUI) {
            const pane = document.getElementById('g-details-pane');
            if (!pane) return;
            pane.replaceChildren();

            // Collect available tabs (stats is always present)
            const tabs = [{ id: 'stats', icon: '\uD83D\uDCCA' }];
            const tabModules = ['folders', 'prompt-vault', 'batch-delete'];
            const registry = getModuleRegistry();
            tabModules.forEach(id => {
                const mod = registry.modules[id];
                if (mod && registry.isEnabled(id) && typeof mod.renderToDetailsPane === 'function') {
                    tabs.push({ id, icon: mod.icon });
                }
            });

            // Fallback to stats if active tab was disabled
            if (!tabs.find(t => t.id === panelUI._activeTab)) panelUI._activeTab = 'stats';

            // Only render tab bar when >1 tab
            if (tabs.length > 1) {
                const tabBar = document.createElement('div');
                tabBar.className = 'details-tab-bar';
                tabs.forEach(t => {
                    const tab = document.createElement('div');
                    tab.className = `details-tab ${t.id === panelUI._activeTab ? 'active' : ''}`;
                    tab.textContent = t.icon;
                    tab.title = t.id;
                    tab.onclick = (e) => {
                        e.stopPropagation();
                        panelUI._activeTab = t.id;
                        panelUI.renderDetailsPane();
                    };
                    tabBar.appendChild(tab);
                });
                pane.appendChild(tabBar);
            }

            // Render content for active tab
            if (panelUI._activeTab === 'stats') {
                this._renderStatsTab(pane, panelUI);
            } else {
                const mod = registry.modules[panelUI._activeTab];
                if (mod && typeof mod.renderToDetailsPane === 'function') {
                    mod.renderToDetailsPane(pane);
                }
            }
        },

        // --- Stats Tab ---
        _renderStatsTab(pane, panelUI) {
            const cm = getCounterModule();
            const user = Core.getCurrentUser();
            const inspecting = Core.getInspectingUser();

            // Statistics
            pane.appendChild(panelUI.createSectionTitle('Statistics'));
            const cid = Core.getChatId();
            pane.appendChild(panelUI.createRow('Today', 'today', cm.getTodayMessages()));
            pane.appendChild(panelUI.createRow('Current Chat', 'chat', cid ? (cm.state.chats[cid] || 0) : 0));
            pane.appendChild(panelUI.createRow('Chats Created', 'chatsCreated', cm.state.totalChatsCreated));
            pane.appendChild(panelUI.createRow('Lifetime', 'total', cm.state.total));

            // Model Breakdown (today)
            this._renderModelBreakdown(pane, cm);

            // Profiles
            this._renderProfiles(pane, panelUI, cm, user, inspecting);

            // Themes
            this._renderThemes(pane, panelUI);

            // Actions
            this._renderActions(pane, panelUI);
        },

        _renderModelBreakdown(pane, cm) {
            const byModel = cm.getTodayByModel();
            const hasModelData = byModel.flash || byModel.thinking || byModel.pro;
            if (!hasModelData) return;

            const modelRow = document.createElement('div');
            modelRow.className = 'detail-row model-breakdown';
            modelRow.style.cssText = 'display: flex; gap: 10px; font-size: 10px; padding: 4px 8px; color: var(--text-sub);';
            const models = [
                { key: 'flash', label: 'Flash', color: '#34a853' },
                { key: 'thinking', label: 'Think', color: '#fbbc04' },
                { key: 'pro', label: 'Pro', color: '#ea4335' },
            ];
            models.forEach(m => {
                const span = document.createElement('span');
                span.style.cssText = 'display: flex; align-items: center; gap: 3px;';
                const dot = document.createElement('span');
                dot.style.cssText = `width: 6px; height: 6px; border-radius: 50%; background: ${m.color}; display: inline-block;`;
                const num = document.createElement('span');
                num.textContent = byModel[m.key] || 0;
                span.appendChild(dot);
                span.appendChild(num);
                modelRow.appendChild(span);
            });
            pane.appendChild(modelRow);
        },

        _renderProfiles(pane, panelUI, cm, user, inspecting) {
            pane.appendChild(panelUI.createSectionTitle('Profiles'));
            const users = Core.getAllUsers();
            const sortedUsers = users.sort((a, b) => (a === user ? -1 : b === user ? 1 : a.localeCompare(b)));

            if (sortedUsers.length === 0 && user === TEMP_USER) {
                const row = document.createElement('div');
                row.className = 'detail-row';
                row.textContent = 'Waiting for login...';
                pane.appendChild(row);
            } else {
                sortedUsers.forEach(uid => {
                    const row = document.createElement('div');
                    row.className = `detail-row user-row ${uid === user ? 'is-me' : ''} ${uid === inspecting ? 'active-mode' : ''}`;
                    row.onclick = (e) => {
                        e.stopPropagation();
                        Core.setInspectingUser(uid);
                        cm.loadDataForUser(uid);
                        cm.state.viewMode = 'total';
                        panelUI.renderDetailsPane();
                    };
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = uid.split('@')[0];
                    row.appendChild(nameSpan);
                    if (uid === user) {
                        const meBadge = document.createElement('span');
                        meBadge.className = 'user-indicator';
                        meBadge.textContent = 'ME';
                        row.appendChild(meBadge);
                    }
                    pane.appendChild(row);
                });
            }
        },

        _renderThemes(pane, panelUI) {
            pane.appendChild(panelUI.createSectionTitle('Themes'));
            const themes = Core.getThemes();
            const currentTheme = getTheme();
            Object.keys(themes).forEach(key => {
                const row = document.createElement('div');
                row.className = `detail-row ${currentTheme === key ? 'active-mode' : ''}`;
                row.textContent = themes[key].name;
                row.onclick = (e) => {
                    e.stopPropagation();
                    Core.setTheme(key);
                    const panel = document.getElementById(PANEL_ID);
                    applyTheme(panel, key);
                    panelUI.renderDetailsPane();
                };
                pane.appendChild(row);
            });
        },

        _renderActions(pane, panelUI) {
            pane.appendChild(panelUI.createSectionTitle(''));
            const actionsRow = document.createElement('div');
            actionsRow.style.display = 'flex';
            actionsRow.style.gap = '8px';

            const statsBtn = document.createElement('button');
            statsBtn.className = 'g-btn';
            statsBtn.textContent = '\uD83D\uDCCA Stats';
            statsBtn.style.flex = '1';
            statsBtn.onclick = (e) => { e.stopPropagation(); panelUI.openDashboard(); };

            const settingsBtn = document.createElement('button');
            settingsBtn.className = 'g-btn';
            settingsBtn.textContent = '\u2699\uFE0F';
            settingsBtn.style.width = '32px';
            settingsBtn.title = "Settings";
            settingsBtn.onclick = (e) => { e.stopPropagation(); panelUI.openSettingsModal(); };

            actionsRow.appendChild(statsBtn);
            actionsRow.appendChild(settingsBtn);
            pane.appendChild(actionsRow);
        },
    };
}

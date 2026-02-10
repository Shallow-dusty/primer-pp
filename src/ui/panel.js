// src/ui/panel.js — Main panel creation, dragging, position, update

import { PANEL_ID, DEFAULT_POS, GLOBAL_KEYS, TEMP_USER } from '../core/constants.js';

export function createPanelUI({ storage, Core, Logger, getCounterModule, getModuleRegistry, applyTheme, getTheme, injectStyles }) {
    return {
        _activeTab: 'stats',
        _dragMove: null,
        _dragUp: null,

        // Lazy-loaded sub-modules (set by app.js after creation)
        _settingsUI: null,
        _dashboardUI: null,
        _detailsUI: null,

        setSubModules({ settingsUI, dashboardUI, detailsUI }) {
            this._settingsUI = settingsUI;
            this._dashboardUI = dashboardUI;
            this._detailsUI = detailsUI;
        },

        // --- Panel Creation ---
        create() {
            try {
                const container = document.createElement('div');
                container.id = PANEL_ID;
                container.className = 'notranslate';
                container.setAttribute('translate', 'no');
                this.applyPos(container, storage.get(GLOBAL_KEYS.POS, DEFAULT_POS));
                applyTheme(container, getTheme());

                // Header
                const header = document.createElement('div');
                header.className = 'gemini-header';
                const userCapsule = document.createElement('div');
                userCapsule.id = 'g-user-capsule';
                userCapsule.className = 'user-capsule';
                const toggle = document.createElement('span');
                toggle.className = 'gemini-toggle-btn';
                toggle.textContent = '\u2630';
                toggle.onmousedown = (e) => e.stopPropagation();
                toggle.onclick = () => this.toggleDetails();
                header.appendChild(userCapsule);
                header.appendChild(toggle);

                // Main View
                const mainView = document.createElement('div');
                mainView.className = 'gemini-main-view';

                const bigDisplay = document.createElement('div');
                bigDisplay.id = 'g-big-display';
                bigDisplay.className = 'gemini-big-num';
                bigDisplay.textContent = '0';

                const modelRow = document.createElement('div');
                modelRow.id = 'g-model-row';
                modelRow.className = 'gemini-model-row';
                const modelBadge = document.createElement('span');
                modelBadge.id = 'g-model-badge';
                modelBadge.className = 'model-badge';
                modelRow.appendChild(modelBadge);

                const subInfo = document.createElement('div');
                subInfo.id = 'g-sub-info';
                subInfo.className = 'gemini-sub-info';
                subInfo.textContent = 'Today';

                const quotaWrap = document.createElement('div');
                quotaWrap.id = 'g-quota-wrap';
                quotaWrap.className = 'quota-bar-wrap';
                const quotaFill = document.createElement('div');
                quotaFill.id = 'g-quota-fill';
                quotaFill.className = 'quota-bar-fill';
                quotaWrap.appendChild(quotaFill);

                const quotaLabel = document.createElement('div');
                quotaLabel.id = 'g-quota-label';
                quotaLabel.className = 'quota-label';

                const actionBtn = document.createElement('button');
                actionBtn.id = 'g-action-btn';
                actionBtn.className = 'g-btn';
                actionBtn.textContent = 'Reset Today';
                actionBtn.onclick = () => getCounterModule().handleReset();
                actionBtn.onmousedown = (e) => e.stopPropagation();

                mainView.appendChild(bigDisplay);
                mainView.appendChild(modelRow);
                mainView.appendChild(subInfo);
                mainView.appendChild(quotaWrap);
                mainView.appendChild(quotaLabel);
                mainView.appendChild(actionBtn);

                // Details Pane
                const details = document.createElement('div');
                details.id = 'g-details-pane';
                details.className = 'gemini-details-view';

                container.appendChild(header);
                container.appendChild(mainView);
                container.appendChild(details);
                document.body.appendChild(container);

                this.makeDraggable(container, header);
                this.renderDetailsPane();
                this.update();

            } catch (e) {
                console.error("Panel init error", e);
            }
        },

        // --- Toggle Details ---
        toggleDetails() {
            const cm = getCounterModule();
            cm.state.isExpanded = !cm.state.isExpanded;
            const pane = document.getElementById('g-details-pane');
            if (pane) {
                if (cm.state.isExpanded) {
                    pane.classList.add('expanded');
                    this.renderDetailsPane();
                } else {
                    pane.classList.remove('expanded');
                    cm.state.resetStep = 0;
                }
                this.update();
            }
        },

        // --- Render Details Pane (delegates to detailsUI) ---
        renderDetailsPane() {
            if (this._detailsUI) {
                this._detailsUI.render(this);
            }
        },

        // --- UI Helpers ---
        createSectionTitle(text) {
            const div = document.createElement('div');
            div.className = 'section-title';
            div.textContent = text;
            return div;
        },

        createRow(label, mode, val) {
            const cm = getCounterModule();
            const user = Core.getCurrentUser();
            const inspecting = Core.getInspectingUser();

            const row = document.createElement('div');
            row.className = `detail-row ${cm.state.viewMode === mode && inspecting === user ? 'active-mode' : ''}`;
            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            const valSpan = document.createElement('span');
            valSpan.className = 'detail-val';
            valSpan.textContent = val;
            row.appendChild(labelSpan);
            row.appendChild(valSpan);
            row.onclick = (e) => {
                e.stopPropagation();
                if (inspecting !== user) {
                    Core.setInspectingUser(user);
                    cm.loadDataForUser(user);
                }
                cm.state.viewMode = mode;
                cm.state.resetStep = 0;
                this.update();
                this.renderDetailsPane();
            };
            return row;
        },

        // --- Update Display ---
        update() {
            const cm = getCounterModule();
            const user = Core.getCurrentUser();
            const inspecting = Core.getInspectingUser();

            const bigDisplay = document.getElementById('g-big-display');
            const subInfo = document.getElementById('g-sub-info');
            const actionBtn = document.getElementById('g-action-btn');
            const capsule = document.getElementById('g-user-capsule');
            const modelBadge = document.getElementById('g-model-badge');
            const quotaFill = document.getElementById('g-quota-fill');
            const quotaLabel = document.getElementById('g-quota-label');
            if (!bigDisplay) return;

            // Capsule
            const isMe = inspecting === user;
            const displayName = inspecting === TEMP_USER ? 'Guest' : inspecting.split('@')[0];

            capsule.replaceChildren();
            const dot = document.createElement('div');
            dot.className = 'user-avatar-dot';
            const name = document.createElement('span');
            name.textContent = displayName;
            name.style.overflow = 'hidden';
            name.style.textOverflow = 'ellipsis';
            name.style.whiteSpace = 'nowrap';
            capsule.appendChild(dot);
            capsule.appendChild(name);

            // Account badge inline
            if (cm.accountType && cm.accountType !== 'free') {
                const acctBadgeInline = document.createElement('span');
                acctBadgeInline.className = 'acct-badge-inline';
                acctBadgeInline.dataset.tier = cm.accountType;
                const acctLabels = { free: 'Free', pro: 'Pro', ultra: 'Ultra' };
                acctBadgeInline.textContent = acctLabels[cm.accountType] || 'Free';
                acctBadgeInline.title = 'Account Tier';
                capsule.appendChild(acctBadgeInline);
            }

            if (!isMe) {
                capsule.classList.add('viewing-other');
                capsule.title = "Viewing other user (Read Only)";
            } else {
                capsule.classList.remove('viewing-other');
                capsule.title = "Active User";
            }

            // Model badge
            if (modelBadge) {
                const mc = cm.MODEL_CONFIG[cm.currentModel];
                modelBadge.textContent = mc.label;
                modelBadge.style.background = mc.color;
                modelBadge.style.color = cm.currentModel === 'flash' ? '#000' : '#fff';
            }

            let val = 0, sub = "", btn = "Reset";
            let disableBtn = !isMe;

            if (cm.state.viewMode === 'today') {
                val = cm.getTodayMessages();
                sub = `Today (Reset @${cm.resetHour}:00)`;
                btn = "Reset Today";
                if (!isMe) { sub = `Today (${inspecting.split('@')[0]})`; }
            } else if (cm.state.viewMode === 'chat') {
                if (!isMe) {
                    val = "--"; sub = "Different Context"; disableBtn = true;
                } else {
                    const cid = Core.getChatId();
                    val = cid ? (cm.state.chats[cid] || 0) : 0;
                    sub = cid ? `ID: ${cid.slice(0, 8)}...` : 'ID: New Chat';
                    btn = "Reset Chat";
                }
            } else if (cm.state.viewMode === 'chatsCreated') {
                val = cm.state.totalChatsCreated;
                sub = "Chats Created";
                btn = "View Only";
                disableBtn = true;
            } else if (cm.state.viewMode === 'total') {
                val = cm.state.total;
                sub = "Lifetime History";
                btn = "Clear History";
            }

            // Bump animation
            const numericVal = typeof val === 'number' ? val : -1;
            if (numericVal !== cm.lastDisplayedVal && cm.lastDisplayedVal !== -1 && numericVal > cm.lastDisplayedVal) {
                bigDisplay.classList.remove('bump');
                void bigDisplay.offsetWidth;
                bigDisplay.classList.add('bump');
            }
            cm.lastDisplayedVal = numericVal;

            bigDisplay.textContent = val;
            subInfo.textContent = sub;

            // Quota bar
            if (quotaFill && quotaLabel) {
                const used = cm.getTodayMessages();
                const weighted = cm.getWeightedQuota();
                const pct = Math.min((weighted / cm.quotaLimit) * 100, 100);
                quotaFill.style.width = pct + '%';
                if (pct < 60) quotaFill.style.background = '#34a853';
                else if (pct < 85) quotaFill.style.background = '#fbbc04';
                else quotaFill.style.background = '#ea4335';
                const weightedStr = weighted % 1 === 0 ? String(weighted) : weighted.toFixed(1);
                quotaLabel.textContent = `${used} msgs (${weightedStr} weighted) / ${cm.quotaLimit}`;
            }

            // Action button
            if (disableBtn) {
                actionBtn.textContent = "View Only";
                actionBtn.className = 'g-btn disabled';
                actionBtn.disabled = true;
            } else {
                actionBtn.disabled = false;
                if (cm.state.resetStep === 0) {
                    actionBtn.textContent = btn;
                    actionBtn.className = 'g-btn';
                } else {
                    actionBtn.textContent = cm.state.resetStep === 1 ? "Sure?" : "Really?";
                    actionBtn.className = `g-btn danger-${cm.state.resetStep}`;
                }
            }
        },

        // --- Position Management ---
        applyPos(el, pos) {
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const savedLeft = parseFloat(pos.left) || 0;
            const savedTop = parseFloat(pos.top) || 0;

            if (pos.left !== 'auto' && pos.top !== 'auto' &&
                (savedLeft > winW - 50 || savedTop > winH - 50)) {
                console.warn('Panel off-screen detected. Resetting.');
                pos = DEFAULT_POS;
                storage.set(GLOBAL_KEYS.POS, DEFAULT_POS);
            }
            el.style.top = pos.top;
            el.style.left = pos.left;
            el.style.bottom = pos.bottom;
            el.style.right = pos.right;
        },

        // --- Draggable ---
        makeDraggable(el, handle) {
            if (this._dragMove) document.removeEventListener('mousemove', this._dragMove);
            if (this._dragUp) document.removeEventListener('mouseup', this._dragUp);

            let isDragging = false, startX, startY, iLeft, iTop;
            handle.onmousedown = (e) => {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = el.getBoundingClientRect();
                iLeft = rect.left;
                iTop = rect.top;
                el.style.bottom = 'auto';
                el.style.right = 'auto';
                el.style.left = iLeft + 'px';
                el.style.top = iTop + 'px';
                handle.style.cursor = 'grabbing';
            };
            this._dragMove = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                let nL = iLeft + e.clientX - startX;
                let nT = iTop + e.clientY - startY;
                if (nT < 10) nT = 10;
                if (nL < 0) nL = 0;
                if (nL + el.offsetWidth > window.innerWidth) nL = window.innerWidth - el.offsetWidth;
                if (nT + el.offsetHeight > window.innerHeight) nT = window.innerHeight - el.offsetHeight;
                el.style.left = nL + 'px';
                el.style.top = nT + 'px';
            };
            this._dragUp = () => {
                if (!isDragging) return;
                isDragging = false;
                handle.style.cursor = 'grab';
                storage.set(GLOBAL_KEYS.POS, { top: el.style.top, left: el.style.left, bottom: 'auto', right: 'auto' });
            };
            document.addEventListener('mousemove', this._dragMove);
            document.addEventListener('mouseup', this._dragUp);
        },

        // --- Delegate to sub-modules ---
        openSettingsModal() {
            if (this._settingsUI) this._settingsUI.open(this);
        },

        openDashboard() {
            if (this._dashboardUI) this._dashboardUI.open(this);
        },

        openCalibrationModal() {
            if (this._settingsUI) this._settingsUI.openCalibration(this);
        },

        openDebugModal() {
            if (this._settingsUI) this._settingsUI.openDebug(this);
        },

        showOnboarding(moduleId) {
            if (this._settingsUI) this._settingsUI.showOnboarding(moduleId, this);
        },
    };
}

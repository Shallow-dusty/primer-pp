// src/modules/counter.js — Message counter with model tracking, streaks, quota

import { TIMINGS, GLOBAL_KEYS, TEMP_USER } from '../core/constants.js';

export function createCounterModule({ storage, Core, Logger, getModuleRegistry, getPanelUI }) {
    const COOLDOWN = TIMINGS.COUNTER_COOLDOWN;

    const MODEL_CONFIG = {
        flash: { label: '3 Flash', multiplier: 0, color: '#34a853' },
        thinking: { label: '3 Flash Thinking', multiplier: 0.33, color: '#fbbc04' },
        pro: { label: '3 Pro', multiplier: 1, color: '#ea4335' },
    };

    const MODEL_DETECT_MAP = {
        // EN
        'Fast': 'flash', 'Flash': 'flash', 'flash': 'flash',
        'Thinking': 'thinking', 'thinking': 'thinking',
        'Pro': 'pro', 'pro': 'pro',
        // ZH
        '快速': 'flash', '思考': 'thinking',
        // JA
        '高速': 'flash',
        // KO
        '빠른': 'flash', '사고': 'thinking',
    };

    let _unsubStorage = null;

    return {
        id: 'counter',
        name: '消息计数器',
        description: '统计消息数量、热力图、配额追踪',
        icon: '📊',
        defaultEnabled: true,

        MODEL_CONFIG,
        MODEL_DETECT_MAP,

        resetHour: 0,
        quotaLimit: 50,
        currentModel: 'flash',
        accountType: 'free',
        lastDisplayedVal: -1,
        lastCountTime: 0,

        state: {
            total: 0,
            totalChatsCreated: 0,
            chats: {},
            dailyCounts: {},
            viewMode: 'today',
            isExpanded: false,
            resetStep: 0,
        },

        _boundKeyHandler: null,
        _boundClickHandler: null,

        // --- Lifecycle ---
        init() {
            this.resetHour = storage.get(GLOBAL_KEYS.RESET_HOUR, 0);
            this.quotaLimit = storage.get(GLOBAL_KEYS.QUOTA, 50);
            this.bindEvents();
            Logger.info('CounterModule initialized');
        },

        destroy() {
            if (this._boundKeyHandler) {
                document.removeEventListener('keydown', this._boundKeyHandler, true);
                this._boundKeyHandler = null;
            }
            if (this._boundClickHandler) {
                document.removeEventListener('click', this._boundClickHandler, true);
                this._boundClickHandler = null;
            }
            if (_unsubStorage) {
                _unsubStorage();
                _unsubStorage = null;
            }
            Logger.info('CounterModule destroyed');
        },

        onUserChange(user) {
            this.loadDataForUser(user);
        },

        // --- Event Binding ---
        bindEvents() {
            if (this._boundKeyHandler && this._boundClickHandler) return;
            if (this._boundKeyHandler) {
                document.removeEventListener('keydown', this._boundKeyHandler, true);
                this._boundKeyHandler = null;
            }
            if (this._boundClickHandler) {
                document.removeEventListener('click', this._boundClickHandler, true);
                this._boundClickHandler = null;
            }

            this._boundKeyHandler = (e) => {
                if (!getModuleRegistry().isEnabled('counter')) return;
                if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.originalEvent?.isComposing) return;
                const act = document.activeElement;
                if (act && (act.tagName === 'TEXTAREA' || act.getAttribute('contenteditable') === 'true')) {
                    setTimeout(() => this.attemptIncrement(), 50);
                }
            };

            this._boundClickHandler = (e) => {
                if (!getModuleRegistry().isEnabled('counter')) return;
                const btn = e.target?.closest ? e.target.closest('button') : null;
                if (btn && !btn.disabled) {
                    if (btn.classList.contains('send-button')) {
                        this.attemptIncrement();
                        return;
                    }
                    const label = btn.getAttribute('aria-label') || '';
                    if (label.includes('Send') || label.includes('发送')) {
                        this.attemptIncrement();
                    }
                }
            };

            document.addEventListener('keydown', this._boundKeyHandler, true);
            document.addEventListener('click', this._boundClickHandler, true);
        },

        // --- Data Management ---
        loadDataForUser(targetUser) {
            if (!targetUser) return;

            // Cross-tab sync via storage.onChange
            if (_unsubStorage) _unsubStorage();
            const storageKey = `gemini_store_${targetUser}`;
            _unsubStorage = storage.onChange(storageKey, (newVal) => {
                if (!newVal) return;
                this.state.total = newVal.total || 0;
                this.state.totalChatsCreated = newVal.totalChatsCreated || 0;
                this.state.chats = newVal.chats || {};
                this.state.dailyCounts = newVal.dailyCounts || {};
                getPanelUI().update();
            });

            if (targetUser === TEMP_USER) {
                Object.assign(this.state, {
                    total: 0, totalChatsCreated: 0, chats: {}, dailyCounts: {},
                    viewMode: 'today', isExpanded: false, resetStep: 0,
                });
                return;
            }

            const savedData = storage.get(storageKey, null);
            if (savedData) {
                this.state.total = savedData.total || 0;
                this.state.totalChatsCreated = savedData.totalChatsCreated || 0;
                this.state.chats = savedData.chats || {};
                this.state.dailyCounts = savedData.dailyCounts || {};
                // Legacy data migration
                if (savedData.session && Object.keys(this.state.dailyCounts).length === 0) {
                    const today = Core.getDayKey(this.resetHour);
                    this.state.dailyCounts[today] = { messages: savedData.session, chats: 0 };
                }
            } else {
                Object.assign(this.state, {
                    total: 0, totalChatsCreated: 0, chats: {}, dailyCounts: {},
                    viewMode: 'today', isExpanded: false, resetStep: 0,
                });
            }
            Logger.debug('Loaded user data', {
                user: targetUser,
                total: this.state.total,
                totalChatsCreated: this.state.totalChatsCreated,
                days: Object.keys(this.state.dailyCounts).length,
            });
        },

        saveData() {
            const user = Core.getCurrentUser();
            if (!user || !user.includes('@')) return;
            const storageKey = `gemini_store_${user}`;
            storage.set(storageKey, {
                total: this.state.total,
                totalChatsCreated: this.state.totalChatsCreated,
                chats: this.state.chats,
                dailyCounts: this.state.dailyCounts,
            });
        },

        // --- Counting Logic ---
        ensureTodayEntry() {
            const today = Core.getDayKey(this.resetHour);
            if (!this.state.dailyCounts[today]) {
                this.state.dailyCounts[today] = { messages: 0, chats: 0, byModel: { flash: 0, thinking: 0, pro: 0 } };
            }
            if (!this.state.dailyCounts[today].byModel) {
                this.state.dailyCounts[today].byModel = { flash: 0, thinking: 0, pro: 0 };
            }
            return today;
        },

        getTodayMessages() {
            const today = Core.getDayKey(this.resetHour);
            return this.state.dailyCounts[today]?.messages || 0;
        },

        getTodayByModel() {
            const today = Core.getDayKey(this.resetHour);
            return this.state.dailyCounts[today]?.byModel || { flash: 0, thinking: 0, pro: 0 };
        },

        getWeightedQuota() {
            const bm = this.getTodayByModel();
            return Object.keys(bm).reduce((sum, key) => {
                const mult = MODEL_CONFIG[key]?.multiplier ?? 1;
                return sum + (bm[key] * mult);
            }, 0);
        },

        attemptIncrement() {
            const now = Date.now();
            if (now - this.lastCountTime < COOLDOWN) return;

            const today = this.ensureTodayEntry();
            this.state.total++;
            this.state.dailyCounts[today].messages++;
            const model = this.currentModel || 'flash';
            if (this.state.dailyCounts[today].byModel) {
                this.state.dailyCounts[today].byModel[model] = (this.state.dailyCounts[today].byModel[model] || 0) + 1;
            }
            this.lastCountTime = now;

            const cid = Core.getChatId();

            if (cid) {
                if (!this.state.chats[cid]) {
                    this.state.totalChatsCreated++;
                    this.state.dailyCounts[today].chats++;
                }
                this.state.chats[cid] = (this.state.chats[cid] || 0) + 1;
                this.saveData();
                getPanelUI().update();
            } else {
                this.saveData();
                getPanelUI().update();
                // Poll for new chat ID
                let attempts = 0;
                const poller = setInterval(() => {
                    attempts++;
                    const newCid = Core.getChatId();
                    if (newCid) {
                        clearInterval(poller);
                        if (!this.state.chats[newCid]) {
                            this.state.totalChatsCreated++;
                            const todayKey = this.ensureTodayEntry();
                            this.state.dailyCounts[todayKey].chats++;
                        }
                        this.state.chats[newCid] = (this.state.chats[newCid] || 0) + 1;
                        this.saveData();
                        getPanelUI().update();
                    } else if (attempts >= 20) {
                        clearInterval(poller);
                        this.saveData();
                    }
                }, 500);
            }
        },

        // --- Model Detection ---
        detectModel() {
            try {
                const modeBtn = document.querySelector('button.input-area-switch');
                if (modeBtn) {
                    const text = modeBtn.textContent.trim();
                    const key = MODEL_DETECT_MAP[text];
                    if (key) return key;
                }
                const pillLabel = document.querySelector('[data-test-id="bard-mode-menu-button"]');
                if (pillLabel) {
                    const text = pillLabel.textContent.trim().split(/\s/)[0];
                    const key = MODEL_DETECT_MAP[text];
                    if (key) return key;
                }
                const selected = document.querySelector('.bard-mode-list-button.is-selected');
                if (selected) {
                    const text = selected.textContent.trim().split(/\s/)[0];
                    const key = MODEL_DETECT_MAP[text];
                    if (key) return key;
                }
            } catch (e) { Logger.debug('detectModel failed', e); }
            return this.currentModel;
        },

        detectAccountType() {
            try {
                const pillboxBtn = document.querySelector('button.gds-pillbox-button, button.pillbox-btn');
                if (pillboxBtn) {
                    const text = pillboxBtn.textContent.trim().toUpperCase();
                    if (text === 'ULTRA' || text.includes('ULTRA')) return 'ultra';
                    if (text === 'PRO' || text.includes('PRO')) return 'pro';
                }
                return 'free';
            } catch (e) { Logger.debug('detectAccountType failed', e); }
            return this.accountType;
        },

        // --- Statistics ---
        calculateStreaks() {
            const dailyData = this.state.dailyCounts;
            const dates = Object.keys(dailyData).sort();
            if (dates.length === 0) return { current: 0, best: 0 };

            let best = 0, temp = 0, lastDate = null;

            for (const dateStr of dates) {
                if (dailyData[dateStr].messages === 0) continue;
                const d = new Date(dateStr);
                d.setHours(0, 0, 0, 0);

                if (lastDate) {
                    const diff = (d - lastDate) / (1000 * 60 * 60 * 24);
                    if (diff === 1) temp++;
                    else if (diff > 1) temp = 1;
                } else {
                    temp = 1;
                }
                if (temp > best) best = temp;
                lastDate = d;
            }

            // Current streak
            const todayStr = Core.getDayKey(this.resetHour);
            const todayDate = new Date();
            if (todayDate.getHours() < this.resetHour) todayDate.setDate(todayDate.getDate() - 1);
            todayDate.setDate(todayDate.getDate() - 1);
            const yesterdayStr = todayDate.toISOString().slice(0, 10);

            let checkDate = (dailyData[todayStr]?.messages > 0) ? new Date(todayStr) : new Date(yesterdayStr);
            let current = 0;

            const MAX_STREAK = 3650; // 10 years safety cap
            let safetyCount = 0;
            while (safetyCount++ < MAX_STREAK) {
                const key = checkDate.toISOString().slice(0, 10);
                if (dailyData[key] && dailyData[key].messages > 0) {
                    current++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }

            return { current, best };
        },

        getLast7DaysData() {
            const result = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toISOString().slice(0, 10);
                result.push({
                    date: key,
                    label: `${d.getMonth() + 1}/${d.getDate()}`,
                    messages: this.state.dailyCounts[key]?.messages || 0,
                });
            }
            return result;
        },

        // --- Reset Logic ---
        handleReset() {
            const user = Core.getCurrentUser();
            if (Core.getInspectingUser() !== user) return;

            if (this.state.resetStep === 0) {
                this.state.resetStep = 1;
                getPanelUI().update();
                return;
            }

            if (this.state.viewMode === 'today') {
                const today = Core.getDayKey(this.resetHour);
                if (this.state.dailyCounts[today]) {
                    this.state.dailyCounts[today].messages = 0;
                    this.state.dailyCounts[today].byModel = { flash: 0, thinking: 0, pro: 0 };
                }
            } else if (this.state.viewMode === 'chat') {
                const cid = Core.getChatId();
                if (cid) this.state.chats[cid] = 0;
            } else if (this.state.viewMode === 'total') {
                if (this.state.resetStep === 1) {
                    this.state.resetStep = 2;
                    getPanelUI().update();
                    return;
                }
                this.state.total = 0;
                this.state.chats = {};
                this.state.dailyCounts = {};
                this.state.totalChatsCreated = 0;
            }

            this.state.resetStep = 0;
            this.saveData();
            getPanelUI().update();
        },
    };
}

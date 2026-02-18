// src/modules/default-model.js — Auto-select preferred model for new chats

export function createDefaultModelModule({ storage, Core, Logger, TIMINGS }) {
    const STORAGE_KEY = 'gemini_default_model';

    return {
        id: 'default-model',
        name: '默认模型',
        description: '新对话自动选择首选模型',
        icon: '🤖',
        defaultEnabled: false,

        _preferredModel: 'pro',
        _lastUrl: '',
        _switching: false,

        init() {
            this._preferredModel = storage.get(STORAGE_KEY, 'pro');
            this._lastUrl = location.href;
            Logger.info('DefaultModelModule initialized', { preferred: this._preferredModel });
        },

        destroy() {
            this._switching = false;
        },

        onUserChange() {},

        tick() {
            const currentUrl = location.href;
            if (currentUrl !== this._lastUrl) {
                const wasChat = this._lastUrl.includes('/app/');
                this._lastUrl = currentUrl;
                if (this._isNewChat() || (!wasChat && this._isNewChat())) {
                    this._attemptModelSwitch();
                }
            }
        },

        setPreferredModel(model) {
            this._preferredModel = model;
            storage.set(STORAGE_KEY, model);
            Logger.info('Default model set', { model });
        },

        _isNewChat() {
            const url = location.href;
            return (url.includes('/app') && !url.includes('/app/')) ||
                   url.endsWith('/app') ||
                   (url.match(/\/app\?[^/]*$/) !== null);
        },

        async _attemptModelSwitch() {
            if (this._switching) return;
            this._switching = true;
            try {
                await this._waitForElement(
                    'button.input-area-switch, [data-test-id="bard-mode-menu-button"]',
                    5000
                );
                const currentModel = this._detectCurrentModel();
                if (currentModel === this._preferredModel) {
                    Logger.info('Already on preferred model', { model: currentModel });
                    return;
                }
                const modeBtn = document.querySelector('button.input-area-switch') ||
                                document.querySelector('[data-test-id="bard-mode-menu-button"]');
                if (!modeBtn) return;
                modeBtn.click();
                await this._waitForElement(
                    '[data-test-id^="bard-mode-option-"]',
                    TIMINGS.MODEL_MENU_TIMEOUT
                );

                const modelMap = { flash: 'fast', thinking: 'thinking', pro: 'pro' };
                const testId = 'bard-mode-option-' + (modelMap[this._preferredModel] || this._preferredModel);
                const option = document.querySelector('[data-test-id="' + testId + '"]');
                if (option) {
                    option.click();
                    Logger.info('Model switched', { from: currentModel, to: this._preferredModel });
                } else {
                    document.body.click();
                    Logger.warn('Model option not found', { testId });
                }
            } catch (e) {
                Logger.warn('Model switch failed', { error: e.message });
            } finally {
                this._switching = false;
            }
        },

        _detectCurrentModel() {
            const map = this._getModelDetectMap();
            const modeBtn = document.querySelector('button.input-area-switch');
            if (modeBtn) {
                const text = modeBtn.textContent.trim();
                if (map[text]) return map[text];
            }
            const pill = document.querySelector('[data-test-id="bard-mode-menu-button"]');
            if (pill) {
                const text = pill.textContent.trim().split(/\s/)[0];
                if (map[text]) return map[text];
            }
            return 'flash';
        },

        _getModelDetectMap() {
            return {
                'Fast': 'flash', '快速': 'flash', '高速': 'flash', '빠른': 'flash',
                'Thinking': 'thinking', '思考': 'thinking', '사고': 'thinking',
                'Pro': 'pro',
            };
        },

        _waitForElement(selector, timeout) {
            return new Promise((resolve, reject) => {
                const el = document.querySelector(selector);
                if (el) return resolve(el);
                const start = Date.now();
                const check = setInterval(() => {
                    const found = document.querySelector(selector);
                    if (found) { clearInterval(check); resolve(found); }
                    else if (Date.now() - start > timeout) {
                        clearInterval(check);
                        reject(new Error('timeout'));
                    }
                }, 200);
            });
        },

        renderToSettings(container) {
            const row = document.createElement('div');
            row.className = 'settings-row';
            const label = document.createElement('span');
            label.textContent = '🤖 首选模型';
            const select = document.createElement('select');
            select.style.cssText = 'background:var(--input-bg,rgba(255,255,255,0.1));color:var(--text-main);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:13px;';
            const models = [
                { value: 'flash', label: '3 Fast (Flash)' },
                { value: 'thinking', label: '3 Flash Thinking' },
                { value: 'pro', label: '3 Pro' },
            ];
            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.value;
                opt.textContent = m.label;
                if (m.value === this._preferredModel) opt.selected = true;
                select.appendChild(opt);
            });
            select.addEventListener('change', () => {
                this.setPreferredModel(select.value);
            });
            row.appendChild(label);
            row.appendChild(select);
            container.appendChild(row);
        },
    };
}

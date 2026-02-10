// src/modules/ui-tweaks.js — Tab title, Ctrl+Enter, layout customization

import { TIMINGS } from '../core/constants.js';

export function createUITweaksModule({ storage, Logger }) {
    const STORAGE_KEY = 'gemini_ui_tweaks';

    return {
        id: 'ui-tweaks',
        name: 'UI 自定义',
        description: 'Tab 标题 / 快捷键 / 布局调整',
        icon: '🎨',
        defaultEnabled: false,

        _styleEl: null,
        _titleObserver: null,
        _titleDebounce: null,
        _keyHandler: null,

        features: {
            tabTitle: { enabled: false, label: 'Tab 标题同步对话名' },
            ctrlEnter: { enabled: false, label: 'Ctrl+Enter 才发送' },
            chatWidth: { enabled: false, label: '聊天区宽度', value: 900 },
            sidebarWidth: { enabled: false, label: '侧栏宽度', value: 280 },
            hideGems: { enabled: false, label: '隐藏 Gems 入口' },
        },

        init() {
            const saved = storage.get(STORAGE_KEY, null);
            if (saved) {
                Object.keys(saved).forEach(k => {
                    if (this.features[k]) {
                        this.features[k].enabled = saved[k].enabled;
                        if (saved[k].value !== undefined) {
                            this.features[k].value = saved[k].value;
                        }
                    }
                });
            }
            this._applyAll();
            Logger.info('UITweaksModule initialized', {
                features: Object.keys(this.features).filter(k => this.features[k].enabled),
            });
        },

        destroy() {
            if (this._styleEl) { this._styleEl.remove(); this._styleEl = null; }
            if (this._titleObserver) { this._titleObserver.disconnect(); this._titleObserver = null; }
            if (this._titleDebounce) { clearTimeout(this._titleDebounce); this._titleDebounce = null; }
            if (this._keyHandler) {
                document.removeEventListener('keydown', this._keyHandler, true);
                this._keyHandler = null;
            }
            document.title = 'Google Gemini';
        },

        onUserChange() {},

        _save() {
            storage.set(STORAGE_KEY, this.features);
        },

        _applyAll() {
            this._applyCSS();
            this._applyTabTitle();
            this._applyCtrlEnter();
        },

        _applyCSS() {
            if (this._styleEl) this._styleEl.remove();
            const rules = [];
            if (this.features.chatWidth.enabled) {
                const w = this.features.chatWidth.value || 900;
                rules.push('main .conversation-container, main .chat-window { max-width: ' + w + 'px !important; }');
            }
            if (this.features.sidebarWidth.enabled) {
                const w = this.features.sidebarWidth.value || 280;
                rules.push('bard-sidenav { width: ' + w + 'px !important; min-width: ' + w + 'px !important; }');
            }
            if (this.features.hideGems.enabled) {
                rules.push('a[href*="/gems/"] { display: none !important; }');
            }
            if (rules.length > 0) {
                const style = document.createElement('style');
                style.textContent = rules.join('\n');
                document.head.appendChild(style);
                this._styleEl = style;
            }
        },

        _applyTabTitle() {
            if (this._titleObserver) { this._titleObserver.disconnect(); this._titleObserver = null; }
            if (this._titleDebounce) { clearTimeout(this._titleDebounce); this._titleDebounce = null; }
            if (!this.features.tabTitle.enabled) return;

            const updateTitle = () => {
                const heading = document.querySelector('h1.conversation-title, [data-test-id="conversation-title"]');
                if (heading && heading.textContent.trim()) {
                    const text = heading.textContent.trim();
                    if (text !== 'Conversation with Gemini' && text !== document.title) {
                        document.title = text + ' - Gemini';
                    }
                } else {
                    const firstMsg = document.querySelector('.user-query-text, .query-text');
                    if (firstMsg && firstMsg.textContent.trim()) {
                        const t = firstMsg.textContent.trim().substring(0, 50);
                        if (document.title === 'Google Gemini') {
                            document.title = t + '... - Gemini';
                        }
                    }
                }
            };

            const debouncedUpdate = () => {
                if (this._titleDebounce) clearTimeout(this._titleDebounce);
                this._titleDebounce = setTimeout(updateTitle, TIMINGS.TITLE_DEBOUNCE);
            };

            updateTitle();
            this._titleObserver = new MutationObserver(debouncedUpdate);
            const chatContainer = document.querySelector('main, .chat-container, [role="main"]');
            this._titleObserver.observe(chatContainer || document.body, {
                childList: true, subtree: true, characterData: true,
            });
        },

        _applyCtrlEnter() {
            if (this._keyHandler) {
                document.removeEventListener('keydown', this._keyHandler, true);
                this._keyHandler = null;
            }
            if (!this.features.ctrlEnter.enabled) return;

            this._keyHandler = (e) => {
                if (e.key !== 'Enter') return;
                const target = e.target;
                if (!target.closest('.ql-editor, [contenteditable="true"]')) return;
                if (e.isComposing) return;

                if (!e.ctrlKey && !e.metaKey) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                } else {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    const sendBtn = document.querySelector('button.send-button, button[aria-label*="Send"]');
                    if (sendBtn && !sendBtn.disabled) sendBtn.click();
                }
            };
            document.addEventListener('keydown', this._keyHandler, true);
        },

        toggleFeature(key) {
            if (!this.features[key]) return;
            this.features[key].enabled = !this.features[key].enabled;
            this._save();
            this._applyAll();
        },

        setFeatureValue(key, value) {
            if (!this.features[key]) return;
            this.features[key].value = value;
            this._save();
            this._applyAll();
        },

        renderToSettings(container) {
            Object.keys(this.features).forEach(key => {
                const feat = this.features[key];
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 0;';

                const labelEl = document.createElement('span');
                labelEl.style.cssText = 'font-size:13px;color:var(--text-main);';
                labelEl.textContent = feat.label;
                row.appendChild(labelEl);

                const rightSide = document.createElement('div');
                rightSide.style.cssText = 'display:flex;align-items:center;gap:8px;';

                if (feat.value !== undefined) {
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.value = feat.value;
                    input.style.cssText = 'width:60px;background:var(--input-bg,rgba(255,255,255,0.1));color:var(--text-main);border:1px solid var(--border);border-radius:4px;padding:2px 6px;font-size:12px;text-align:center;';
                    input.onchange = () => {
                        const v = parseInt(input.value, 10);
                        if (v > 0) this.setFeatureValue(key, v);
                    };
                    const unit = document.createElement('span');
                    unit.style.cssText = 'font-size:11px;color:var(--text-sub);';
                    unit.textContent = 'px';
                    rightSide.appendChild(input);
                    rightSide.appendChild(unit);
                }

                const toggle = document.createElement('div');
                toggle.className = 'toggle-switch ' + (feat.enabled ? 'on' : '');
                toggle.onclick = () => {
                    this.toggleFeature(key);
                    toggle.classList.toggle('on');
                };
                rightSide.appendChild(toggle);

                row.appendChild(rightSide);
                container.appendChild(row);
            });
        },
    };
}

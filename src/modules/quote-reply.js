// src/modules/quote-reply.js — Quote selected text into input

import { TIMINGS, PANEL_ID } from '../core/constants.js';

export function createQuoteReplyModule({ Logger }) {
    return {
        id: 'quote-reply',
        name: '引用回复',
        description: '选中文本后快速插入引用到输入框',
        icon: '💬',
        defaultEnabled: false,

        _fab: null,
        _boundMouseUp: null,
        _boundMouseDown: null,

        init() {
            this._boundMouseUp = this._onMouseUp.bind(this);
            this._boundMouseDown = this._onMouseDown.bind(this);
            document.addEventListener('mouseup', this._boundMouseUp, true);
            document.addEventListener('mousedown', this._boundMouseDown, true);
            Logger.info('QuoteReplyModule initialized');
        },

        destroy() {
            if (this._boundMouseUp) {
                document.removeEventListener('mouseup', this._boundMouseUp, true);
                this._boundMouseUp = null;
            }
            if (this._boundMouseDown) {
                document.removeEventListener('mousedown', this._boundMouseDown, true);
                this._boundMouseDown = null;
            }
            this._removeFab();
        },

        onUserChange() {},

        _onMouseDown(e) {
            if (this._fab && this._fab.contains(e.target)) return;
            this._removeFab();
        },

        _onMouseUp(e) {
            setTimeout(() => {
                const sel = window.getSelection();
                if (!sel || sel.isCollapsed || !sel.toString().trim()) return;

                const range = sel.getRangeAt(0);
                const container = range.commonAncestorContainer;
                const el = container.nodeType === 3 ? container.parentElement : container;
                if (!el) return;
                if (el.closest('#' + PANEL_ID)) return;
                if (el.closest('.ql-editor')) return;

                const text = sel.toString().trim();
                if (!text || text.length < 2) return;
                this._showFab(e.clientX, e.clientY, text);
            }, 50);
        },

        _showFab(x, y, text) {
            this._removeFab();
            const fab = document.createElement('div');
            fab.style.cssText = [
                'position:fixed', 'z-index:2147483646',
                'background:var(--accent, #8ab4f8)', 'color:#fff',
                'padding:4px 10px', 'border-radius:14px',
                'font-size:12px', 'font-weight:600', 'cursor:pointer',
                'box-shadow:0 2px 8px rgba(0,0,0,0.3)', 'user-select:none',
                'transition:opacity 0.15s, transform 0.15s',
                'opacity:0', 'transform:scale(0.9)',
            ].join(';');
            fab.textContent = '💬 Quote';

            const fabW = 80, fabH = 28;
            fab.style.left = Math.min(x + 8, window.innerWidth - fabW - 10) + 'px';
            fab.style.top = Math.max(y - fabH - 8, 10) + 'px';

            fab.onclick = (e) => {
                e.stopPropagation();
                this._insertQuote(text);
                this._removeFab();
            };

            document.body.appendChild(fab);
            this._fab = fab;
            requestAnimationFrame(() => {
                fab.style.opacity = '1';
                fab.style.transform = 'scale(1)';
            });
            setTimeout(() => {
                if (this._fab === fab) this._removeFab();
            }, TIMINGS.FAB_AUTO_DISMISS);
        },

        _removeFab() {
            if (this._fab) {
                this._fab.remove();
                this._fab = null;
            }
        },

        _insertQuote(text) {
            const editor = document.querySelector('div.ql-editor[contenteditable="true"]');
            if (!editor) {
                Logger.warn('QuoteReply: editor not found');
                return;
            }
            const quoted = text.split('\n').map(line => '> ' + line).join('\n');
            const fullText = quoted + '\n\n';
            const isBlank = editor.classList.contains('ql-blank') ||
                (editor.textContent.trim() === '' && editor.children.length <= 1);
            if (isBlank) {
                editor.replaceChildren();
                editor.classList.remove('ql-blank');
            }
            fullText.split('\n').forEach(line => {
                const p = document.createElement('p');
                if (line === '') p.appendChild(document.createElement('br'));
                else p.textContent = line;
                editor.appendChild(p);
            });
            editor.dispatchEvent(new Event('input', { bubbles: true }));
            editor.focus();
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            Logger.info('Quote inserted', { length: text.length });
        },
    };
}

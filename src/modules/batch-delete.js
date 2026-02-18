// src/modules/batch-delete.js — Batch delete conversations from sidebar

import { SELECTORS } from '../core/selectors.js';

export function createBatchDeleteModule({ Core, Logger, getPanelUI }) {
    return {
        id: 'batch-delete',
        name: '批量删除',
        description: '批量选择并删除侧栏对话',
        icon: '🗑️',
        defaultEnabled: false,

        _selected: new Set(),
        _deleting: false,
        _progress: { current: 0, total: 0 },

        init() {
            this._selected = new Set();
            Logger.info('BatchDeleteModule initialized');
        },

        destroy() {
            this._selected.clear();
            this._deleting = false;
        },

        onUserChange() {
            this._selected.clear();
        },

        _scanChats() {
            return Core.scanSidebarChats();
        },

        async _deleteChat(chatElement) {
            try {
                chatElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                await Core.sleep(300);

                const moreSelector = SELECTORS.CHAT_MORE_BUTTON.join(', ');
                let menuBtn = chatElement.querySelector(moreSelector);
                if (!menuBtn) {
                    const parent = chatElement.closest('mat-list-item, [role="listitem"]') || chatElement.parentElement;
                    menuBtn = parent?.querySelector(moreSelector);
                }
                if (!menuBtn) throw new Error('Menu button not found');
                (menuBtn.closest('button') || menuBtn).click();
                await Core.sleep(400);

                const menuItems = document.querySelectorAll(SELECTORS.MENU_ITEMS);
                const deleteTexts = ['delete', '删除', '削除', '삭제', 'supprimer', 'eliminar', 'löschen'];
                let deleteBtn = null;
                menuItems.forEach(item => {
                    const text = item.textContent.trim().toLowerCase();
                    if (deleteTexts.some(t => text.includes(t))) deleteBtn = item;
                });
                if (!deleteBtn) throw new Error('Delete option not found');
                deleteBtn.click();
                await Core.sleep(400);

                const confirmBtns = document.querySelectorAll(SELECTORS.CONFIRM_BUTTONS);
                const confirmTexts = ['delete', '删除', '削除', '삭제', 'confirm', '确认', '確認', 'supprimer', 'eliminar', 'löschen'];
                let confirmed = false;
                confirmBtns.forEach(btn => {
                    const text = btn.textContent.trim().toLowerCase();
                    if (confirmTexts.some(t => text.includes(t))) {
                        btn.click();
                        confirmed = true;
                    }
                });
                if (!confirmed) throw new Error('Confirm button not found');
                await Core.sleep(300);
                return true;
            } catch (e) {
                Logger.warn('Delete failed', { error: e.message });
                document.body.click();
                await Core.sleep(200);
                return false;
            }
        },

        async _batchDelete() {
            if (this._deleting || this._selected.size === 0) return;
            this._deleting = true;
            this._progress = { current: 0, total: this._selected.size };

            const chats = this._scanChats();
            const toDelete = chats.filter(c => this._selected.has(c.id));
            let deleted = 0, failed = 0;

            for (const chat of toDelete) {
                this._progress.current++;
                getPanelUI().renderDetailsPane();
                const ok = await this._deleteChat(chat.element);
                if (ok) { deleted++; this._selected.delete(chat.id); }
                else failed++;
                await Core.sleep(500);
            }

            this._deleting = false;
            this._selected.clear();
            Logger.info('Batch delete complete', { deleted, failed });
            getPanelUI().renderDetailsPane();
        },

        renderToDetailsPane(container) {
            const section = document.createElement('div');
            section.className = 'gf-section';

            // Header
            const header = document.createElement('div');
            header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
            const title = document.createElement('div');
            title.style.cssText = 'font-weight:600;font-size:13px;color:var(--text-main);';
            title.textContent = '🗑️ Batch Delete';
            header.appendChild(title);

            if (this._deleting) {
                const progress = document.createElement('span');
                progress.style.cssText = 'font-size:11px;color:var(--accent);';
                progress.textContent = 'Deleting ' + this._progress.current + '/' + this._progress.total + '...';
                header.appendChild(progress);
            } else if (this._selected.size > 0) {
                const deleteBtn = document.createElement('button');
                deleteBtn.style.cssText = 'background:#ea4335;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;';
                deleteBtn.textContent = 'Delete ' + this._selected.size + ' chats';
                deleteBtn.onclick = () => {
                    if (confirm('确认删除选中的 ' + this._selected.size + ' 个对话？此操作不可撤销。')) {
                        this._batchDelete();
                    }
                };
                header.appendChild(deleteBtn);
            }
            section.appendChild(header);

            // Chat list
            const chats = this._scanChats();
            if (chats.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'font-size:12px;color:var(--text-sub);text-align:center;padding:12px;';
                empty.textContent = '侧栏中未发现对话项';
                section.appendChild(empty);
            } else {
                this._renderChatList(section, chats);
            }

            container.appendChild(section);
        },

        _renderChatList(section, chats) {
            const list = document.createElement('div');
            list.style.cssText = 'max-height:200px;overflow-y:auto;';

            chats.forEach(chat => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:4px;cursor:pointer;font-size:12px;color:var(--text-main);';
                row.onmouseenter = () => { row.style.background = 'var(--row-hover)'; };
                row.onmouseleave = () => { row.style.background = ''; };

                const isChecked = this._selected.has(chat.id);
                const check = document.createElement('div');
                check.style.cssText = 'width:16px;height:16px;border-radius:3px;border:2px solid ' +
                    (isChecked ? 'var(--accent)' : 'var(--text-sub)') +
                    ';background:' + (isChecked ? 'var(--accent)' : 'transparent') +
                    ';flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;';
                check.textContent = isChecked ? '✓' : '';

                const label = document.createElement('span');
                label.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;';
                label.textContent = chat.title;

                row.onclick = () => {
                    if (this._selected.has(chat.id)) this._selected.delete(chat.id);
                    else this._selected.add(chat.id);
                    getPanelUI().renderDetailsPane();
                };
                row.appendChild(check);
                row.appendChild(label);
                list.appendChild(row);
            });
            section.appendChild(list);

            // Select/Deselect all
            if (!this._deleting) {
                const actions = document.createElement('div');
                actions.style.cssText = 'display:flex;gap:8px;margin-top:6px;';
                const mkBtn = (text, fn) => {
                    const b = document.createElement('button');
                    b.style.cssText = 'background:var(--btn-bg);color:var(--text-main);border:1px solid var(--border);border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;';
                    b.textContent = text;
                    b.onclick = fn;
                    return b;
                };
                actions.appendChild(mkBtn('Select All', () => {
                    chats.forEach(c => this._selected.add(c.id));
                    getPanelUI().renderDetailsPane();
                }));
                actions.appendChild(mkBtn('Deselect All', () => {
                    this._selected.clear();
                    getPanelUI().renderDetailsPane();
                }));
                section.appendChild(actions);
            }
        },
    };
}

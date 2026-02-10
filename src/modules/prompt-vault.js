// src/modules/prompt-vault.js — Save and quick-insert prompt templates

export function createPromptVaultModule({ storage, Core, Logger, getPanelUI, applyTheme, getTheme }) {
    const BASE_KEY = 'gemini_prompt_vault';

    function getStorageKey() {
        const user = Core.getCurrentUser();
        return user && user.includes('@') ? `${BASE_KEY}_${user}` : BASE_KEY;
    }

    return {
        id: 'prompt-vault',
        name: '提示词金库',
        description: '保存和快速插入常用 Prompt 模板',
        icon: '💎',
        defaultEnabled: false,

        _prompts: [],

        init() {
            this._prompts = storage.get(getStorageKey(), []);
            Logger.info('PromptVaultModule initialized', { count: this._prompts.length });
        },

        destroy() {},

        onUserChange() {
            this._prompts = storage.get(getStorageKey(), []);
            getPanelUI().renderDetailsPane();
        },

        _save() {
            storage.set(getStorageKey(), this._prompts);
        },

        addPrompt(name, content, category) {
            this._prompts.push({
                id: 'p_' + Date.now(),
                name: name || 'Untitled',
                content: content || '',
                category: category || 'General',
                createdAt: new Date().toISOString(),
            });
            this._save();
        },

        deletePrompt(id) {
            this._prompts = this._prompts.filter(p => p.id !== id);
            this._save();
        },

        updatePrompt(id, updates) {
            const p = this._prompts.find(p => p.id === id);
            if (p) Object.assign(p, updates);
            this._save();
        },

        insertPrompt(content) {
            const editor = document.querySelector('div.ql-editor[contenteditable="true"]');
            if (!editor) return;
            editor.focus();
            const p = document.createElement('p');
            p.textContent = content;
            editor.appendChild(p);
            editor.dispatchEvent(new Event('input', { bubbles: true }));
            const prompt = this._prompts.find(pr => pr.content === content);
            if (prompt) {
                prompt.usedCount = (prompt.usedCount || 0) + 1;
                prompt.lastUsedAt = new Date().toISOString();
                this._save();
            }
            Logger.info('Prompt inserted');
        },

        renderToDetailsPane(container) {
            const title = document.createElement('div');
            title.className = 'section-title';
            title.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
            const titleText = document.createElement('span');
            titleText.textContent = 'Prompt Vault';
            const addBtn = document.createElement('span');
            addBtn.style.cssText = 'font-size:12px;cursor:pointer;opacity:0.6;';
            addBtn.textContent = '+';
            addBtn.title = 'Add new prompt';
            addBtn.onclick = (e) => { e.stopPropagation(); this.showPromptEditor(null); };
            title.appendChild(titleText);
            title.appendChild(addBtn);
            container.appendChild(title);

            if (this._prompts.length === 0) {
                const hint = document.createElement('div');
                hint.style.cssText = 'font-size:10px;color:var(--text-sub);opacity:0.6;padding:4px 8px;';
                hint.textContent = 'No saved prompts. Click + to add.';
                container.appendChild(hint);
                return;
            }

            const categories = {};
            this._prompts.forEach(p => {
                const cat = p.category || 'General';
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(p);
            });

            Object.entries(categories).forEach(([catName, prompts]) => {
                const catLabel = document.createElement('div');
                catLabel.style.cssText = 'font-size:9px;color:var(--text-sub);opacity:0.5;padding:4px 8px 2px;text-transform:uppercase;letter-spacing:0.5px;';
                catLabel.textContent = catName;
                container.appendChild(catLabel);

                prompts.forEach(p => {
                    const row = document.createElement('div');
                    row.className = 'detail-row';
                    row.title = p.content.length > 100 ? p.content.slice(0, 100) + '...' : p.content;

                    const nameEl = document.createElement('span');
                    nameEl.style.cssText = 'flex:1;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                    nameEl.textContent = p.name;

                    const actions = document.createElement('div');
                    actions.style.cssText = 'display:flex;gap:4px;opacity:0;';
                    row.onmouseenter = () => { actions.style.opacity = '1'; };
                    row.onmouseleave = () => { actions.style.opacity = '0'; };

                    const mkAction = (icon, titleText, fn) => {
                        const el = document.createElement('span');
                        el.style.cssText = 'cursor:pointer;font-size:10px;';
                        el.textContent = icon;
                        el.title = titleText;
                        el.onclick = (e) => { e.stopPropagation(); fn(); };
                        return el;
                    };

                    actions.appendChild(mkAction('📋', 'Insert', () => this.insertPrompt(p.content)));
                    actions.appendChild(mkAction('✏️', 'Edit', () => this.showPromptEditor(p)));
                    actions.appendChild(mkAction('🗑️', 'Delete', () => {
                        this.deletePrompt(p.id);
                        getPanelUI().renderDetailsPane();
                    }));

                    row.appendChild(nameEl);
                    row.appendChild(actions);
                    row.onclick = (e) => { e.stopPropagation(); this.insertPrompt(p.content); };
                    container.appendChild(row);
                });
            });
        },

        showPromptEditor(existing) {
            const overlay = document.createElement('div');
            overlay.className = 'settings-overlay';
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

            const modal = document.createElement('div');
            modal.className = 'settings-modal';
            applyTheme(modal, getTheme());

            const header = document.createElement('div');
            header.className = 'settings-header';
            const h3 = document.createElement('h3');
            h3.textContent = existing ? 'Edit Prompt' : 'New Prompt';
            const closeBtn = document.createElement('span');
            closeBtn.className = 'settings-close';
            closeBtn.textContent = '\u2715';
            closeBtn.onclick = () => overlay.remove();
            header.appendChild(h3);
            header.appendChild(closeBtn);

            const body = document.createElement('div');
            body.className = 'settings-body';

            const nameInput = document.createElement('input');
            nameInput.className = 'settings-select';
            nameInput.style.cssText = 'width:100%;margin-bottom:8px;padding:8px;box-sizing:border-box;';
            nameInput.placeholder = 'Prompt name';
            nameInput.value = existing ? existing.name : '';

            const catInput = document.createElement('input');
            catInput.className = 'settings-select';
            catInput.style.cssText = 'width:100%;margin-bottom:8px;padding:8px;box-sizing:border-box;';
            catInput.placeholder = 'Category (e.g. Coding, Writing)';
            catInput.value = existing ? existing.category : 'General';

            const contentArea = document.createElement('textarea');
            contentArea.style.cssText = 'width:100%;height:120px;padding:8px;font-size:12px;border-radius:6px;border:1px solid var(--border,rgba(255,255,255,0.1));background:var(--input-bg,rgba(255,255,255,0.05));color:var(--text-main,#fff);resize:vertical;box-sizing:border-box;font-family:inherit;';
            contentArea.placeholder = 'Enter your prompt template...';
            contentArea.value = existing ? existing.content : '';

            const saveBtn = document.createElement('button');
            saveBtn.className = 'settings-btn';
            saveBtn.style.cssText = 'background:var(--accent,#8ab4f8);color:#000;font-weight:500;margin-top:8px;';
            saveBtn.textContent = existing ? 'Save' : 'Create';
            saveBtn.onclick = () => {
                const name = nameInput.value.trim() || 'Untitled';
                const content = contentArea.value.trim();
                const category = catInput.value.trim() || 'General';
                if (!content) return;
                if (existing) this.updatePrompt(existing.id, { name, content, category });
                else this.addPrompt(name, content, category);
                overlay.remove();
                getPanelUI().renderDetailsPane();
            };

            body.appendChild(nameInput);
            body.appendChild(catInput);
            body.appendChild(contentArea);
            body.appendChild(saveBtn);
            modal.appendChild(header);
            modal.appendChild(body);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            nameInput.focus();
        },
    };
}

// src/modules/folders.js — Organize conversations into custom folders

import { TIMINGS, TEMP_USER } from '../core/constants.js';

export function createFoldersModule({ storage, Core, Logger, getPanelUI, getCounterModule, applyTheme, getTheme, injectStyles: injectCSS }) {
    const STORAGE_KEY = 'gemini_folders_data';
    const FOLDER_COLORS = ['#8ab4f8', '#81c995', '#f28b82', '#fdd663', '#d7aefb', '#78d9ec', '#fcad70', '#c58af9'];

    return {
        id: 'folders',
        name: '对话文件夹',
        description: '整理对话到自定义文件夹',
        icon: '📁',
        defaultEnabled: false,

        FOLDER_COLORS,

        data: {
            folders: {},
            chatToFolder: {},
            folderOrder: [],
        },
        observer: null,
        chatCache: [],
        dragState: null,
        folderDragState: null,
        uncategorizedCollapsed: false,
        _searchQuery: '',
        _batchMode: false,
        _batchSelected: new Set(),
        _markTimeout: null,

        // --- Lifecycle ---
        init() {
            this.loadData();
            this.injectStyles();
            this.startObserver();
            Logger.info('FoldersModule initialized', { mode: 'pure' });
        },

        destroy() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            document.querySelectorAll('.gf-sidebar-dot').forEach(el => el.remove());
            document.querySelectorAll('.gf-modal-overlay').forEach(el => el.remove());

            if (this.chatCache) {
                this.chatCache.forEach(chat => {
                    if (chat.element) {
                        chat.element.removeAttribute('draggable');
                        chat.element.ondragstart = null;
                        chat.element.ondragend = null;
                        chat.element.style.opacity = '';
                    }
                });
            }
            document.querySelectorAll('.gf-drop-highlight').forEach(el => {
                el.classList.remove('gf-drop-highlight');
            });
            Logger.info('FoldersModule destroyed');
        },

        onUserChange() {
            this.loadData();
            this.markSidebarChats();
            if (getCounterModule().state.isExpanded) {
                getPanelUI().renderDetailsPane();
            }
        },

        // --- Data Management ---
        loadData() {
            const user = Core.getCurrentUser();
            const key = user && user !== TEMP_USER ? `${STORAGE_KEY}_${user}` : STORAGE_KEY;
            const saved = storage.get(key, null);
            if (saved) {
                this.data = {
                    folders: saved.folders || {},
                    chatToFolder: saved.chatToFolder || {},
                    folderOrder: saved.folderOrder || Object.keys(saved.folders || {}),
                };
            } else {
                this.data = { folders: {}, chatToFolder: {}, folderOrder: [] };
            }
        },

        saveData() {
            const user = Core.getCurrentUser();
            const key = user && user !== TEMP_USER ? `${STORAGE_KEY}_${user}` : STORAGE_KEY;
            storage.set(key, this.data);
        },

        // --- Folder CRUD ---
        createFolder(name, color) {
            const id = 'folder_' + Date.now();
            this.data.folders[id] = {
                name: name || 'New Folder',
                color: color || FOLDER_COLORS[Object.keys(this.data.folders).length % FOLDER_COLORS.length],
                collapsed: false,
                rules: [],
            };
            this.data.folderOrder.push(id);
            this.saveData();
            this.markSidebarChats();
            getPanelUI().renderDetailsPane();
            return id;
        },

        renameFolder(folderId, newName) {
            if (this.data.folders[folderId]) {
                this.data.folders[folderId].name = newName;
                this.saveData();
                getPanelUI().renderDetailsPane();
            }
        },

        deleteFolder(folderId) {
            if (!this.data.folders[folderId]) return;
            Object.keys(this.data.chatToFolder).forEach(chatId => {
                if (this.data.chatToFolder[chatId] === folderId) {
                    delete this.data.chatToFolder[chatId];
                }
            });
            delete this.data.folders[folderId];
            this.data.folderOrder = this.data.folderOrder.filter(id => id !== folderId);
            this.saveData();
            this.markSidebarChats();
            getPanelUI().renderDetailsPane();
        },

        toggleFolderCollapse(folderId) {
            if (this.data.folders[folderId]) {
                this.data.folders[folderId].collapsed = !this.data.folders[folderId].collapsed;
                this.saveData();
                getPanelUI().renderDetailsPane();
            }
        },

        setFolderColor(folderId, color) {
            if (this.data.folders[folderId]) {
                this.data.folders[folderId].color = color;
                this.saveData();
                this.markSidebarChats();
                getPanelUI().renderDetailsPane();
            }
        },

        toggleFolderPin(folderId) {
            if (this.data.folders[folderId]) {
                this.data.folders[folderId].pinned = !this.data.folders[folderId].pinned;
                this.saveData();
                getPanelUI().renderDetailsPane();
            }
        },

        moveChatToFolder(chatId, folderId) {
            if (folderId === null) {
                delete this.data.chatToFolder[chatId];
            } else {
                this.data.chatToFolder[chatId] = folderId;
            }
            this.saveData();
            this.markSidebarChats();
            getPanelUI().renderDetailsPane();
        },

        reorderFolder(draggedId, targetId, position) {
            const order = this.data.folderOrder.filter(id => id !== draggedId);
            const targetIdx = order.indexOf(targetId);
            if (targetIdx === -1) return;
            const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
            order.splice(insertIdx, 0, draggedId);
            this.data.folderOrder = order;
            this.saveData();
            getPanelUI().renderDetailsPane();
        },

        batchMoveToFolder(targetFolderId) {
            this._batchSelected.forEach(chatId => {
                if (targetFolderId === null) {
                    delete this.data.chatToFolder[chatId];
                } else {
                    this.data.chatToFolder[chatId] = targetFolderId;
                }
            });
            this._batchSelected.clear();
            this._batchMode = false;
            this.saveData();
            this.markSidebarChats();
            getPanelUI().renderDetailsPane();
        },

        getFolderStats(folderId) {
            const chatIds = Object.entries(this.data.chatToFolder)
                .filter(([, fid]) => fid === folderId)
                .map(([cid]) => cid);
            return { chatCount: chatIds.length };
        },

        setFolderRules(folderId, rules) {
            if (this.data.folders[folderId]) {
                this.data.folders[folderId].rules = rules;
                this.saveData();
            }
        },

        autoClassify() {
            let classified = 0;
            this.scanSidebarChats();
            this.chatCache.forEach(chat => {
                if (this.data.chatToFolder[chat.id]) return;
                const title = chat.title.toLowerCase();
                for (const folderId of this.data.folderOrder) {
                    const folder = this.data.folders[folderId];
                    if (!folder || !folder.rules || folder.rules.length === 0) continue;
                    const matched = folder.rules.some(rule => {
                        if (rule.type === 'keyword' && rule.value) {
                            return title.includes(rule.value.toLowerCase());
                        }
                        if (rule.type === 'regex' && rule.value) {
                            try {
                                const regex = new RegExp(rule.value, 'i');
                                return regex.test(chat.title.substring(0, 500));
                            } catch { return false; }
                        }
                        return false;
                    });
                    if (matched) {
                        this.data.chatToFolder[chat.id] = folderId;
                        classified++;
                        break;
                    }
                }
            });
            if (classified > 0) {
                this.saveData();
                this.markSidebarChats();
                getPanelUI().renderDetailsPane();
                Logger.info(`Auto-classified ${classified} chats`);
            }
            return classified;
        },

        // --- Sidebar Scanning ---
        scanSidebarChats() {
            this.chatCache = Core.scanSidebarChats();
            return this.chatCache;
        },

        // --- Sidebar Color Dots ---
        markSidebarChats() {
            document.querySelectorAll('.gf-sidebar-dot').forEach(el => el.remove());
            const chats = this.scanSidebarChats();

            chats.forEach(chat => {
                const folderId = this.data.chatToFolder[chat.id];
                if (folderId && this.data.folders[folderId]) {
                    const folder = this.data.folders[folderId];
                    const dot = document.createElement('span');
                    dot.className = 'gf-sidebar-dot';
                    dot.style.cssText = `display:inline-block;width:6px;height:6px;border-radius:50%;background:${folder.color};margin-right:6px;flex-shrink:0;vertical-align:middle;`;
                    dot.title = folder.name;
                    chat.element.insertBefore(dot, chat.element.firstChild);
                }
            });

            this.enableSidebarDrag();
        },

        // --- Sidebar Drag ---
        enableSidebarDrag() {
            const chats = this.chatCache;
            chats.forEach(chat => {
                chat.element.setAttribute('draggable', 'true');
                chat.element.ondragstart = (e) => {
                    this.dragState = { chatId: chat.id, chatTitle: chat.title };
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', chat.id);
                    chat.element.style.opacity = '0.5';
                };
                chat.element.ondragend = () => {
                    chat.element.style.opacity = '';
                    this.dragState = null;
                    document.querySelectorAll('.gf-drop-highlight').forEach(el => {
                        el.classList.remove('gf-drop-highlight');
                    });
                };
            });
        },

        // --- DOM Observer ---
        startObserver() {
            setTimeout(() => this.markSidebarChats(), TIMINGS.POLL_INTERVAL);

            this.observer = new MutationObserver(() => {
                clearTimeout(this._markTimeout);
                this._markTimeout = setTimeout(() => this.markSidebarChats(), TIMINGS.OBSERVER_DEBOUNCE);
            });

            const sidebar = document.querySelector('bard-sidenav-container, nav, [role="navigation"]');
            const target = sidebar || document.body;
            this.observer.observe(target, { childList: true, subtree: true });
        },

        // --- Inject Styles ---
        injectStyles() {
            const css = `
                .gf-modal-overlay {
                    position:fixed;top:0;left:0;width:100vw;height:100vh;
                    background:var(--overlay-tint,rgba(0,0,0,0.6));
                    z-index:2147483646;display:flex;align-items:center;justify-content:center;
                }
                .gf-modal {
                    width:280px;background:var(--bg,#202124);
                    border:1px solid var(--border,rgba(255,255,255,0.1));
                    border-radius:16px;padding:20px;box-shadow:0 8px 32px rgba(0,0,0,0.5);
                }
                .gf-modal-title { font-size:16px;font-weight:500;color:var(--text-main,#e8eaed);margin-bottom:16px; }
                .gf-modal-input {
                    width:100%;padding:10px 12px;border:1px solid var(--border,rgba(255,255,255,0.1));
                    border-radius:8px;background:var(--input-bg,rgba(255,255,255,0.05));
                    color:var(--text-main,#e8eaed);font-size:14px;margin-bottom:12px;box-sizing:border-box;
                }
                .gf-modal-input:focus { outline:none;border-color:var(--accent,#8ab4f8); }
                .gf-modal-colors { display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px; }
                .gf-color-option {
                    width:28px;height:28px;border-radius:50%;cursor:pointer;
                    border:2px solid transparent;transition:transform 0.2s,border-color 0.2s;
                }
                .gf-color-option:hover { transform:scale(1.1); }
                .gf-color-option.selected { border-color:#fff; }
                .gf-modal-actions { display:flex;gap:8px;justify-content:flex-end; }
                .gf-modal-btn {
                    padding:8px 16px;border:none;border-radius:8px;font-size:13px;cursor:pointer;transition:all 0.2s;
                }
                .gf-modal-btn.primary { background:var(--accent,#8ab4f8);color:#000; }
                .gf-modal-btn.secondary { background:var(--btn-bg,rgba(255,255,255,0.1));color:var(--text-main,#e8eaed); }
                .gf-modal-btn.danger { background:rgba(242,139,130,0.2);color:#f28b82; }
                .gf-modal-btn:hover { filter:brightness(1.1); }
                .gf-folder-row {
                    display:flex;align-items:center;padding:6px 8px;margin:2px 0;
                    border-radius:6px;cursor:pointer;transition:background 0.2s;
                }
                .gf-folder-row:hover { background:var(--row-hover,rgba(255,255,255,0.08)); }
                .gf-folder-row.drop-active { background:rgba(138,180,248,0.2)!important;outline:2px dashed rgba(138,180,248,0.5); }
                .gf-folder-dot { width:10px;height:10px;border-radius:3px;margin-right:8px;flex-shrink:0; }
                .gf-folder-label { flex:1;font-size:11px;color:var(--text-main,#e8eaed);overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
                .gf-folder-badge { font-size:9px;color:var(--text-sub,#9aa0a6);margin-left:4px; }
                .gf-folder-toggle { font-size:8px;color:var(--text-sub,#9aa0a6);margin-left:4px;transition:transform 0.2s; }
                .gf-folder-row.collapsed .gf-folder-toggle { transform:rotate(-90deg); }
                .gf-folder-actions { display:none;gap:2px;margin-left:4px; }
                .gf-folder-row:hover .gf-folder-actions { display:flex; }
                .gf-folder-action { font-size:10px;padding:2px;cursor:pointer;opacity:0.6; }
                .gf-folder-action:hover { opacity:1; }
                .gf-chat-row {
                    display:flex;align-items:center;padding:4px 8px 4px 20px;margin:1px 0;
                    border-radius:4px;cursor:pointer;transition:background 0.2s;
                    font-size:10px;color:var(--text-sub,#9aa0a6);
                }
                .gf-chat-row:hover { background:var(--row-hover,rgba(255,255,255,0.08));color:var(--text-main,#e8eaed); }
                .gf-chat-title { flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
                .gf-chat-remove { font-size:9px;opacity:0;cursor:pointer;padding:2px; }
                .gf-chat-row:hover .gf-chat-remove { opacity:0.6; }
                .gf-chat-remove:hover { opacity:1; }
                .gf-add-btn {
                    display:flex;align-items:center;justify-content:center;gap:4px;padding:6px;margin-top:4px;
                    border:1px dashed var(--divider,rgba(255,255,255,0.15));border-radius:6px;
                    background:transparent;color:var(--text-sub,#9aa0a6);font-size:10px;cursor:pointer;
                    transition:all 0.2s;width:100%;
                }
                .gf-add-btn:hover { background:var(--input-bg,rgba(255,255,255,0.05));border-color:var(--border,rgba(255,255,255,0.25));color:var(--text-main,#e8eaed); }
                .gf-drop-highlight { background:rgba(138,180,248,0.15)!important; }
                .gf-folder-row[draggable="true"] { cursor:grab; }
                .gf-folder-row.dragging { opacity:0.4; }
                .gf-folder-row.drag-above { border-top:2px solid var(--accent,#8ab4f8); }
                .gf-folder-row.drag-below { border-bottom:2px solid var(--accent,#8ab4f8); }
                .gf-uncategorized-header {
                    display:flex;align-items:center;gap:6px;padding:6px 8px;margin-top:6px;
                    font-size:10px;color:var(--text-sub,#9aa0a6);opacity:0.7;cursor:pointer;
                    border-radius:6px;transition:background 0.2s;
                }
                .gf-uncategorized-header:hover { background:var(--row-hover,rgba(255,255,255,0.08));opacity:1; }
                .gf-batch-bar { display:flex;align-items:center;gap:4px;padding:4px 8px;margin-bottom:4px;font-size:10px;color:var(--text-sub,#9aa0a6); }
                .gf-batch-bar button {
                    font-size:9px;padding:2px 6px;border-radius:4px;
                    border:1px solid var(--divider,rgba(255,255,255,0.1));
                    background:var(--btn-bg,rgba(255,255,255,0.05));color:var(--text-sub,#9aa0a6);cursor:pointer;
                }
                .gf-batch-bar button:hover { color:var(--text-main,#fff); }
                .gf-chat-row.batch-selected { background:rgba(138,180,248,0.15); }
                .gf-batch-check { width:12px;height:12px;border:1px solid var(--text-sub,#9aa0a6);border-radius:3px;margin-right:6px;flex-shrink:0;cursor:pointer; }
                .gf-batch-check.checked { background:var(--accent,#8ab4f8);border-color:var(--accent,#8ab4f8); }
            `;
            injectCSS(css);
        },

        // --- Render to Details Pane ---
        renderToDetailsPane(container) {
            const title = document.createElement('div');
            title.className = 'section-title';
            title.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
            const titleText = document.createElement('span');
            titleText.textContent = 'Folders';
            const batchToggle = document.createElement('span');
            batchToggle.style.cssText = 'font-size:9px;cursor:pointer;opacity:0.6;';
            batchToggle.textContent = this._batchMode ? '✕ Cancel' : '☑ Select';
            batchToggle.onclick = (e) => {
                e.stopPropagation();
                this._batchMode = !this._batchMode;
                this._batchSelected.clear();
                getPanelUI().renderDetailsPane();
            };
            title.appendChild(titleText);
            title.appendChild(batchToggle);
            container.appendChild(title);

            // Batch action bar
            if (this._batchMode && this._batchSelected.size > 0) {
                const batchBar = document.createElement('div');
                batchBar.className = 'gf-batch-bar';
                const countLabel = document.createElement('span');
                countLabel.textContent = `${this._batchSelected.size} selected`;
                batchBar.appendChild(countLabel);

                this.data.folderOrder.forEach(fid => {
                    const f = this.data.folders[fid];
                    if (!f) return;
                    const btn = document.createElement('button');
                    btn.textContent = `→ ${f.name}`;
                    btn.onclick = () => this.batchMoveToFolder(fid);
                    batchBar.appendChild(btn);
                });
                const unassignBtn = document.createElement('button');
                unassignBtn.textContent = '→ None';
                unassignBtn.onclick = () => this.batchMoveToFolder(null);
                batchBar.appendChild(unassignBtn);
                container.appendChild(batchBar);
            }

            // Search bar
            const searchWrap = document.createElement('div');
            searchWrap.style.cssText = 'margin-bottom:6px;';
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = '🔍 Search chats...';
            searchInput.style.cssText = 'width:100%;padding:4px 8px;font-size:10px;border-radius:6px;border:1px solid var(--divider,rgba(255,255,255,0.1));background:var(--input-bg,rgba(255,255,255,0.05));color:var(--text-main,#fff);box-sizing:border-box;';
            searchInput.value = this._searchQuery || '';
            searchInput.oninput = (e) => {
                this._searchQuery = e.target.value;
                getPanelUI().renderDetailsPane();
            };
            searchWrap.appendChild(searchInput);
            container.appendChild(searchWrap);

            const query = (this._searchQuery || '').toLowerCase().trim();

            this.scanSidebarChats();

            // Group chats by folder
            const chatsByFolder = {};
            this.chatCache.forEach(chat => {
                const fid = this.data.chatToFolder[chat.id];
                if (fid && this.data.folders[fid]) {
                    if (!chatsByFolder[fid]) chatsByFolder[fid] = [];
                    chatsByFolder[fid].push(chat);
                }
            });

            // Sort: pinned first
            const sortedFolderOrder = [...this.data.folderOrder].sort((a, b) => {
                const aPinned = this.data.folders[a]?.pinned ? 1 : 0;
                const bPinned = this.data.folders[b]?.pinned ? 1 : 0;
                return bPinned - aPinned;
            });

            if (this.data.folderOrder.length === 0) {
                const hint = document.createElement('div');
                hint.style.cssText = 'font-size:10px;color:var(--text-sub);opacity:0.6;padding:4px 8px;';
                hint.textContent = 'Drag chats here to organize';
                container.appendChild(hint);
            } else {
                sortedFolderOrder.forEach(folderId => {
                    const folder = this.data.folders[folderId];
                    if (!folder) return;
                    let chats = chatsByFolder[folderId] || [];
                    if (query) {
                        chats = chats.filter(c => c.title.toLowerCase().includes(query));
                        if (!folder.name.toLowerCase().includes(query) && chats.length === 0) return;
                    }
                    const folderEl = this.createFolderRow(folderId, folder, chats);
                    container.appendChild(folderEl);
                });
            }

            // Uncategorized chats
            const assignedChatIds = new Set(
                Object.entries(this.data.chatToFolder)
                    .filter(([, fid]) => this.data.folders[fid])
                    .map(([cid]) => cid)
            );
            let uncategorized = this.chatCache.filter(chat => !assignedChatIds.has(chat.id));
            if (query) {
                uncategorized = uncategorized.filter(c => c.title.toLowerCase().includes(query));
            }

            if (uncategorized.length > 0) {
                this._renderUncategorized(container, uncategorized);
            }

            // Add folder button
            const addBtn = document.createElement('button');
            addBtn.className = 'gf-add-btn';
            addBtn.textContent = '+ New Folder';
            addBtn.onclick = (e) => {
                e.stopPropagation();
                this.showFolderModal(null, 'Create Folder', '', FOLDER_COLORS[0]);
            };
            container.appendChild(addBtn);

            // Auto-classify button
            const hasRules = this.data.folderOrder.some(fid => {
                const f = this.data.folders[fid];
                return f && f.rules && f.rules.length > 0;
            });
            if (hasRules) {
                const classifyBtn = document.createElement('button');
                classifyBtn.className = 'gf-add-btn';
                classifyBtn.style.borderStyle = 'solid';
                classifyBtn.textContent = '🤖 Auto Classify';
                classifyBtn.onclick = (e) => {
                    e.stopPropagation();
                    const count = this.autoClassify();
                    classifyBtn.textContent = count > 0 ? `✓ Classified ${count} chats` : '✓ Nothing to classify';
                    setTimeout(() => { classifyBtn.textContent = '🤖 Auto Classify'; }, 2000);
                };
                container.appendChild(classifyBtn);
            }
        },

        _renderUncategorized(container, uncategorized) {
            const uncatHeader = document.createElement('div');
            uncatHeader.className = 'gf-uncategorized-header';
            const uncatToggle = document.createElement('span');
            uncatToggle.textContent = this.uncategorizedCollapsed ? '▶' : '▼';
            uncatToggle.style.fontSize = '8px';
            const uncatLabel = document.createElement('span');
            uncatLabel.textContent = `Uncategorized (${uncategorized.length})`;
            uncatHeader.appendChild(uncatToggle);
            uncatHeader.appendChild(uncatLabel);
            uncatHeader.onclick = (e) => {
                e.stopPropagation();
                this.uncategorizedCollapsed = !this.uncategorizedCollapsed;
                getPanelUI().renderDetailsPane();
            };
            container.appendChild(uncatHeader);

            if (!this.uncategorizedCollapsed) {
                uncategorized.forEach(chat => {
                    container.appendChild(this._createChatRow(chat, null));
                });
            }
        },

        _createChatRow(chat, folderId) {
            const chatRow = document.createElement('div');
            chatRow.className = 'gf-chat-row' + (this._batchSelected.has(chat.id) ? ' batch-selected' : '');

            if (this._batchMode) {
                const check = document.createElement('div');
                check.className = 'gf-batch-check' + (this._batchSelected.has(chat.id) ? ' checked' : '');
                check.onclick = (e) => {
                    e.stopPropagation();
                    if (this._batchSelected.has(chat.id)) this._batchSelected.delete(chat.id);
                    else this._batchSelected.add(chat.id);
                    getPanelUI().renderDetailsPane();
                };
                chatRow.appendChild(check);
            }

            if (!this._batchMode) {
                chatRow.setAttribute('draggable', 'true');
                chatRow.ondragstart = (e) => {
                    this.dragState = { chatId: chat.id, chatTitle: chat.title };
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', chat.id);
                    chatRow.style.opacity = '0.5';
                };
                chatRow.ondragend = () => {
                    chatRow.style.opacity = '';
                    this.dragState = null;
                };
            }

            const chatTitle = document.createElement('span');
            chatTitle.className = 'gf-chat-title';
            chatTitle.textContent = chat.title.length > 20 ? chat.title.slice(0, 20) + '...' : chat.title;
            chatTitle.title = chat.title;
            chatRow.appendChild(chatTitle);

            // Remove button (only in folder context, not batch mode)
            if (folderId !== null && !this._batchMode) {
                const removeBtn = document.createElement('span');
                removeBtn.className = 'gf-chat-remove';
                removeBtn.textContent = '✕';
                removeBtn.title = 'Remove from folder';
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.moveChatToFolder(chat.id, null);
                };
                chatRow.appendChild(removeBtn);
            }

            chatRow.onclick = (e) => {
                e.stopPropagation();
                if (this._batchMode) {
                    if (this._batchSelected.has(chat.id)) this._batchSelected.delete(chat.id);
                    else this._batchSelected.add(chat.id);
                    getPanelUI().renderDetailsPane();
                    return;
                }
                if (chat.element && chat.element.click) {
                    chat.element.click();
                } else {
                    window.location.href = chat.href;
                }
            };

            return chatRow;
        },

        // --- Create Folder Row ---
        createFolderRow(folderId, folder, chats) {
            const wrapper = document.createElement('div');
            wrapper.className = 'gf-folder-wrapper';

            const row = document.createElement('div');
            row.className = `gf-folder-row ${folder.collapsed ? 'collapsed' : ''}`;
            row.setAttribute('draggable', 'true');
            row.dataset.folderId = folderId;

            // Folder drag reorder
            row.ondragstart = (e) => {
                if (this.dragState) return;
                this.folderDragState = { folderId };
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', 'folder:' + folderId);
                row.classList.add('dragging');
            };
            row.ondragend = () => {
                row.classList.remove('dragging');
                this.folderDragState = null;
                document.querySelectorAll('.gf-folder-row').forEach(el => {
                    el.classList.remove('drag-above', 'drag-below');
                });
            };

            // Color dot
            const dot = document.createElement('div');
            dot.className = 'gf-folder-dot';
            dot.style.background = folder.color;

            // Name
            const label = document.createElement('span');
            label.className = 'gf-folder-label';
            label.textContent = (folder.pinned ? '📌 ' : '') + folder.name;

            // Count badge
            const stats = this.getFolderStats(folderId);
            const badge = document.createElement('span');
            badge.className = 'gf-folder-badge';
            badge.textContent = chats.length > 0 ? `(${chats.length})` : '';
            badge.title = `Total assigned: ${stats.chatCount} | Visible: ${chats.length}`;

            // Toggle arrow
            const toggle = document.createElement('span');
            toggle.className = 'gf-folder-toggle';
            toggle.textContent = '▼';

            // Actions
            const actions = document.createElement('div');
            actions.className = 'gf-folder-actions';

            const editBtn = document.createElement('span');
            editBtn.className = 'gf-folder-action';
            editBtn.textContent = '✏️';
            editBtn.title = 'Edit';
            editBtn.onclick = (e) => {
                e.stopPropagation();
                this.showFolderModal(folderId, 'Edit Folder', folder.name, folder.color);
            };

            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'gf-folder-action';
            deleteBtn.textContent = '🗑️';
            deleteBtn.title = 'Delete';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Delete "${folder.name}"?`)) {
                    this.deleteFolder(folderId);
                }
            };

            const pinBtn = document.createElement('span');
            pinBtn.className = 'gf-folder-action';
            pinBtn.textContent = folder.pinned ? '📌' : '📍';
            pinBtn.title = folder.pinned ? 'Unpin' : 'Pin to top';
            pinBtn.onclick = (e) => {
                e.stopPropagation();
                this.toggleFolderPin(folderId);
            };

            actions.appendChild(pinBtn);
            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);

            row.appendChild(dot);
            row.appendChild(label);
            row.appendChild(badge);
            row.appendChild(actions);
            row.appendChild(toggle);

            // Click to toggle collapse
            row.onclick = (e) => {
                if (e.target.closest('.gf-folder-actions')) return;
                e.stopPropagation();
                this.toggleFolderCollapse(folderId);
            };

            // Drag & Drop targets
            this._setupFolderDropZone(row, folderId);

            wrapper.appendChild(row);

            // Chat items (if not collapsed)
            if (!folder.collapsed && chats.length > 0) {
                chats.forEach(chat => {
                    wrapper.appendChild(this._createChatRow(chat, folderId));
                });
            }

            return wrapper;
        },

        _setupFolderDropZone(row, folderId) {
            row.ondragover = (e) => {
                e.preventDefault();
                if (this.folderDragState && this.folderDragState.folderId !== folderId) {
                    const rect = row.getBoundingClientRect();
                    const mid = rect.top + rect.height / 2;
                    row.classList.remove('drag-above', 'drag-below', 'drop-active');
                    if (e.clientY < mid) row.classList.add('drag-above');
                    else row.classList.add('drag-below');
                } else if (this.dragState) {
                    row.classList.add('drop-active');
                }
            };
            row.ondragleave = () => {
                row.classList.remove('drop-active', 'drag-above', 'drag-below');
            };
            row.ondrop = (e) => {
                e.preventDefault();
                const wasAbove = row.classList.contains('drag-above');
                row.classList.remove('drop-active', 'drag-above', 'drag-below');
                if (this.folderDragState && this.folderDragState.folderId !== folderId) {
                    this.reorderFolder(this.folderDragState.folderId, folderId, wasAbove ? 'before' : 'after');
                } else if (this.dragState) {
                    this.moveChatToFolder(this.dragState.chatId, folderId);
                }
            };
        },

        // --- Folder Modal ---
        showFolderModal(folderId, title, currentName, currentColor) {
            const isEdit = folderId !== null;

            const overlay = document.createElement('div');
            overlay.className = 'gf-modal-overlay';
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

            const modal = document.createElement('div');
            modal.className = 'gf-modal';
            applyTheme(modal, getTheme());

            const titleEl = document.createElement('div');
            titleEl.className = 'gf-modal-title';
            titleEl.textContent = title;

            const input = document.createElement('input');
            input.className = 'gf-modal-input';
            input.type = 'text';
            input.placeholder = 'Folder name';
            input.value = currentName;

            // Color picker
            const colorsContainer = document.createElement('div');
            colorsContainer.className = 'gf-modal-colors';

            let selectedColor = currentColor;
            const hexInput = this._createHexInput(currentColor, (val) => {
                selectedColor = val;
                colorsContainer.querySelectorAll('.gf-color-option').forEach(c => c.classList.remove('selected'));
            });

            FOLDER_COLORS.forEach(color => {
                const colorBtn = document.createElement('div');
                colorBtn.className = `gf-color-option ${color === selectedColor ? 'selected' : ''}`;
                colorBtn.style.background = color;
                colorBtn.onclick = () => {
                    colorsContainer.querySelectorAll('.gf-color-option').forEach(c => c.classList.remove('selected'));
                    colorBtn.classList.add('selected');
                    selectedColor = color;
                    hexInput.value = color;
                };
                colorsContainer.appendChild(colorBtn);
            });

            // Hex color wrap
            const hexWrap = document.createElement('div');
            hexWrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;';
            const hexLabel = document.createElement('span');
            hexLabel.style.cssText = 'font-size:11px;color:var(--text-sub,#9aa0a6);';
            hexLabel.textContent = 'Custom:';
            hexWrap.appendChild(hexLabel);
            hexWrap.appendChild(hexInput);

            // Rules section (edit mode only)
            let rulesData = [];
            let rulesSection = null;
            if (isEdit) {
                rulesData = [...(this.data.folders[folderId].rules || [])];
                rulesSection = this._createRulesSection(rulesData);
            }

            // Action buttons
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'gf-modal-actions';

            if (isEdit) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'gf-modal-btn danger';
                deleteBtn.textContent = 'Delete';
                deleteBtn.onclick = () => {
                    this.deleteFolder(folderId);
                    overlay.remove();
                };
                actionsDiv.appendChild(deleteBtn);
            }

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'gf-modal-btn secondary';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = () => overlay.remove();

            const saveBtn = document.createElement('button');
            saveBtn.className = 'gf-modal-btn primary';
            saveBtn.textContent = isEdit ? 'Save' : 'Create';
            saveBtn.onclick = () => {
                const name = input.value.trim() || 'New Folder';
                if (isEdit) {
                    this.renameFolder(folderId, name);
                    this.setFolderColor(folderId, selectedColor);
                    this.setFolderRules(folderId, rulesData.filter(r => r.value));
                } else {
                    this.createFolder(name, selectedColor);
                }
                overlay.remove();
            };

            actionsDiv.appendChild(cancelBtn);
            actionsDiv.appendChild(saveBtn);

            modal.appendChild(titleEl);
            modal.appendChild(input);
            modal.appendChild(colorsContainer);
            modal.appendChild(hexWrap);
            if (rulesSection) modal.appendChild(rulesSection);
            modal.appendChild(actionsDiv);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            input.focus();
            input.select();
        },

        _createHexInput(currentColor, onColorChange) {
            const hexInput = document.createElement('input');
            hexInput.type = 'text';
            hexInput.value = currentColor;
            hexInput.placeholder = '#ff6600';
            hexInput.style.cssText = 'flex:1;padding:6px 8px;font-size:12px;border-radius:6px;border:1px solid var(--border,rgba(255,255,255,0.1));background:var(--input-bg,rgba(255,255,255,0.05));color:var(--text-main,#e8eaed);font-family:monospace;box-sizing:border-box;';
            hexInput.oninput = () => {
                const val = hexInput.value.trim();
                if (/^#[0-9a-fA-F]{3,8}$/.test(val)) {
                    onColorChange(val);
                }
            };
            return hexInput;
        },

        _createRulesSection(rulesData) {
            const rulesSection = document.createElement('div');
            rulesSection.style.cssText = 'margin-bottom:16px;';

            const rulesLabel = document.createElement('div');
            rulesLabel.style.cssText = 'font-size:11px;color:var(--text-sub,#9aa0a6);margin-bottom:6px;';
            rulesLabel.textContent = 'Auto-classify rules (keyword or /regex/):';
            rulesSection.appendChild(rulesLabel);

            const rulesContainer = document.createElement('div');
            rulesContainer.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

            const renderRules = () => {
                rulesContainer.replaceChildren();
                rulesData.forEach((rule, idx) => {
                    const ruleRow = document.createElement('div');
                    ruleRow.style.cssText = 'display:flex;gap:4px;align-items:center;';

                    const ruleInput = document.createElement('input');
                    ruleInput.type = 'text';
                    ruleInput.value = rule.type === 'regex' ? `/${rule.value}/` : rule.value;
                    ruleInput.style.cssText = 'flex:1;padding:4px 8px;font-size:11px;border-radius:4px;border:1px solid var(--border,rgba(255,255,255,0.1));background:var(--input-bg,rgba(255,255,255,0.05));color:var(--text-main,#e8eaed);box-sizing:border-box;';
                    ruleInput.oninput = () => {
                        const val = ruleInput.value.trim();
                        const regexMatch = val.match(/^\/(.+)\/$/);
                        if (regexMatch) {
                            rulesData[idx] = { type: 'regex', value: regexMatch[1] };
                        } else {
                            rulesData[idx] = { type: 'keyword', value: val };
                        }
                    };

                    const delBtn = document.createElement('span');
                    delBtn.textContent = '✕';
                    delBtn.style.cssText = 'cursor:pointer;font-size:12px;color:var(--text-sub);opacity:0.6;';
                    delBtn.onclick = () => {
                        rulesData.splice(idx, 1);
                        renderRules();
                    };

                    ruleRow.appendChild(ruleInput);
                    ruleRow.appendChild(delBtn);
                    rulesContainer.appendChild(ruleRow);
                });
            };
            renderRules();

            const addRuleBtn = document.createElement('button');
            addRuleBtn.style.cssText = 'font-size:10px;padding:4px 8px;border-radius:4px;border:1px dashed var(--divider,rgba(255,255,255,0.15));background:transparent;color:var(--text-sub,#9aa0a6);cursor:pointer;margin-top:4px;';
            addRuleBtn.textContent = '+ Add Rule';
            addRuleBtn.onclick = () => {
                rulesData.push({ type: 'keyword', value: '' });
                renderRules();
            };

            rulesSection.appendChild(rulesContainer);
            rulesSection.appendChild(addRuleBtn);
            return rulesSection;
        },
    };
}

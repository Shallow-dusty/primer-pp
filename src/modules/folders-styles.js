// src/modules/folders-styles.js — CSS for folders module

export const FOLDERS_CSS = `
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
    @media (prefers-reduced-motion: reduce) {
        .gf-color-option, .gf-modal-btn, .gf-folder-row, .gf-chat-row,
        .gf-folder-toggle, .gf-add-btn { transition: none !important; }
    }
`;

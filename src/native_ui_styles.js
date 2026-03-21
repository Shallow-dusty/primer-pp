/**
 * Centralized CSS classes for native UI injections.
 * All injected elements use these classes instead of inline style.cssText.
 * Classes use CSS custom properties from the theme system for auto-theming.
 */

export function injectNativeUIStyles() {
    GM_addStyle(`
        /* ============================================ */
        /* Sidebar injections                           */
        /* ============================================ */

        .gc-filter-bar {
            display: flex;
            gap: 6px;
            padding: 8px 16px;
            overflow-x: auto;
            border-bottom: 1px solid var(--divider, rgba(255,255,255,0.06));
            align-items: center;
            flex-shrink: 0;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
            height: auto;
            max-height: 40px;
            align-self: start;
        }
        .gc-filter-bar::-webkit-scrollbar { display: none; }

        .gc-filter-tab {
            padding: 5px 14px;
            border-radius: 16px;
            font-size: 13px;
            font-family: 'Google Sans', Roboto, sans-serif;
            white-space: nowrap;
            cursor: pointer;
            border: 1px solid rgba(128,128,128,0.2);
            background: transparent;
            color: var(--text-sub, #9aa0a6);
            font-weight: 400;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            line-height: 1.4;
            user-select: none;
        }
        .gc-filter-tab:hover {
            background: var(--row-hover, rgba(255,255,255,0.08));
            color: var(--text-main, #e8eaed);
        }
        .gc-filter-tab.active {
            font-weight: 600;
            color: var(--accent, #8ab4f8);
        }

        .gc-sidebar-toolbar {
            padding: 6px 16px;
            border-bottom: 1px solid var(--divider, rgba(255,255,255,0.06));
            height: auto;
            max-height: 44px;
            align-self: start;
        }

        .gc-sidebar-btn {
            background: transparent;
            border: 1px solid var(--border, rgba(255,255,255,0.12));
            color: var(--text-sub, #9aa0a6);
            border-radius: 18px;
            padding: 5px 14px;
            font-size: 12px;
            font-family: 'Google Sans', Roboto, sans-serif;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            user-select: none;
        }
        .gc-sidebar-btn:hover {
            color: var(--text-main, #e8eaed);
            background: var(--row-hover, rgba(255,255,255,0.08));
        }
        .gc-sidebar-btn.full-width {
            width: 100%;
        }
        .gc-sidebar-btn.danger {
            background: #ea4335;
            color: #fff;
            border-color: transparent;
        }
        .gc-sidebar-btn.danger:hover {
            background: #d93025;
        }

        .gc-sidebar-toolbar-active {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .gc-count-label {
            font-size: 11px;
            color: var(--accent, #8ab4f8);
            flex: 1;
            text-align: center;
            font-weight: 500;
        }

        .gc-batch-check {
            width: 16px;
            height: 16px;
            border-radius: 4px;
            border: 2px solid var(--text-sub, #5f6368);
            background: transparent;
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #fff;
            cursor: pointer;
            margin-right: 6px;
            vertical-align: middle;
            transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .gc-batch-check[data-checked="true"] {
            border-color: var(--accent, #8ab4f8);
            background: var(--accent, #8ab4f8);
        }

        /* ============================================ */
        /* Input area injections                        */
        /* ============================================ */

        .gc-input-btn {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: transparent;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            color: var(--text-sub, #9aa0a6);
        }
        .gc-input-btn:hover {
            background: var(--row-hover, rgba(128,128,128,0.15));
            color: var(--text-main, #e8eaed);
        }
        .gc-input-btn:active {
            transform: scale(0.92);
        }

        .gc-tweaks-dots {
            display: flex;
            gap: 4px;
            position: absolute;
            bottom: 8px;
            right: 8px;
            pointer-events: none;
            z-index: 1;
        }

        .gc-tweaks-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--text-sub, #555);
            transition: background 0.3s;
        }
        .gc-tweaks-dot.on {
            background: var(--accent, #8ab4f8);
            animation: gcDotPulse 2.5s infinite;
        }
        @keyframes gcDotPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .gc-send-hint {
            position: absolute;
            bottom: 8px;
            right: 36px;
            font-size: 11px;
            color: var(--text-sub, #9aa0a6);
            opacity: 0.6;
            pointer-events: none;
            z-index: 1;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            background: var(--btn-bg, rgba(255,255,255,0.06));
            padding: 2px 6px;
            border-radius: 4px;
        }

        /* ============================================ */
        /* Chat header injections                       */
        /* ============================================ */

        .gc-header-btn {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: transparent;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.7;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            color: var(--text-sub, #9aa0a6);
        }
        .gc-header-btn:hover {
            opacity: 1;
            background: rgba(128, 128, 128, 0.15);
        }
        .gc-header-btn:active {
            transform: scale(0.92);
        }

        /* ============================================ */
        /* Model lock indicator                         */
        /* ============================================ */

        .gc-model-lock {
            font-size: 11px;
            padding: 1px 5px;
            border-radius: 4px;
            background: var(--badge-bg, rgba(255,255,255,0.06));
            color: var(--text-sub, #9aa0a6);
            margin-left: 4px;
            cursor: default;
            user-select: none;
            display: inline-flex;
            align-items: center;
            gap: 2px;
        }

        /* ============================================ */
        /* Quote reply FAB                              */
        /* ============================================ */

        .gc-quote-fab {
            position: fixed;
            z-index: 2147483646;
            background: var(--accent, #8ab4f8);
            color: #fff;
            padding: 5px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            font-family: 'Google Sans', Roboto, sans-serif;
            cursor: pointer;
            box-shadow: 0 2px 12px rgba(0,0,0,0.3);
            user-select: none;
            transition: opacity 0.15s, transform 0.15s;
            opacity: 0;
            transform: scale(0.9);
        }
        .gc-quote-fab.visible {
            opacity: 1;
            transform: scale(1);
        }

        /* ============================================ */
        /* Toast notification                           */
        /* ============================================ */

        .gc-toast {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(10px);
            background: var(--bg, #303134);
            color: var(--text-main, #e8eaed);
            border: 1px solid var(--border, rgba(255,255,255,0.12));
            padding: 10px 24px;
            border-radius: 14px;
            font-size: 13px;
            font-family: 'Google Sans', Roboto, sans-serif;
            z-index: 2147483647;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            opacity: 0;
            transition: opacity 0.2s, transform 0.2s;
        }
        .gc-toast.visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    `);
}

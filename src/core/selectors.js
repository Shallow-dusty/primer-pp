// src/core/selectors.js — Centralized DOM selectors

export const SELECTORS = {
    // Model detection
    MODEL_BUTTON: 'button.input-area-switch',
    MODEL_MENU_BUTTON: '[data-test-id="bard-mode-menu-button"]',
    MODEL_SELECTED: '.bard-mode-list-button.is-selected',
    MODEL_OPTIONS: '[data-test-id^="bard-mode-option-"]',
    ACCOUNT_PILL: 'button.gds-pillbox-button, button.pillbox-btn',

    // User detection
    USER_AVATAR: 'img[data-src*="googleusercontent"][alt*="@"]',
    USER_IMG_ALT: 'img[alt*="@"]',
    USER_BTN_ARIA: 'button[aria-label*="@"]',
    USER_LINK_ARIA: 'a[aria-label*="@"]',

    // Sidebar
    SIDEBAR_ITEMS: 'mat-list-item a[mat-list-item-link], a.conversation-item, [role="listitem"] a',

    // Chat menu (batch-delete) — multi-language
    CHAT_MORE_BUTTON: [
        'button[aria-label*="more" i]', 'button[aria-label*="More" i]',
        'button[aria-label*="options" i]', 'button[aria-label*="Options" i]',
        'button[aria-label*="更多" i]', 'button[aria-label*="その他" i]',
        'button[aria-label*="더보기" i]', 'button[aria-label*="Plus" i]',
        'button[aria-label*="Más" i]', 'button[aria-label*="Mehr" i]',
        'button[data-test-id*="menu"]',
        'mat-icon[data-mat-icon-name="more_vert"]',
    ],
    MENU_ITEMS: '[role="menuitem"], mat-menu-item, button.mat-mdc-menu-item',
    CONFIRM_BUTTONS: 'button.confirm-button, button[data-test-id*="confirm"], mat-dialog-actions button, .mdc-dialog__actions button',

    // Editor
    EDITOR: 'div.ql-editor[contenteditable="true"]',
    EDITOR_AREA: '.ql-editor, [contenteditable="true"]',

    // Send button
    SEND_BUTTON: 'button.send-button, button[aria-label*="Send"], button[aria-label*="发送"]',

    // UI tweaks
    CONVERSATION_TITLE: 'h1.conversation-title, [data-test-id="conversation-title"]',
    FIRST_USER_MSG: '.user-query-text, .query-text',
    CHAT_CONTAINER: 'main, .chat-container, [role="main"]',
    CHAT_WIDTH: 'main .conversation-container, main .chat-window',
    SIDEBAR_NAV: 'bard-sidenav',
    GEMS_LINK: 'a[href*="/gems/"]',
};

// Unified model detection map (shared by counter.js and default-model.js)
export const MODEL_DETECT_MAP = {
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

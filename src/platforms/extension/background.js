// src/platforms/extension/background.js — Extension service worker (context menus)

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'gemini-reset-position',
        title: 'Reset Panel Position',
        contexts: ['action'],
    });
});

chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === 'gemini-reset-position') {
        chrome.storage.local.set({
            gemini_panel_pos: {
                top: 'auto',
                left: 'auto',
                bottom: '20px',
                right: '20px',
            },
        });
    }
});

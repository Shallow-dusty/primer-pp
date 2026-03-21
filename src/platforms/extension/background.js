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
            gemini_panel_pos: { top: '20px', left: 'auto', bottom: 'auto', right: '220px' },
        });
    }
});

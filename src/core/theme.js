// src/core/theme.js — Theme definitions + applyTheme()

export const THEMES = {
    glass: {
        name: 'Glass',
        bg: 'rgba(32, 33, 36, 0.75)',
        border: 'rgba(255, 255, 255, 0.08)',
        shadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        blur: '18px',
        saturate: '180%',
        textMain: '#e8eaed',
        textSub: '#9aa0a6',
        accent: '#8ab4f8',
        btnBg: 'rgba(255, 255, 255, 0.06)',
        rowHover: 'rgba(255, 255, 255, 0.04)',
        divider: 'rgba(255, 255, 255, 0.06)',
    },
    cyber: {
        name: 'Cyber',
        bg: 'rgba(0, 10, 0, 0.85)',
        border: 'rgba(0, 255, 65, 0.15)',
        shadow: '0 0 30px rgba(0, 255, 65, 0.1)',
        blur: '12px',
        saturate: '200%',
        textMain: '#00ff41',
        textSub: '#00cc33',
        accent: '#00ff41',
        btnBg: 'rgba(0, 255, 65, 0.08)',
        rowHover: 'rgba(0, 255, 65, 0.06)',
        divider: 'rgba(0, 255, 65, 0.1)',
    },
    paper: {
        name: 'Paper',
        bg: 'rgba(255, 253, 247, 0.95)',
        border: 'rgba(0, 0, 0, 0.1)',
        shadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        blur: '8px',
        saturate: '100%',
        textMain: '#202124',
        textSub: '#5f6368',
        accent: '#1a73e8',
        btnBg: 'rgba(0, 0, 0, 0.04)',
        rowHover: 'rgba(0, 0, 0, 0.03)',
        divider: 'rgba(0, 0, 0, 0.06)',
    },
};

export function applyTheme(element, themeId) {
    const t = THEMES[themeId] || THEMES.glass;
    const s = element.style;
    s.setProperty('--bg', t.bg);
    s.setProperty('--border', t.border);
    s.setProperty('--shadow', t.shadow);
    s.setProperty('--blur', t.blur);
    s.setProperty('--saturate', t.saturate);
    s.setProperty('--text-main', t.textMain);
    s.setProperty('--text-sub', t.textSub);
    s.setProperty('--accent', t.accent);
    s.setProperty('--btn-bg', t.btnBg);
    s.setProperty('--row-hover', t.rowHover);
    s.setProperty('--divider', t.divider);
}

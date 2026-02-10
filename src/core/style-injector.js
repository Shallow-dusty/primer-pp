// src/core/style-injector.js — Platform-agnostic CSS injection

let injectedStyles = [];

export function injectStyles(css, gmAddStyle) {
    if (typeof gmAddStyle === 'function') {
        gmAddStyle(css);
    } else {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        injectedStyles.push(style);
    }
}

export function removeAllInjectedStyles() {
    injectedStyles.forEach(s => s.remove());
    injectedStyles = [];
}

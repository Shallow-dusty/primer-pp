// src/core/style-injector.js — Platform-agnostic CSS injection

let injectedStyles = [];

/**
 * Inject CSS into a target root (ShadowRoot or document.head).
 * @param {string} css
 * @param {Function|null} gmAddStyle - GM_addStyle (userscript only, injects globally)
 * @param {ShadowRoot|null} shadowRoot - if provided, inject into shadow root instead of document.head
 */
export function injectStyles(css, gmAddStyle, shadowRoot) {
    if (typeof gmAddStyle === 'function') {
        // Userscript: GM_addStyle is global, but we still inject a <style> into shadow root for isolation
        if (shadowRoot) {
            const style = document.createElement('style');
            style.textContent = css;
            shadowRoot.appendChild(style);
            injectedStyles.push(style);
        } else {
            gmAddStyle(css);
        }
    } else {
        const root = shadowRoot || document.head;
        const style = document.createElement('style');
        style.textContent = css;
        root.appendChild(style);
        injectedStyles.push(style);
    }
}

export function removeAllInjectedStyles() {
    injectedStyles.forEach(s => s.remove());
    injectedStyles = [];
}

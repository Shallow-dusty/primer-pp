import { Logger } from './logger.js';

export const DOMWatcher = {
    _observer: null,
    _handlers: [],
    _timers: {},

    init() {
        if (this._observer) return;
        this._observer = new MutationObserver(mutations => {
            for (const h of this._handlers) {
                try {
                    if (mutations.some(m => h.match(m))) {
                        clearTimeout(this._timers[h.id]);
                        this._timers[h.id] = setTimeout(h.callback, h.debounce || 0);
                    }
                } catch (e) { /* silent — don't let one handler break others */ }
            }
        });
        this._observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-label', 'alt', 'class', 'data-test-id']
        });
        Logger.debug('DOMWatcher initialized');
    },

    register(id, { match, callback, debounce = 0 }) {
        this.unregister(id);
        this._handlers.push({ id, match, callback, debounce });
        Logger.debug('DOMWatcher handler registered', { id, debounce });
    },

    unregister(id) {
        this._handlers = this._handlers.filter(h => h.id !== id);
        clearTimeout(this._timers[id]);
        delete this._timers[id];
    },

    destroy() {
        this._observer?.disconnect();
        this._observer = null;
        Object.values(this._timers).forEach(clearTimeout);
        this._handlers = [];
        this._timers = {};
    }
};

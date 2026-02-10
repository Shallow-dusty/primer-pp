/**
 * Quota calculation utilities for GeminiCounterPro
 * Extracted for testability — source of truth for weighted quota logic
 */

/**
 * Default model configuration with multipliers
 */
const MODEL_CONFIG = {
    flash: { label: '3 Flash', multiplier: 0, color: '#34a853' },
    thinking: { label: '3 Flash Thinking', multiplier: 0.33, color: '#fbbc04' },
    pro: { label: '3 Pro', multiplier: 1, color: '#ea4335' }
};

/**
 * Calculate weighted quota usage from byModel counts
 * @param {Object} byModel - { flash: number, thinking: number, pro: number }
 * @param {Object} [config] - model config with multipliers (defaults to MODEL_CONFIG)
 * @returns {number} weighted quota value
 */
function getWeightedQuota(byModel, config = MODEL_CONFIG) {
    if (!byModel || typeof byModel !== 'object') return 0;
    return Object.keys(byModel).reduce((sum, key) => {
        const mult = config[key]?.multiplier ?? 1;
        return sum + ((byModel[key] || 0) * mult);
    }, 0);
}

/**
 * Ensure a daily entry has the byModel field (backward compat)
 * @param {Object} entry - daily count entry { messages, chats, byModel? }
 * @returns {Object} entry with byModel guaranteed
 */
function ensureByModel(entry) {
    if (!entry) return { messages: 0, chats: 0, byModel: { flash: 0, thinking: 0, pro: 0 } };
    if (!entry.byModel) {
        entry.byModel = { flash: 0, thinking: 0, pro: 0 };
    }
    return entry;
}

/**
 * Format quota label string
 * @param {number} rawCount - total raw message count
 * @param {number} weighted - weighted quota value
 * @param {number} limit - daily quota limit
 * @returns {string} formatted label
 */
function formatQuotaLabel(rawCount, weighted, limit) {
    const weightedStr = weighted % 1 === 0 ? String(weighted) : weighted.toFixed(1);
    return `${rawCount} msgs (${weightedStr} weighted) / ${limit}`;
}

/**
 * Calculate quota bar percentage and color
 * @param {number} weighted - weighted quota value
 * @param {number} limit - daily quota limit
 * @returns {{ pct: number, color: string }}
 */
function getQuotaBarState(weighted, limit) {
    const pct = limit > 0 ? Math.min((weighted / limit) * 100, 100) : 0;
    let color;
    if (pct < 60) color = '#34a853';
    else if (pct < 85) color = '#fbbc04';
    else color = '#ea4335';
    return { pct, color };
}

module.exports = { MODEL_CONFIG, getWeightedQuota, ensureByModel, formatQuotaLabel, getQuotaBarState };

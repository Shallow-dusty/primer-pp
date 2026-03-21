const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { MODEL_CONFIG } = require('../lib/model_config.js');
const { getWeightedQuota, ensureByModel, formatQuotaLabel, getQuotaBarState } = require('../lib/quota_calc.js');

describe('quota_calc', () => {

    describe('MODEL_CONFIG', () => {
        it('has flash, thinking, pro with correct multipliers', () => {
            assert.equal(MODEL_CONFIG.flash.multiplier, 0);
            assert.equal(MODEL_CONFIG.thinking.multiplier, 0.33);
            assert.equal(MODEL_CONFIG.pro.multiplier, 1);
        });

        it('has labels and colors for all models', () => {
            for (const key of ['flash', 'thinking', 'pro']) {
                assert.ok(MODEL_CONFIG[key].label, `${key} should have label`);
                assert.ok(MODEL_CONFIG[key].color, `${key} should have color`);
            }
        });
    });

    describe('getWeightedQuota', () => {
        it('returns 0 for null/undefined input', () => {
            assert.equal(getWeightedQuota(null), 0);
            assert.equal(getWeightedQuota(undefined), 0);
            assert.equal(getWeightedQuota('string'), 0);
        });

        it('returns 0 for all-flash usage (multiplier=0)', () => {
            assert.equal(getWeightedQuota({ flash: 50, thinking: 0, pro: 0 }), 0);
        });

        it('calculates weighted value for mixed usage', () => {
            const result = getWeightedQuota({ flash: 10, thinking: 3, pro: 2 });
            // 10*0 + 3*0.33 + 2*1 = 0 + 0.99 + 2 = 2.99
            assert.ok(Math.abs(result - 2.99) < 0.001);
        });

        it('handles pro-only usage', () => {
            assert.equal(getWeightedQuota({ flash: 0, thinking: 0, pro: 5 }), 5);
        });

        it('handles thinking-only usage', () => {
            const result = getWeightedQuota({ flash: 0, thinking: 10, pro: 0 });
            assert.ok(Math.abs(result - 3.3) < 0.001);
        });

        it('handles empty byModel object', () => {
            assert.equal(getWeightedQuota({}), 0);
        });

        it('handles unknown model keys with multiplier=1 fallback', () => {
            assert.equal(getWeightedQuota({ unknown: 5 }), 5);
        });

        it('accepts custom config', () => {
            const customConfig = { flash: { multiplier: 0.5 }, pro: { multiplier: 2 } };
            assert.equal(getWeightedQuota({ flash: 4, pro: 3 }, customConfig), 8);
        });
    });

    describe('ensureByModel', () => {
        it('returns default entry for null input', () => {
            const result = ensureByModel(null);
            assert.deepEqual(result, { messages: 0, chats: 0, byModel: { flash: 0, thinking: 0, pro: 0 } });
        });

        it('adds byModel to entry without it', () => {
            const entry = { messages: 5, chats: 1 };
            const result = ensureByModel(entry);
            assert.deepEqual(result.byModel, { flash: 0, thinking: 0, pro: 0 });
            assert.equal(result.messages, 5);
        });

        it('preserves existing byModel', () => {
            const entry = { messages: 5, chats: 1, byModel: { flash: 3, thinking: 1, pro: 1 } };
            const result = ensureByModel(entry);
            assert.deepEqual(result.byModel, { flash: 3, thinking: 1, pro: 1 });
        });

        it('mutates the original entry in place', () => {
            const entry = { messages: 2, chats: 0 };
            ensureByModel(entry);
            assert.ok(entry.byModel, 'byModel should be added in place');
        });
    });

    describe('formatQuotaLabel', () => {
        it('formats integer weighted value without decimals', () => {
            assert.equal(formatQuotaLabel(10, 5, 50), '10 msgs (5 weighted) / 50');
        });

        it('formats decimal weighted value with one decimal', () => {
            assert.equal(formatQuotaLabel(10, 3.3, 50), '10 msgs (3.3 weighted) / 50');
        });

        it('formats zero values', () => {
            assert.equal(formatQuotaLabel(0, 0, 50), '0 msgs (0 weighted) / 50');
        });

        it('handles large numbers', () => {
            assert.equal(formatQuotaLabel(1000, 500.5, 2000), '1000 msgs (500.5 weighted) / 2000');
        });
    });

    describe('getQuotaBarState', () => {
        it('returns green for under 60%', () => {
            const { pct, color } = getQuotaBarState(25, 50);
            assert.equal(pct, 50);
            assert.equal(color, '#34a853');
        });

        it('returns yellow for 60-85%', () => {
            const { pct, color } = getQuotaBarState(35, 50);
            assert.equal(pct, 70);
            assert.equal(color, '#fbbc04');
        });

        it('returns red for 85%+', () => {
            const { pct, color } = getQuotaBarState(45, 50);
            assert.equal(pct, 90);
            assert.equal(color, '#ea4335');
        });

        it('caps at 100%', () => {
            const { pct } = getQuotaBarState(100, 50);
            assert.equal(pct, 100);
        });

        it('handles zero limit', () => {
            const { pct } = getQuotaBarState(10, 0);
            assert.equal(pct, 0);
        });

        it('returns green at exactly 0%', () => {
            const { pct, color } = getQuotaBarState(0, 50);
            assert.equal(pct, 0);
            assert.equal(color, '#34a853');
        });

        it('returns yellow at exactly 60%', () => {
            const { pct, color } = getQuotaBarState(30, 50);
            assert.equal(pct, 60);
            assert.equal(color, '#fbbc04');
        });

        it('returns red at exactly 85%', () => {
            const { pct, color } = getQuotaBarState(42.5, 50);
            assert.equal(pct, 85);
            assert.equal(color, '#ea4335');
        });
    });
});

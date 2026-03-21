const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { MODEL_CONFIG, MODEL_DETECT_MAP } = require('../lib/model_config.js');

describe('model_config', () => {

    describe('MODEL_CONFIG', () => {
        it('has flash, thinking, pro keys', () => {
            assert.ok(MODEL_CONFIG.flash);
            assert.ok(MODEL_CONFIG.thinking);
            assert.ok(MODEL_CONFIG.pro);
        });

        it('has correct multipliers', () => {
            assert.equal(MODEL_CONFIG.flash.multiplier, 0);
            assert.equal(MODEL_CONFIG.thinking.multiplier, 0.33);
            assert.equal(MODEL_CONFIG.pro.multiplier, 1);
        });

        it('has labels for all models', () => {
            for (const key of ['flash', 'thinking', 'pro']) {
                assert.ok(typeof MODEL_CONFIG[key].label === 'string', `${key} should have string label`);
                assert.ok(MODEL_CONFIG[key].label.length > 0, `${key} label should not be empty`);
            }
        });

        it('has colors for all models', () => {
            for (const key of ['flash', 'thinking', 'pro']) {
                assert.match(MODEL_CONFIG[key].color, /^#[0-9a-f]{6}$/i, `${key} should have hex color`);
            }
        });
    });

    describe('MODEL_DETECT_MAP', () => {
        it('maps EN names to correct keys', () => {
            assert.equal(MODEL_DETECT_MAP['Fast'], 'flash');
            assert.equal(MODEL_DETECT_MAP['Flash'], 'flash');
            assert.equal(MODEL_DETECT_MAP['Thinking'], 'thinking');
            assert.equal(MODEL_DETECT_MAP['Pro'], 'pro');
        });

        it('maps lowercase names', () => {
            assert.equal(MODEL_DETECT_MAP['flash'], 'flash');
            assert.equal(MODEL_DETECT_MAP['thinking'], 'thinking');
            assert.equal(MODEL_DETECT_MAP['pro'], 'pro');
        });

        it('maps ZH names', () => {
            assert.equal(MODEL_DETECT_MAP['快速'], 'flash');
            assert.equal(MODEL_DETECT_MAP['思考'], 'thinking');
            assert.equal(MODEL_DETECT_MAP['专业'], 'pro');
        });

        it('maps JA names', () => {
            assert.equal(MODEL_DETECT_MAP['高速'], 'flash');
            assert.equal(MODEL_DETECT_MAP['思考'], 'thinking');
            assert.equal(MODEL_DETECT_MAP['プロ'], 'pro');
        });

        it('maps KO names', () => {
            assert.equal(MODEL_DETECT_MAP['빠른'], 'flash');
            assert.equal(MODEL_DETECT_MAP['사고'], 'thinking');
            assert.equal(MODEL_DETECT_MAP['프로'], 'pro');
        });

        it('includes both Fast and Flash for Gemini 3 rename', () => {
            assert.equal(MODEL_DETECT_MAP['Fast'], 'flash');
            assert.equal(MODEL_DETECT_MAP['Flash'], 'flash');
        });

        it('all values are valid model keys', () => {
            const validKeys = new Set(['flash', 'thinking', 'pro']);
            for (const [text, key] of Object.entries(MODEL_DETECT_MAP)) {
                assert.ok(validKeys.has(key), `"${text}" maps to invalid key "${key}"`);
            }
        });
    });
});

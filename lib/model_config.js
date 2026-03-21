"use strict";

/**
 * Model configuration for Gemini Primer++
 * Single source of truth — used by CounterModule and DefaultModelModule
 */

const MODEL_CONFIG = {
    flash: { label: '3 Flash', multiplier: 0, color: '#34a853' },
    thinking: { label: '3 Flash Thinking', multiplier: 0.33, color: '#fbbc04' },
    pro: { label: '3 Pro', multiplier: 1, color: '#ea4335' }
};

/**
 * Maps UI text (multi-language) to internal model key.
 * Covers EN, ZH, JA, KO. Includes both 'Fast' (Gemini 3) and legacy 'Flash'.
 */
const MODEL_DETECT_MAP = {
    // EN
    'Fast': 'flash', 'Flash': 'flash', 'flash': 'flash',
    'Thinking': 'thinking', 'thinking': 'thinking',
    'Pro': 'pro', 'pro': 'pro',
    // ZH
    '快速': 'flash', '思考': 'thinking', '专业': 'pro',
    // JA
    '高速': 'flash',
    'プロ': 'pro',
    // KO
    '빠른': 'flash', '사고': 'thinking', '프로': 'pro'
};

module.exports = { MODEL_CONFIG, MODEL_DETECT_MAP };

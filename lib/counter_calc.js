"use strict";

const { formatLocalDate, getDayKey, parseLocalDate } = require('./date_utils.js');

/**
 * Counter pure-calculation utilities for Gemini Primer++
 * Extracted from CounterModule for testability
 */

/**
 * Calculate current and best usage streaks from daily counts.
 * Fixes P1: uses Math.round(diff) === 1 for float precision (DST etc.)
 * Fixes P0: uses formatLocalDate() instead of toISOString() for timezone safety
 * @param {Object} dailyCounts - { "YYYY-MM-DD": { messages, ... } }
 * @param {number} resetHour - hour (0-23) when the day resets
 * @param {Date} [now] - current time (for testing)
 * @returns {{ current: number, best: number }}
 */
function calculateStreaks(dailyCounts, resetHour, now) {
    const dates = Object.keys(dailyCounts || {}).sort();
    if (dates.length === 0) return { current: 0, best: 0 };

    let best = 0, temp = 0, lastDate = null;

    for (const dateStr of dates) {
        if ((dailyCounts[dateStr].messages || 0) === 0) continue;
        const d = parseLocalDate(dateStr);

        if (lastDate) {
            const diff = (d - lastDate) / (1000 * 60 * 60 * 24);
            if (Math.round(diff) === 1) temp++;
            else if (diff > 1) temp = 1;
        } else {
            temp = 1;
        }
        if (temp > best) best = temp;
        lastDate = d;
    }

    // Current streak
    const ref = now ? new Date(now.getTime()) : new Date();
    const todayStr = getDayKey(resetHour, ref);

    const yesterdayDate = new Date(ref.getTime());
    if (yesterdayDate.getHours() < resetHour) yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = formatLocalDate(yesterdayDate);

    const startStr = (dailyCounts[todayStr]?.messages > 0) ? todayStr : yesterdayStr;
    let checkDate = parseLocalDate(startStr);
    let current = 0;

    while (true) {
        const key = formatLocalDate(checkDate);
        if (dailyCounts[key] && dailyCounts[key].messages > 0) {
            current++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return { current, best };
}

/**
 * Get last 7 days of usage data
 * @param {Object} dailyCounts - { "YYYY-MM-DD": { messages, ... } }
 * @param {Date} [now] - current time (for testing)
 * @returns {Array<{ date: string, label: string, messages: number }>}
 */
function getLast7DaysData(dailyCounts, resetHour, now) {
    const result = [];
    const ref = now || new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(ref.getTime());
        d.setDate(d.getDate() - i);
        const key = getDayKey(resetHour || 0, d);
        const [, m, day] = key.split('-');
        result.push({
            date: key,
            label: `${parseInt(m)}/${parseInt(day)}`,
            messages: (dailyCounts || {})[key]?.messages || 0
        });
    }
    return result;
}

/**
 * Ensure a today entry exists in dailyCounts, with byModel backfill
 * @param {Object} dailyCounts - mutable daily counts object
 * @param {string} todayKey - the day key string
 * @returns {string} todayKey (pass-through for convenience)
 */
function ensureTodayEntry(dailyCounts, todayKey) {
    if (!dailyCounts[todayKey]) {
        dailyCounts[todayKey] = { messages: 0, chats: 0, byModel: { flash: 0, thinking: 0, pro: 0 } };
    }
    if (!dailyCounts[todayKey].byModel) {
        dailyCounts[todayKey].byModel = { flash: 0, thinking: 0, pro: 0 };
    }
    return todayKey;
}

module.exports = { calculateStreaks, getLast7DaysData, ensureTodayEntry };

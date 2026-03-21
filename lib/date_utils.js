"use strict";

/**
 * Date utilities for Primer++ for Gemini
 * Fixes P0 timezone bug: toISOString() returns UTC, getHours() is local time
 */

/**
 * Format a Date as local YYYY-MM-DD string (timezone-safe)
 * Unlike toISOString().slice(0,10) which returns UTC date,
 * this always returns the local date.
 * @param {Date} d
 * @returns {string} "YYYY-MM-DD"
 */
function formatLocalDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Get the "day key" for the current moment, respecting a custom reset hour.
 * If current hour < resetHour, the "day" is still yesterday.
 * @param {number} resetHour - hour (0-23) when the day resets
 * @param {Date} [now] - current time (default: new Date())
 * @returns {string} "YYYY-MM-DD"
 */
function getDayKey(resetHour, now) {
    const d = now ? new Date(now.getTime()) : new Date();
    if (d.getHours() < resetHour) {
        d.setDate(d.getDate() - 1);
    }
    return formatLocalDate(d);
}

/**
 * Get the "day key" for a specific date, respecting a custom reset hour.
 * @param {Date} date
 * @param {number} resetHour
 * @returns {string} "YYYY-MM-DD"
 */
function getDayKeyForDate(date, resetHour) {
    return getDayKey(resetHour, date);
}

/**
 * Parse a "YYYY-MM-DD" string as a local-time Date (midnight local).
 * Unlike `new Date("2026-02-10")` which parses as UTC midnight,
 * this always returns local midnight, avoiding day-shift in positive UTC offsets.
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {Date}
 */
function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

module.exports = { formatLocalDate, getDayKey, getDayKeyForDate, parseLocalDate };

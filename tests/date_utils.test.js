const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { formatLocalDate, getDayKey, getDayKeyForDate, parseLocalDate } = require('../lib/date_utils.js');

describe('date_utils', () => {

    describe('formatLocalDate', () => {
        it('formats a normal date correctly', () => {
            const d = new Date(2026, 0, 15); // Jan 15, 2026
            assert.equal(formatLocalDate(d), '2026-01-15');
        });

        it('pads single-digit month and day', () => {
            const d = new Date(2026, 2, 5); // Mar 5, 2026
            assert.equal(formatLocalDate(d), '2026-03-05');
        });

        it('handles Dec 31 correctly', () => {
            const d = new Date(2025, 11, 31); // Dec 31, 2025
            assert.equal(formatLocalDate(d), '2025-12-31');
        });

        it('handles Jan 1 correctly', () => {
            const d = new Date(2026, 0, 1); // Jan 1, 2026
            assert.equal(formatLocalDate(d), '2026-01-01');
        });

        it('handles leap year Feb 29', () => {
            const d = new Date(2024, 1, 29); // Feb 29, 2024
            assert.equal(formatLocalDate(d), '2024-02-29');
        });

        it('returns local date regardless of time', () => {
            const d = new Date(2026, 5, 15, 23, 59, 59);
            assert.equal(formatLocalDate(d), '2026-06-15');
        });
    });

    describe('getDayKey', () => {
        it('returns today when resetHour=0 and hour >= 0', () => {
            const now = new Date(2026, 1, 10, 14, 0, 0); // Feb 10, 2pm
            assert.equal(getDayKey(0, now), '2026-02-10');
        });

        it('returns yesterday when hour < resetHour', () => {
            const now = new Date(2026, 1, 10, 3, 0, 0); // Feb 10, 3am
            assert.equal(getDayKey(4, now), '2026-02-09');
        });

        it('returns today when hour >= resetHour', () => {
            const now = new Date(2026, 1, 10, 5, 0, 0); // Feb 10, 5am
            assert.equal(getDayKey(4, now), '2026-02-10');
        });

        it('returns today when hour === resetHour', () => {
            const now = new Date(2026, 1, 10, 4, 0, 0); // Feb 10, 4am
            assert.equal(getDayKey(4, now), '2026-02-10');
        });

        it('handles month boundary (Jan 1 before reset)', () => {
            const now = new Date(2026, 0, 1, 2, 0, 0); // Jan 1, 2am
            assert.equal(getDayKey(4, now), '2025-12-31');
        });

        it('handles year boundary (Jan 1 after reset)', () => {
            const now = new Date(2026, 0, 1, 5, 0, 0); // Jan 1, 5am
            assert.equal(getDayKey(4, now), '2026-01-01');
        });

        it('defaults to current time when now is omitted', () => {
            const result = getDayKey(0);
            assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
        });

        it('does not mutate the passed Date object', () => {
            const now = new Date(2026, 1, 10, 2, 0, 0);
            const original = now.getTime();
            getDayKey(4, now);
            assert.equal(now.getTime(), original);
        });
    });

    describe('parseLocalDate', () => {
        it('parses YYYY-MM-DD as local midnight', () => {
            const d = parseLocalDate('2026-02-10');
            assert.equal(d.getFullYear(), 2026);
            assert.equal(d.getMonth(), 1);
            assert.equal(d.getDate(), 10);
            assert.equal(d.getHours(), 0);
        });

        it('roundtrips with formatLocalDate', () => {
            const str = '2026-06-15';
            assert.equal(formatLocalDate(parseLocalDate(str)), str);
        });

        it('handles Jan 1', () => {
            const d = parseLocalDate('2026-01-01');
            assert.equal(d.getMonth(), 0);
            assert.equal(d.getDate(), 1);
        });

        it('handles Dec 31', () => {
            const d = parseLocalDate('2025-12-31');
            assert.equal(d.getFullYear(), 2025);
            assert.equal(d.getMonth(), 11);
            assert.equal(d.getDate(), 31);
        });
    });

    describe('getDayKeyForDate', () => {
        it('delegates to getDayKey with date and resetHour', () => {
            const d = new Date(2026, 1, 10, 3, 0, 0);
            assert.equal(getDayKeyForDate(d, 4), '2026-02-09');
        });

        it('returns same result as getDayKey', () => {
            const d = new Date(2026, 5, 15, 12, 0, 0);
            assert.equal(getDayKeyForDate(d, 0), getDayKey(0, d));
        });
    });
});

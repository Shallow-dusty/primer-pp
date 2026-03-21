const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calculateStreaks, getLast7DaysData, ensureTodayEntry } = require('../lib/counter_calc.js');

describe('counter_calc', () => {

    describe('calculateStreaks', () => {
        it('returns {0,0} for empty data', () => {
            assert.deepEqual(calculateStreaks({}, 0), { current: 0, best: 0 });
        });

        it('returns {0,0} for null data', () => {
            assert.deepEqual(calculateStreaks(null, 0), { current: 0, best: 0 });
        });

        it('returns {1,1} for single day with messages', () => {
            const now = new Date(2026, 1, 10, 12, 0, 0);
            const data = { '2026-02-10': { messages: 5 } };
            const result = calculateStreaks(data, 0, now);
            assert.equal(result.current, 1);
            assert.equal(result.best, 1);
        });

        it('calculates consecutive streak', () => {
            const now = new Date(2026, 1, 10, 12, 0, 0);
            const data = {
                '2026-02-08': { messages: 3 },
                '2026-02-09': { messages: 2 },
                '2026-02-10': { messages: 1 }
            };
            const result = calculateStreaks(data, 0, now);
            assert.equal(result.current, 3);
            assert.equal(result.best, 3);
        });

        it('handles gap in streak', () => {
            const now = new Date(2026, 1, 10, 12, 0, 0);
            const data = {
                '2026-02-06': { messages: 1 },
                '2026-02-07': { messages: 1 },
                '2026-02-09': { messages: 1 },
                '2026-02-10': { messages: 1 }
            };
            const result = calculateStreaks(data, 0, now);
            assert.equal(result.current, 2);
            assert.equal(result.best, 2);
        });

        it('skips days with 0 messages', () => {
            const now = new Date(2026, 1, 10, 12, 0, 0);
            const data = {
                '2026-02-08': { messages: 1 },
                '2026-02-09': { messages: 0 },
                '2026-02-10': { messages: 1 }
            };
            const result = calculateStreaks(data, 0, now);
            assert.equal(result.current, 1);
        });

        it('current streak from yesterday if no messages today', () => {
            const now = new Date(2026, 1, 10, 12, 0, 0);
            const data = {
                '2026-02-08': { messages: 1 },
                '2026-02-09': { messages: 1 }
            };
            const result = calculateStreaks(data, 0, now);
            assert.equal(result.current, 2);
            assert.equal(result.best, 2);
        });

        it('best streak can be historical', () => {
            const now = new Date(2026, 1, 10, 12, 0, 0);
            const data = {
                '2026-01-01': { messages: 1 },
                '2026-01-02': { messages: 1 },
                '2026-01-03': { messages: 1 },
                '2026-01-04': { messages: 1 },
                '2026-02-10': { messages: 1 }
            };
            const result = calculateStreaks(data, 0, now);
            assert.equal(result.current, 1);
            assert.equal(result.best, 4);
        });

        it('handles resetHour correctly', () => {
            // 3am with resetHour=4 means "yesterday" still
            const now = new Date(2026, 1, 10, 3, 0, 0);
            const data = {
                '2026-02-09': { messages: 5 }
            };
            const result = calculateStreaks(data, 4, now);
            assert.equal(result.current, 1);
        });

        it('defaults to current time when now is omitted', () => {
            // Use a date far in the past so current streak is 0, but best is 1
            const data = { '2020-01-01': { messages: 1 } };
            const result = calculateStreaks(data, 0);
            assert.equal(result.best, 1);
            assert.equal(result.current, 0);
        });

        it('uses Math.round for float precision (DST-safe)', () => {
            // Simulate dates where DST could cause diff to be 0.958... or 1.041...
            const now = new Date(2026, 1, 10, 12, 0, 0);
            const data = {
                '2026-02-08': { messages: 1 },
                '2026-02-09': { messages: 1 },
                '2026-02-10': { messages: 1 }
            };
            const result = calculateStreaks(data, 0, now);
            assert.equal(result.best, 3);
        });
    });

    describe('getLast7DaysData', () => {
        it('returns 7 entries', () => {
            const now = new Date(2026, 1, 10, 12, 0, 0);
            const result = getLast7DaysData({}, 0, now);
            assert.equal(result.length, 7);
        });

        it('returns dates in chronological order', () => {
            const now = new Date(2026, 1, 10, 12, 0, 0);
            const result = getLast7DaysData({}, 0, now);
            assert.equal(result[0].date, '2026-02-04');
            assert.equal(result[6].date, '2026-02-10');
        });

        it('fills in message counts from dailyCounts', () => {
            const now = new Date(2026, 1, 10, 12, 0, 0);
            const data = { '2026-02-10': { messages: 42 } };
            const result = getLast7DaysData(data, 0, now);
            assert.equal(result[6].messages, 42);
        });

        it('returns 0 for missing days', () => {
            const now = new Date(2026, 1, 10, 12, 0, 0);
            const result = getLast7DaysData({}, 0, now);
            result.forEach(entry => {
                assert.equal(entry.messages, 0);
            });
        });

        it('includes label in M/D format', () => {
            const now = new Date(2026, 1, 10, 12, 0, 0);
            const result = getLast7DaysData({}, 0, now);
            assert.equal(result[6].label, '2/10');
            assert.equal(result[0].label, '2/4');
        });

        it('handles null dailyCounts', () => {
            const now = new Date(2026, 1, 10, 12, 0, 0);
            const result = getLast7DaysData(null, 0, now);
            assert.equal(result.length, 7);
        });

        it('defaults to current time when now is omitted', () => {
            const result = getLast7DaysData({}, 0);
            assert.equal(result.length, 7);
            assert.match(result[6].date, /^\d{4}-\d{2}-\d{2}$/);
        });

        it('handles month boundary', () => {
            const now = new Date(2026, 1, 2, 12, 0, 0); // Feb 2
            const result = getLast7DaysData({}, 0, now);
            assert.equal(result[0].date, '2026-01-27');
            assert.equal(result[6].date, '2026-02-02');
        });

        it('uses resetHour to align day buckets', () => {
            const now = new Date(2026, 1, 10, 2, 0, 0); // 2am
            const data = { '2026-02-09': { messages: 5 } };
            const result = getLast7DaysData(data, 4, now);
            // At 2am with resetHour=4, today's bucket is still 02-09
            assert.equal(result[6].date, '2026-02-09');
            assert.equal(result[6].label, '2/9');
            assert.equal(result[6].messages, 5);
        });
    });

    describe('ensureTodayEntry', () => {
        it('creates entry if missing', () => {
            const dc = {};
            const key = ensureTodayEntry(dc, '2026-02-10');
            assert.equal(key, '2026-02-10');
            assert.deepEqual(dc['2026-02-10'], {
                messages: 0, chats: 0,
                byModel: { flash: 0, thinking: 0, pro: 0 }
            });
        });

        it('backfills byModel if missing', () => {
            const dc = { '2026-02-10': { messages: 5, chats: 1 } };
            ensureTodayEntry(dc, '2026-02-10');
            assert.deepEqual(dc['2026-02-10'].byModel, { flash: 0, thinking: 0, pro: 0 });
            assert.equal(dc['2026-02-10'].messages, 5);
        });

        it('preserves existing entry with byModel', () => {
            const dc = {
                '2026-02-10': {
                    messages: 10, chats: 2,
                    byModel: { flash: 5, thinking: 3, pro: 2 }
                }
            };
            ensureTodayEntry(dc, '2026-02-10');
            assert.equal(dc['2026-02-10'].messages, 10);
            assert.deepEqual(dc['2026-02-10'].byModel, { flash: 5, thinking: 3, pro: 2 });
        });

        it('returns the todayKey for convenience', () => {
            const dc = {};
            const result = ensureTodayEntry(dc, 'test-key');
            assert.equal(result, 'test-key');
        });
    });
});

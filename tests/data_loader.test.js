const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeUserData, mergeGuestData } = require('../lib/data_loader.js');

describe('data_loader', () => {

    describe('normalizeUserData', () => {
        it('returns empty state for null input', () => {
            const result = normalizeUserData(null);
            assert.deepEqual(result, { total: 0, totalChatsCreated: 0, chats: {}, dailyCounts: {} });
        });

        it('returns empty state for undefined input', () => {
            const result = normalizeUserData(undefined);
            assert.deepEqual(result, { total: 0, totalChatsCreated: 0, chats: {}, dailyCounts: {} });
        });

        it('returns empty state for string input', () => {
            const result = normalizeUserData('corrupted');
            assert.deepEqual(result, { total: 0, totalChatsCreated: 0, chats: {}, dailyCounts: {} });
        });

        it('returns empty state for number input', () => {
            const result = normalizeUserData(42);
            assert.deepEqual(result, { total: 0, totalChatsCreated: 0, chats: {}, dailyCounts: {} });
        });

        it('normalizes valid data', () => {
            const data = {
                total: 10,
                totalChatsCreated: 3,
                chats: { c1: 5 },
                dailyCounts: { '2026-01-01': { messages: 10, chats: 3 } }
            };
            const result = normalizeUserData(data);
            assert.equal(result.total, 10);
            assert.equal(result.totalChatsCreated, 3);
            assert.deepEqual(result.chats, { c1: 5 });
            assert.deepEqual(result.dailyCounts, { '2026-01-01': { messages: 10, chats: 3 } });
        });

        it('handles NaN total gracefully', () => {
            const result = normalizeUserData({ total: NaN, totalChatsCreated: 5 });
            assert.equal(result.total, 0);
            assert.equal(result.totalChatsCreated, 5);
        });

        it('handles NaN totalChatsCreated gracefully', () => {
            const result = normalizeUserData({ total: 5, totalChatsCreated: NaN });
            assert.equal(result.total, 5);
            assert.equal(result.totalChatsCreated, 0);
        });

        it('handles string total gracefully', () => {
            const result = normalizeUserData({ total: 'bad' });
            assert.equal(result.total, 0);
        });

        it('handles dailyCounts as string gracefully', () => {
            const result = normalizeUserData({ dailyCounts: 'corrupted' });
            assert.deepEqual(result.dailyCounts, {});
        });

        it('handles dailyCounts as null gracefully', () => {
            const result = normalizeUserData({ dailyCounts: null });
            assert.deepEqual(result.dailyCounts, {});
        });

        it('handles chats as null gracefully', () => {
            const result = normalizeUserData({ chats: null });
            assert.deepEqual(result.chats, {});
        });

        it('handles chats as string gracefully', () => {
            const result = normalizeUserData({ chats: 'bad' });
            assert.deepEqual(result.chats, {});
        });

        it('handles missing byModel in dailyCounts entries (legacy)', () => {
            const data = {
                total: 5,
                dailyCounts: { '2026-01-01': { messages: 5, chats: 1 } }
            };
            const result = normalizeUserData(data);
            // The data is passed through as-is (byModel backfill is handled by ensureTodayEntry)
            assert.equal(result.dailyCounts['2026-01-01'].messages, 5);
        });

        it('migrates legacy session data when dailyCounts is empty', () => {
            const data = { session: 42, dailyCounts: {} };
            const result = normalizeUserData(data, '2026-02-20');
            assert.deepEqual(result.dailyCounts, { '2026-02-20': { messages: 42, chats: 0 } });
        });

        it('does not migrate session data when dailyCounts has entries', () => {
            const data = {
                session: 42,
                dailyCounts: { '2026-01-01': { messages: 10, chats: 0 } }
            };
            const result = normalizeUserData(data, '2026-02-20');
            assert.ok(!result.dailyCounts['2026-02-20']);
            assert.equal(result.dailyCounts['2026-01-01'].messages, 10);
        });

        it('does not migrate session data when no todayKey provided', () => {
            const data = { session: 42, dailyCounts: {} };
            const result = normalizeUserData(data);
            assert.deepEqual(result.dailyCounts, {});
        });

        it('does not migrate non-numeric session', () => {
            const data = { session: 'bad', dailyCounts: {} };
            const result = normalizeUserData(data, '2026-02-20');
            assert.deepEqual(result.dailyCounts, {});
        });

        it('preserves extra properties in dailyCounts entries', () => {
            const data = {
                total: 1,
                dailyCounts: { '2026-01-01': { messages: 1, chats: 0, byModel: { flash: 1, thinking: 0, pro: 0 } } }
            };
            const result = normalizeUserData(data);
            assert.deepEqual(result.dailyCounts['2026-01-01'].byModel, { flash: 1, thinking: 0, pro: 0 });
        });
    });

    describe('mergeGuestData', () => {
        it('returns false for null guest state', () => {
            const userState = { total: 5, totalChatsCreated: 1, chats: {}, dailyCounts: {} };
            assert.equal(mergeGuestData(userState, null), false);
            assert.equal(userState.total, 5); // unchanged
        });

        it('returns false for empty guest state (no data to merge)', () => {
            const userState = { total: 5, totalChatsCreated: 1, chats: {}, dailyCounts: {} };
            const guestState = { total: 0, totalChatsCreated: 0, chats: {}, dailyCounts: {} };
            assert.equal(mergeGuestData(userState, guestState), false);
            assert.equal(userState.total, 5); // unchanged
        });

        it('merges guest total and totalChatsCreated', () => {
            const userState = { total: 10, totalChatsCreated: 2, chats: {}, dailyCounts: {} };
            const guestState = { total: 5, totalChatsCreated: 1, chats: {}, dailyCounts: {} };
            const result = mergeGuestData(userState, guestState);
            assert.equal(result, true);
            assert.equal(userState.total, 15);
            assert.equal(userState.totalChatsCreated, 3);
        });

        it('merges guest dailyCounts into new days', () => {
            const userState = {
                total: 10, totalChatsCreated: 0, chats: {},
                dailyCounts: { '2026-01-01': { messages: 10, chats: 0 } }
            };
            const guestState = {
                total: 5, totalChatsCreated: 0, chats: {},
                dailyCounts: { '2026-01-02': { messages: 5, chats: 0, byModel: { flash: 3, thinking: 1, pro: 1 } } }
            };
            mergeGuestData(userState, guestState);
            assert.equal(userState.dailyCounts['2026-01-02'].messages, 5);
            assert.deepEqual(userState.dailyCounts['2026-01-02'].byModel, { flash: 3, thinking: 1, pro: 1 });
        });

        it('merges guest dailyCounts into same day', () => {
            const userState = {
                total: 10, totalChatsCreated: 0, chats: {},
                dailyCounts: {
                    '2026-01-01': { messages: 10, chats: 2, byModel: { flash: 5, thinking: 3, pro: 2 } }
                }
            };
            const guestState = {
                total: 3, totalChatsCreated: 0, chats: {},
                dailyCounts: {
                    '2026-01-01': { messages: 3, chats: 1, byModel: { flash: 1, thinking: 1, pro: 1 } }
                }
            };
            mergeGuestData(userState, guestState);
            assert.equal(userState.dailyCounts['2026-01-01'].messages, 13);
            assert.equal(userState.dailyCounts['2026-01-01'].chats, 3);
            assert.deepEqual(userState.dailyCounts['2026-01-01'].byModel, { flash: 6, thinking: 4, pro: 3 });
        });

        it('creates byModel on user entry when guest has byModel but user does not', () => {
            const userState = {
                total: 10, totalChatsCreated: 0, chats: {},
                dailyCounts: { '2026-01-01': { messages: 10, chats: 0 } }
            };
            const guestState = {
                total: 2, totalChatsCreated: 0, chats: {},
                dailyCounts: { '2026-01-01': { messages: 2, chats: 0, byModel: { flash: 1, thinking: 1, pro: 0 } } }
            };
            mergeGuestData(userState, guestState);
            assert.deepEqual(userState.dailyCounts['2026-01-01'].byModel, { flash: 1, thinking: 1, pro: 0 });
        });

        it('merges guest chats', () => {
            const userState = { total: 0, totalChatsCreated: 0, chats: { c1: 5 }, dailyCounts: {} };
            const guestState = { total: 3, totalChatsCreated: 0, chats: { c1: 2, c2: 3 }, dailyCounts: {} };
            mergeGuestData(userState, guestState);
            assert.equal(userState.chats.c1, 7);
            assert.equal(userState.chats.c2, 3);
        });

        it('handles guest with only chats (no total)', () => {
            const userState = { total: 0, totalChatsCreated: 0, chats: {}, dailyCounts: {} };
            const guestState = { total: 0, chats: { c1: 1 } };
            const result = mergeGuestData(userState, guestState);
            assert.equal(result, true);
            assert.equal(userState.chats.c1, 1);
        });

        it('handles guest dailyCounts without byModel', () => {
            const userState = {
                total: 0, totalChatsCreated: 0, chats: {},
                dailyCounts: { '2026-01-01': { messages: 5, chats: 0 } }
            };
            const guestState = {
                total: 2, totalChatsCreated: 0, chats: {},
                dailyCounts: { '2026-01-01': { messages: 2, chats: 0 } }
            };
            mergeGuestData(userState, guestState);
            assert.equal(userState.dailyCounts['2026-01-01'].messages, 7);
        });

        it('does not mutate guestState', () => {
            const userState = { total: 0, totalChatsCreated: 0, chats: {}, dailyCounts: {} };
            const guestState = {
                total: 5, totalChatsCreated: 1, chats: { c1: 3 },
                dailyCounts: { '2026-01-01': { messages: 5, chats: 1, byModel: { flash: 3, thinking: 1, pro: 1 } } }
            };
            const originalGuest = JSON.parse(JSON.stringify(guestState));
            mergeGuestData(userState, guestState);
            assert.deepEqual(guestState.total, originalGuest.total);
            assert.deepEqual(guestState.chats, originalGuest.chats);
            assert.deepEqual(guestState.dailyCounts, originalGuest.dailyCounts);
        });

        it('handles missing dailyCounts in guestState', () => {
            const userState = { total: 5, totalChatsCreated: 0, chats: {}, dailyCounts: {} };
            const guestState = { total: 3, chats: {} };
            const result = mergeGuestData(userState, guestState);
            assert.equal(result, true);
            assert.equal(userState.total, 8);
        });

        it('handles missing chats in guestState', () => {
            const userState = { total: 5, totalChatsCreated: 0, chats: {}, dailyCounts: {} };
            const guestState = { total: 3 };
            const result = mergeGuestData(userState, guestState);
            assert.equal(result, true);
            assert.equal(userState.total, 8);
        });

        it('returns false when total is 0 and chats is undefined', () => {
            const userState = { total: 5, totalChatsCreated: 0, chats: {}, dailyCounts: {} };
            const guestState = { total: 0 };
            assert.equal(mergeGuestData(userState, guestState), false);
        });

        it('merges same-day entries with missing messages/chats fields', () => {
            const userState = {
                total: 0, totalChatsCreated: 0, chats: {},
                dailyCounts: { '2026-01-01': {} }
            };
            const guestState = {
                total: 1, totalChatsCreated: 0, chats: {},
                dailyCounts: { '2026-01-01': {} }
            };
            mergeGuestData(userState, guestState);
            assert.equal(userState.dailyCounts['2026-01-01'].messages, 0);
            assert.equal(userState.dailyCounts['2026-01-01'].chats, 0);
        });

        it('merges same-day entries with zero/falsy byModel values', () => {
            const userState = {
                total: 0, totalChatsCreated: 0, chats: {},
                dailyCounts: { '2026-01-01': { messages: 1, chats: 0, byModel: { flash: 0, thinking: 0, pro: 0 } } }
            };
            const guestState = {
                total: 1, totalChatsCreated: 0, chats: {},
                dailyCounts: { '2026-01-01': { messages: 1, chats: 0, byModel: { flash: 0, thinking: 0, pro: 0 } } }
            };
            mergeGuestData(userState, guestState);
            assert.deepEqual(userState.dailyCounts['2026-01-01'].byModel, { flash: 0, thinking: 0, pro: 0 });
        });
    });
});

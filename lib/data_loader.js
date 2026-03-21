"use strict";

/**
 * Data loading and merging utilities for Gemini Primer++
 * Extracted from CounterModule for testability
 */

/**
 * Normalize raw saved data into a clean state object.
 * Handles corrupted, missing, or legacy data formats.
 * @param {*} savedData - raw data from storage (may be null, string, or object)
 * @param {string} [todayKey] - today's date key (for legacy session migration)
 * @returns {{ total: number, totalChatsCreated: number, chats: Object, dailyCounts: Object }}
 */
function normalizeUserData(savedData, todayKey) {
    const empty = { total: 0, totalChatsCreated: 0, chats: {}, dailyCounts: {} };

    if (!savedData || typeof savedData !== 'object') return empty;

    const total = typeof savedData.total === 'number' && !isNaN(savedData.total)
        ? savedData.total : 0;
    const totalChatsCreated = typeof savedData.totalChatsCreated === 'number' && !isNaN(savedData.totalChatsCreated)
        ? savedData.totalChatsCreated : 0;
    const chats = (savedData.chats && typeof savedData.chats === 'object') ? savedData.chats : {};
    let dailyCounts = (savedData.dailyCounts && typeof savedData.dailyCounts === 'object') ? savedData.dailyCounts : {};

    // Legacy migration: old format stored session count at top level
    if (savedData.session && typeof savedData.session === 'number' && Object.keys(dailyCounts).length === 0 && todayKey) {
        dailyCounts[todayKey] = { messages: savedData.session, chats: 0 };
    }

    return { total, totalChatsCreated, chats, dailyCounts };
}

/**
 * Merge guest state into user state (mutates userState).
 * @param {Object} userState - { total, totalChatsCreated, chats, dailyCounts } — mutated in place
 * @param {Object} guestState - { total, totalChatsCreated, chats, dailyCounts } — read-only
 * @returns {boolean} true if any data was actually merged
 */
function mergeGuestData(userState, guestState) {
    if (!guestState) return false;
    if ((guestState.total || 0) === 0 && Object.keys(guestState.chats || {}).length === 0) return false;

    userState.total = (userState.total || 0) + (guestState.total || 0);
    userState.totalChatsCreated = (userState.totalChatsCreated || 0) + (guestState.totalChatsCreated || 0);

    for (const [day, counts] of Object.entries(guestState.dailyCounts || {})) {
        if (!userState.dailyCounts[day]) {
            userState.dailyCounts[day] = JSON.parse(JSON.stringify(counts));
        } else {
            userState.dailyCounts[day].messages = (userState.dailyCounts[day].messages || 0) + (counts.messages || 0);
            userState.dailyCounts[day].chats = (userState.dailyCounts[day].chats || 0) + (counts.chats || 0);
            // Merge byModel counts
            if (counts.byModel) {
                if (!userState.dailyCounts[day].byModel) {
                    userState.dailyCounts[day].byModel = { flash: 0, thinking: 0, pro: 0 };
                }
                userState.dailyCounts[day].byModel.flash += counts.byModel.flash || 0;
                userState.dailyCounts[day].byModel.thinking += counts.byModel.thinking || 0;
                userState.dailyCounts[day].byModel.pro += counts.byModel.pro || 0;
            }
        }
    }

    for (const [cid, count] of Object.entries(guestState.chats || {})) {
        userState.chats[cid] = (userState.chats[cid] || 0) + count;
    }

    return true;
}

module.exports = { normalizeUserData, mergeGuestData };

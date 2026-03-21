const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { exportCSV, exportMarkdown } = require('../lib/export_formatter.js');

describe('export_formatter', () => {

    const sampleData = {
        '2026-02-08': { messages: 10, chats: 2, byModel: { flash: 5, thinking: 3, pro: 2 } },
        '2026-02-09': { messages: 8, chats: 1, byModel: { flash: 4, thinking: 2, pro: 2 } },
        '2026-02-10': { messages: 5, chats: 1, byModel: { flash: 3, thinking: 1, pro: 1 } }
    };

    describe('exportCSV', () => {
        it('generates valid CSV with header', () => {
            const csv = exportCSV(sampleData);
            const lines = csv.trim().split('\n');
            assert.equal(lines[0], 'Date,Messages,Chats,Flash,Thinking,Pro,Weighted');
        });

        it('sorts dates chronologically', () => {
            const csv = exportCSV(sampleData);
            const lines = csv.trim().split('\n');
            assert.ok(lines[1].startsWith('2026-02-08'));
            assert.ok(lines[2].startsWith('2026-02-09'));
            assert.ok(lines[3].startsWith('2026-02-10'));
        });

        it('calculates weighted values correctly', () => {
            const csv = exportCSV(sampleData);
            const lines = csv.trim().split('\n');
            // 2026-02-08: flash=5*0 + thinking=3*0.33 + pro=2*1 = 0+0.99+2 = 2.99
            assert.ok(lines[1].includes('2.99'));
        });

        it('includes TOTAL summary row', () => {
            const csv = exportCSV(sampleData);
            const lines = csv.trim().split('\n');
            const totalLine = lines[lines.length - 1];
            assert.ok(totalLine.startsWith('TOTAL'));
            assert.ok(totalLine.includes('23')); // 10+8+5
        });

        it('handles empty dailyCounts', () => {
            const csv = exportCSV({});
            const lines = csv.trim().split('\n');
            assert.equal(lines.length, 2); // header + TOTAL
            assert.ok(lines[1].startsWith('TOTAL,0,0,0,0,0,0'));
        });

        it('handles null dailyCounts', () => {
            const csv = exportCSV(null);
            const lines = csv.trim().split('\n');
            assert.equal(lines.length, 2);
        });

        it('handles entries without byModel (legacy data)', () => {
            const legacy = { '2026-01-01': { messages: 5, chats: 1 } };
            const csv = exportCSV(legacy);
            const lines = csv.trim().split('\n');
            assert.ok(lines[1].includes('2026-01-01,5,1,0,0,0,0'));
        });

        it('handles entries with missing/zero fields', () => {
            const partial = { '2026-01-01': {} };
            const csv = exportCSV(partial);
            assert.ok(csv.includes('2026-01-01,0,0,0,0,0,0'));
        });

        it('formats integer weighted without decimals', () => {
            const data = { '2026-01-01': { messages: 3, chats: 1, byModel: { flash: 0, thinking: 0, pro: 3 } } };
            const csv = exportCSV(data);
            assert.ok(csv.includes(',3\n') || csv.includes(',3,') || csv.trim().endsWith(',3'));
        });
    });

    describe('exportMarkdown', () => {
        it('generates report header with user and date', () => {
            const md = exportMarkdown(sampleData, { user: 'test@gmail.com' });
            assert.ok(md.includes('# Gemini Usage Report'));
            assert.ok(md.includes('**User:** test@gmail.com'));
            assert.ok(md.includes('**Exported:**'));
        });

        it('includes summary table', () => {
            const md = exportMarkdown(sampleData, { total: 100, totalChatsCreated: 20 });
            assert.ok(md.includes('## Summary'));
            assert.ok(md.includes('| Total Messages | 100 |'));
            assert.ok(md.includes('| Chats Created | 20 |'));
        });

        it('includes streak info when provided', () => {
            const md = exportMarkdown(sampleData, { currentStreak: 5, bestStreak: 10 });
            assert.ok(md.includes('| Current Streak | 5 days |'));
            assert.ok(md.includes('| Best Streak | 10 days |'));
        });

        it('omits streak info when not provided', () => {
            const md = exportMarkdown(sampleData, {});
            assert.ok(!md.includes('Streak'));
        });

        it('includes daily breakdown table', () => {
            const md = exportMarkdown(sampleData);
            assert.ok(md.includes('## Daily Breakdown'));
            assert.ok(md.includes('| 2026-02-08 |'));
            assert.ok(md.includes('| 2026-02-09 |'));
            assert.ok(md.includes('| 2026-02-10 |'));
        });

        it('limits to last 30 days', () => {
            const bigData = {};
            for (let i = 1; i <= 60; i++) {
                const d = String(i).padStart(2, '0');
                const m = i <= 31 ? '01' : '02';
                const day = i <= 31 ? d : String(i - 31).padStart(2, '0');
                bigData[`2026-${m}-${day}`] = { messages: i, chats: 1 };
            }
            const md = exportMarkdown(bigData);
            const tableRows = md.split('\n').filter(l => l.startsWith('| 2026-'));
            assert.equal(tableRows.length, 30);
        });

        it('handles empty dailyCounts', () => {
            const md = exportMarkdown({}, { user: 'test' });
            assert.ok(md.includes('# Gemini Usage Report'));
            assert.ok(!md.includes('## Daily Breakdown'));
        });

        it('handles null dailyCounts', () => {
            const md = exportMarkdown(null, { user: 'test' });
            assert.ok(md.includes('# Gemini Usage Report'));
        });

        it('handles legacy entries without byModel', () => {
            const legacy = { '2026-01-01': { messages: 5, chats: 1 } };
            const md = exportMarkdown(legacy);
            assert.ok(md.includes('| 2026-01-01 | 5 | 0 | 0 | 0 | 0 |'));
        });

        it('handles entries with partial/missing fields', () => {
            const partial = { '2026-01-01': {} };
            const md = exportMarkdown(partial);
            assert.ok(md.includes('| 2026-01-01 | 0 | 0 | 0 | 0 | 0 |'));
        });

        it('includes bestStreak but not currentStreak when only bestStreak given', () => {
            const md = exportMarkdown(sampleData, { bestStreak: 7 });
            assert.ok(md.includes('| Best Streak | 7 days |'));
            assert.ok(!md.includes('Current Streak'));
        });

        it('includes footer', () => {
            const md = exportMarkdown(sampleData);
            assert.ok(md.includes('Generated by Primer++ for Gemini'));
        });

        it('uses default user when not provided', () => {
            const md = exportMarkdown({});
            assert.ok(md.includes('**User:** Unknown'));
        });
    });
});

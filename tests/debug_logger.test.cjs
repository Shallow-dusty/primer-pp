"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createLogger, filterLogs } = require("../lib/debug_logger.cjs");

test("logger emits, filters, and persists", async () => {
  const persisted = [];
  const sink = [];
  const logger = createLogger({
    level: "info",
    initial: [{ ts: "t0", level: "info", msg: "init", data: null }],
    store: { get: () => [], set: (v) => { persisted.length = 0; persisted.push(...v); } },
    onLevelChange: (lvl) => { persisted.push({ level: lvl }); },
    now: (() => {
      let i = 0;
      return () => `t${++i}`;
    })(),
    sink: (lvl, msg, data) => sink.push({ lvl, msg, data })
  });

  logger.debug("dbg");
  logger.info("info", { a: 1 });
  logger.warn("warn");
  logger.error("err", { e: true });

  assert.equal(logger.getLevel(), "info");
  logger.setLevel("debug");
  assert.equal(logger.getLevel(), "debug");
  logger.debug("dbg2");
  assert.ok(persisted.some(e => e && e.level === "debug"));

  const entries = logger.getEntries();
  assert.ok(entries.length >= 5);
  assert.ok(entries.some(e => e.msg === "info"));

  const exportPayload = logger.export();
  assert.equal(exportPayload.level, "debug");
  assert.ok(Array.isArray(exportPayload.entries));

  const filteredAll = filterLogs(entries, { level: "all" });
  assert.equal(filteredAll.length, entries.length);

  const filteredWarn = filterLogs(entries, { level: "warn" });
  assert.ok(filteredWarn.every(e => e.level === "warn"));

  const filteredSearch = filterLogs(entries, { term: "info" });
  assert.ok(filteredSearch.every(e => (e.msg + JSON.stringify(e.data || {})).toLowerCase().includes("info")));
  const filteredNone = filterLogs(entries, { level: "error", term: "nope" });
  assert.equal(filteredNone.length, 0);

  const unsub = logger.subscribe(() => { throw new Error("subscriber fail"); });
  logger.info("sub-test");
  unsub();

  logger.clear();
  assert.equal(logger.getEntries().length >= 1, true); // clear logs + "Logs cleared"

  // ensure persistence happened
  await new Promise(r => setTimeout(r, 0));
  assert.ok(persisted.length > 0);
  assert.ok(sink.length > 0);
});

test("logger defaults and edge branches", async () => {
  const logger = createLogger();
  logger.log("custom", "custom-level");
  logger.setLevel("custom");
  logger.info("after-custom");

  // small buffer to trigger shift
  const store = { get: () => [], set: () => {} };
  const logger2 = createLogger({ maxEntries: 2, store });
  logger2.info("a");
  logger2.info("b");
  logger2.info("c");
  assert.equal(logger2.getEntries().length, 2);

  const entries = logger2.getEntries();
  const filtered = filterLogs(entries, { level: "info", term: "" });
  assert.equal(filtered.length, entries.length);

  const logger3 = createLogger({ store: { get: () => "nope", set: () => {} } });
  logger3.info("x");

  await new Promise(r => setTimeout(r, 0));
});

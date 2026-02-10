"use strict";

function createLogger(options) {
  const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
  const maxEntries = options?.maxEntries ?? 300;
  const maxStore = options?.maxStore ?? 500;
  let level = options?.level ?? "info";
  const store = options?.store ?? { get: () => [], set: () => {} };
  let buffer = Array.isArray(options?.initial)
    ? options.initial.slice()
    : (Array.isArray(store.get()) ? store.get() : []);
  const subscribers = new Set();
  let persistTimer = null;
  const onLevelChange = options?.onLevelChange ?? (() => {});
  const now = options?.now ?? (() => new Date().toISOString());
  const sink = options?.sink ?? (() => {});

  function shouldLog(lvl) {
    return (LEVELS[lvl] ?? 2) <= (LEVELS[level] ?? 2);
  }

  function persist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      const trimmed = buffer.slice(-maxStore);
      store.set(trimmed);
    }, 0);
  }

  function emit(entry) {
    buffer.push(entry);
    if (buffer.length > maxEntries) buffer.shift();
    persist();
    subscribers.forEach((fn) => {
      try { fn(entry); } catch (_) { /* noop */ }
    });
  }

  function log(lvl, msg, data) {
    const entry = { ts: now(), level: lvl, msg, data };
    if (shouldLog(lvl)) {
      sink(lvl, msg, data);
    }
    emit(entry);
  }

  return {
    log,
    error: (m, d) => log("error", m, d),
    warn: (m, d) => log("warn", m, d),
    info: (m, d) => log("info", m, d),
    debug: (m, d) => log("debug", m, d),
    getLevel: () => level,
    setLevel: (lvl) => { level = lvl; onLevelChange(lvl); log("info", "Log level updated", { level: lvl }); },
    getEntries: () => buffer.slice(),
    clear: () => { buffer = []; store.set([]); log("info", "Logs cleared"); },
    subscribe: (fn) => { subscribers.add(fn); return () => subscribers.delete(fn); },
    export: () => ({ exportedAt: now(), level, entries: buffer.slice() })
  };
}

function filterLogs(entries, opts) {
  const level = opts?.level ?? "all";
  const term = (opts?.term ?? "").toLowerCase();
  return entries.filter((e) => {
    if (level !== "all" && e.level !== level) return false;
    if (!term) return true;
    const dataStr = e.data ? JSON.stringify(e.data) : "";
    return `${e.msg} ${dataStr}`.toLowerCase().includes(term);
  });
}

module.exports = { createLogger, filterLogs };

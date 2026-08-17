/*
 * store.js — localStorage persistence for master library, sample history,
 * and training/quiz progress. No DOM dependency beyond `localStorage`/`JSON`.
 */
(function (global) {
  'use strict';

  var KEYS = {
    masters: 'colorTool.masters.v1',
    history: 'colorTool.history.v1',
    progress: 'colorTool.progress.v1'
  };

  function read(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // storage full or unavailable — fail silently, in-memory state still works this session
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ---- Master library ----

  function getMasters() {
    return read(KEYS.masters) || [];
  }

  function saveMaster(master) {
    var masters = getMasters();
    var record = Object.assign({ id: master.id || uid() }, master);
    var idx = masters.findIndex(function (m) { return m.id === record.id; });
    if (idx >= 0) masters[idx] = record; else masters.unshift(record);
    write(KEYS.masters, masters);
    return record;
  }

  function deleteMaster(id) {
    var masters = getMasters().filter(function (m) { return m.id !== id; });
    write(KEYS.masters, masters);
  }

  function findMaster(id) {
    return getMasters().find(function (m) { return m.id === id; }) || null;
  }

  function exportLibrary() {
    return JSON.stringify({ type: 'colorTool.library', version: 1, masters: getMasters() }, null, 2);
  }

  function importLibrary(jsonText, mode) {
    var parsed = JSON.parse(jsonText);
    var incoming = Array.isArray(parsed) ? parsed : (parsed.masters || []);
    if (mode === 'replace') {
      write(KEYS.masters, incoming);
      return incoming.length;
    }
    var existing = getMasters();
    var existingIds = new Set(existing.map(function (m) { return m.id; }));
    incoming.forEach(function (m) {
      if (!m.id || existingIds.has(m.id)) m.id = uid();
      existing.push(m);
    });
    write(KEYS.masters, existing);
    return incoming.length;
  }

  // ---- Sample history ----

  function getHistory(masterId) {
    var all = read(KEYS.history) || [];
    return masterId ? all.filter(function (h) { return h.masterId === masterId; }) : all;
  }

  function addHistoryEntry(entry) {
    var all = read(KEYS.history) || [];
    var record = Object.assign({ id: uid(), timestamp: new Date().toISOString() }, entry);
    all.unshift(record);
    write(KEYS.history, all);
    return record;
  }

  function clearHistory(masterId) {
    if (!masterId) { write(KEYS.history, []); return; }
    var remaining = getHistory().filter(function (h) { return h.masterId !== masterId; });
    write(KEYS.history, remaining);
  }

  function exportHistory(masterId) {
    return JSON.stringify({ type: 'colorTool.history', version: 1, entries: getHistory(masterId) }, null, 2);
  }

  // ---- Training / quiz progress ----

  function getProgress() {
    return read(KEYS.progress) || { completedModules: [], quizAttempts: [] };
  }

  function markModuleComplete(moduleId) {
    var p = getProgress();
    if (p.completedModules.indexOf(moduleId) === -1) p.completedModules.push(moduleId);
    write(KEYS.progress, p);
    return p;
  }

  function addQuizAttempt(attempt) {
    var p = getProgress();
    p.quizAttempts.push(Object.assign({ timestamp: new Date().toISOString() }, attempt));
    write(KEYS.progress, p);
    return p;
  }

  global.Store = {
    getMasters: getMasters,
    saveMaster: saveMaster,
    deleteMaster: deleteMaster,
    findMaster: findMaster,
    exportLibrary: exportLibrary,
    importLibrary: importLibrary,
    getHistory: getHistory,
    addHistoryEntry: addHistoryEntry,
    clearHistory: clearHistory,
    exportHistory: exportHistory,
    getProgress: getProgress,
    markModuleComplete: markModuleComplete,
    addQuizAttempt: addQuizAttempt,
    uid: uid
  };
})(typeof window !== 'undefined' ? window : globalThis);

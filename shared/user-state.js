(function exposeUserState(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HarborUserState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createUserStateApi() {
  'use strict';

  var CURRENT_VERSION = 2;
  var CURRENT_KEY = 'harbor:user-state:v2';
  var LEGACY_KEYS = ['harbor:user-state:v1'];
  var RECOVERY_KEY = 'harbor:user-state:recovery';
  var FAVORITES_LIMIT = 120;
  var HISTORY_LIMIT = 80;
  var RECOVERY_LIMIT = 200000;
  var BACKUP_FORMAT = 'harbor-user-data';
  var BACKUP_VERSION = 1;

  function defaults() {
    return {
      version: CURRENT_VERSION,
      favorites: [],
      history: [],
      progress: {},
      settings: {
        autoplayNext: true,
        rememberProgress: true,
        reduceMotion: false,
        onboardingComplete: false
      }
    };
  }

  function text(value, limit) {
    return typeof value === 'string' ? value.slice(0, limit) : '';
  }

  function finiteNumber(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function mediaKey(item) {
    return String(item.id || [item.category, item.type, item.name].join(':'));
  }

  function normalizeMediaItem(value) {
    if (!value || typeof value !== 'object' || !text(value.name, 300).trim()) return null;
    var item = {
      id: text(String(value.id || ''), 300),
      tmdbId: text(String(value.tmdbId || ''), 100),
      name: text(value.name, 300),
      category: text(value.category, 80),
      type: text(value.type, 80),
      year: finiteNumber(value.year, null),
      rating: typeof value.rating === 'string' || typeof value.rating === 'number'
        ? text(String(value.rating), 30)
        : '',
      sections: Array.isArray(value.sections)
        ? value.sections.filter(function (entry) { return typeof entry === 'string'; }).slice(0, 20).map(function (entry) { return entry.slice(0, 100); })
        : [],
      overview: text(value.overview, 5000),
      artworkUrl: text(value.artworkUrl, 4000),
      audioUrl: text(value.audioUrl, 4000),
      directStream: text(value.directStream, 4000)
    };
    if (Number.isFinite(Number(value.lastOpenedAt))) item.lastOpenedAt = Number(value.lastOpenedAt);
    return item;
  }

  function normalizeList(value, limit) {
    if (!Array.isArray(value)) return [];
    var seen = new Set();
    return value.reduce(function (items, entry) {
      if (items.length >= limit) return items;
      var item = normalizeMediaItem(entry);
      if (!item) return items;
      var key = mediaKey(item);
      if (seen.has(key)) return items;
      seen.add(key);
      items.push(item);
      return items;
    }, []);
  }

  function normalizeProgress(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.keys(value).slice(0, FAVORITES_LIMIT).reduce(function (entries, key) {
      var source = value[key];
      var item = normalizeMediaItem(source && source.item);
      if (!item) return entries;
      entries[String(key).slice(0, 500)] = {
        item: item,
        progress: Math.max(0, Math.min(1, finiteNumber(source.progress, 0))),
        season: Math.max(1, Math.floor(finiteNumber(source.season, 1))),
        episode: Math.max(1, Math.floor(finiteNumber(source.episode, 1))),
        updatedAt: Math.max(0, finiteNumber(source.updatedAt, 0))
      };
      return entries;
    }, {});
  }

  function normalize(value) {
    var fallback = defaults();
    var source = value && typeof value === 'object' ? value : {};
    var settings = source.settings && typeof source.settings === 'object' ? source.settings : {};
    return {
      version: CURRENT_VERSION,
      favorites: normalizeList(source.favorites, FAVORITES_LIMIT),
      history: normalizeList(source.history, HISTORY_LIMIT),
      progress: normalizeProgress(source.progress),
      settings: {
        autoplayNext: typeof settings.autoplayNext === 'boolean' ? settings.autoplayNext : fallback.settings.autoplayNext,
        rememberProgress: typeof settings.rememberProgress === 'boolean' ? settings.rememberProgress : fallback.settings.rememberProgress,
        reduceMotion: typeof settings.reduceMotion === 'boolean' ? settings.reduceMotion : fallback.settings.reduceMotion,
        onboardingComplete: typeof settings.onboardingComplete === 'boolean' ? settings.onboardingComplete : fallback.settings.onboardingComplete
      }
    };
  }

  function writeRecovery(storage, sourceKey, raw) {
    try {
      storage.setItem(RECOVERY_KEY, JSON.stringify({
        sourceKey: sourceKey,
        capturedAt: new Date().toISOString(),
        raw: String(raw).slice(0, RECOVERY_LIMIT)
      }));
    } catch {
      // Recovery is best-effort when storage is full or unavailable.
    }
  }

  function save(storage, value) {
    var state = normalize(value);
    storage.setItem(CURRENT_KEY, JSON.stringify(state));
    return state;
  }

  function createBackup(value, appVersion) {
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: text(String(appVersion || ''), 40),
      state: normalize(value)
    };
  }

  function parseBackup(value) {
    var document = typeof value === 'string' ? JSON.parse(value) : value;
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      throw new Error('This is not a Harbor data backup.');
    }
    if (document.format === BACKUP_FORMAT) {
      if (document.version !== BACKUP_VERSION || !document.state || typeof document.state !== 'object') {
        throw new Error('This Harbor backup version is not supported.');
      }
      return normalize(document.state);
    }
    var legacyFields = ['favorites', 'history', 'progress', 'settings'];
    if (!legacyFields.some(function (field) { return Object.prototype.hasOwnProperty.call(document, field); })) {
      throw new Error('This is not a Harbor data backup.');
    }
    return normalize(document);
  }

  function load(storage) {
    var keys = [CURRENT_KEY].concat(LEGACY_KEYS);
    for (var index = 0; index < keys.length; index += 1) {
      var key = keys[index];
      var raw = null;
      try {
        raw = storage.getItem(key);
      } catch {
        return defaults();
      }
      if (raw === null) continue;
      try {
        var state = normalize(JSON.parse(raw));
        if (key !== CURRENT_KEY) {
          try { save(storage, state); } catch { /* The in-memory migration is still usable. */ }
        }
        return state;
      } catch {
        writeRecovery(storage, key, raw);
      }
    }
    return defaults();
  }

  return Object.freeze({
    CURRENT_VERSION: CURRENT_VERSION,
    CURRENT_KEY: CURRENT_KEY,
    LEGACY_KEYS: Object.freeze(LEGACY_KEYS.slice()),
    RECOVERY_KEY: RECOVERY_KEY,
    BACKUP_FORMAT: BACKUP_FORMAT,
    BACKUP_VERSION: BACKUP_VERSION,
    defaults: defaults,
    normalize: normalize,
    load: load,
    save: save,
    createBackup: createBackup,
    parseBackup: parseBackup
  });
});

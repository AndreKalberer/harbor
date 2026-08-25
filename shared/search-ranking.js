(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HarborSearchRanking = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalizeSearchText(value) {
    return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function searchScore(item, term) {
    var needle = normalizeSearchText(term);
    if (!needle) return 0;
    var name = normalizeSearchText(item.name);
    var sections = normalizeSearchText((item.sections || []).join(' '));
    var metadata = normalizeSearchText([item.category, item.type, sections].join(' '));
    var overview = normalizeSearchText(item.overview);
    var tokens = needle.split(' ').filter(Boolean);
    var nameTokens = new Set(name.split(' ').filter(Boolean));
    var metadataTokens = new Set(metadata.split(' ').filter(Boolean));
    var categoryPriority = { Watch: 40, Listen: 30, Read: 20, Play: 10 };
    var score = 0;
    var directMatch = false;

    // An exact title must always outrank a partial title or metadata match.
    // Home search uses a small consumer-media priority to break exact-title ties.
    if (name === needle) { score += 2400 + (categoryPriority[item.category] || 0); directMatch = true; }
    else if (name.startsWith(needle)) {
      score += 900;
      score += Math.max(0, 120 - ((name.length - needle.length) * 3));
      directMatch = true;
    } else if (needle.length >= 3 && name.includes(' ' + needle)) { score += 760; directMatch = true; }
    else if (needle.length >= 3 && name.includes(needle)) { score += 620; directMatch = true; }

    var nameTokenMatches = tokens.filter(function (token) { return nameTokens.has(token); }).length;
    if (nameTokenMatches === tokens.length) score += 360;
    else score += nameTokenMatches * 90;
    if (metadata === needle || sections === needle) { score += 280; directMatch = true; }
    else if (needle.length >= 3 && metadata.includes(needle)) { score += 180; directMatch = true; }
    score += tokens.filter(function (token) { return metadataTokens.has(token); }).length * 45;
    if (needle.length >= 3 && overview.includes(needle)) { score += 35; directMatch = true; }
    var everyTokenMatches = tokens.every(function (token) { return nameTokens.has(token) || metadataTokens.has(token); });
    if (score === 0 || (!directMatch && !everyTokenMatches)) return 0;
    return score + Math.min(10, Number(item.rating) || 0);
  }

  return { normalizeSearchText: normalizeSearchText, searchScore: searchScore };
}));

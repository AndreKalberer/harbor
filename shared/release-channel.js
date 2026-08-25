(function exposeReleaseChannel(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HarborReleaseChannel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createReleaseChannelApi() {
  'use strict';

  function parseVersion(value) {
    var match = String(value || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
    return match ? match.slice(1).map(Number) : null;
  }

  function compareVersions(left, right) {
    var leftParts = parseVersion(left);
    var rightParts = parseVersion(right);
    if (!leftParts || !rightParts) return null;
    for (var index = 0; index < 3; index += 1) {
      if (leftParts[index] > rightParts[index]) return 1;
      if (leftParts[index] < rightParts[index]) return -1;
    }
    return 0;
  }

  function normalizeLatestRelease(value) {
    if (!value || typeof value !== 'object' || value.draft || value.prerelease) return null;
    var version = parseVersion(value.tag_name);
    if (!version) return null;
    return {
      version: version.join('.'),
      tag: 'v' + version.join('.'),
      publishedAt: typeof value.published_at === 'string' ? value.published_at : ''
    };
  }

  return Object.freeze({
    channel: 'stable',
    parseVersion: parseVersion,
    compareVersions: compareVersions,
    normalizeLatestRelease: normalizeLatestRelease
  });
});

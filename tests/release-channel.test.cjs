const assert = require('node:assert/strict');
const releases = require('../shared/release-channel.js');

assert.equal(releases.channel, 'stable');
assert.equal(releases.compareVersions('2.1.0', 'v2.2.0'), -1);
assert.equal(releases.compareVersions('2.2.0', '2.1.9'), 1);
assert.equal(releases.compareVersions('2.1.0', '2.1.0'), 0);
assert.equal(releases.compareVersions('nightly', '2.1.0'), null);
assert.deepEqual(releases.normalizeLatestRelease({ tag_name: 'v2.3.1', published_at: '2026-01-01', draft: false, prerelease: false }), {
  version: '2.3.1',
  tag: 'v2.3.1',
  publishedAt: '2026-01-01'
});
assert.equal(releases.normalizeLatestRelease({ tag_name: 'v2.3.1', prerelease: true }), null);
assert.equal(releases.normalizeLatestRelease({ tag_name: 'latest' }), null);
process.stdout.write('Stable release-channel behavior verified.\n');

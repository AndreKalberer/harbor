const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-tv-staging-'));
const tokens = "$& $1 $` $' $$";
const sources = new Map();
try {
  for (const directory of ['scripts', 'tv', 'shared', 'assets', 'node_modules/hls.js/dist']) {
    fs.mkdirSync(path.join(fixture, directory), { recursive: true });
  }
  fs.copyFileSync(path.join(root, 'scripts/stage-tv.cjs'), path.join(fixture, 'scripts/stage-tv.cjs'));
  for (const directory of ['lg', 'samsung']) {
    fs.cpSync(path.join(root, 'tv', directory), path.join(fixture, 'tv', directory), { recursive: true });
  }
  fs.copyFileSync(path.join(root, 'tv/index.html'), path.join(fixture, 'tv/index.html'));
  fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ version: '2.3.4' }));
  for (const file of ['tv/config.js', 'tv/tv.js', 'shared/series-metadata.js', 'shared/live-tv.js', 'shared/watch-browse.js', 'node_modules/hls.js/dist/hls.min.js']) {
    // Include replacement metacharacters and an HTML script terminator in executable JS.
    const source = `window[${JSON.stringify(file)}] = ${JSON.stringify(tokens + ' </script>')};\n`;
    sources.set(file, source);
    fs.writeFileSync(path.join(fixture, file), source);
  }
  const css = `:root { --literal: ${JSON.stringify(tokens)}; }\n`;
  fs.writeFileSync(path.join(fixture, 'tv/tv.css'), css);
  for (const file of ['harbor-mark.svg', 'tv-icon.png']) fs.copyFileSync(path.join(root, 'assets', file), path.join(fixture, 'assets', file));
  const result = spawnSync(process.execPath, [path.join(fixture, 'scripts/stage-tv.cjs')], {
    encoding: 'utf8', env: { ...process.env, TMDB_API_KEY: '', NODE_PATH: path.join(root, 'node_modules') }
  });
  assert.equal(result.status, 0, result.stderr);
  const html = fs.readFileSync(path.join(fixture, 'tv/build/lg/index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script nonce="harbor-lg-bundle">([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.equal(scripts.length, sources.size, 'All six bundled scripts retain their HTML boundaries');
  const context = vm.createContext({ window: {} });
  for (const [file, source] of sources) {
    // HTML order is shared libraries, config, HLS, then TV; match by file marker.
    const actual = scripts.find(script => script.includes(JSON.stringify(file)));
    assert.equal(actual, source.replaceAll('</script', '<\\/script'), `${file}: literal replacement tokens survive staging`);
    vm.runInContext(actual, context, { filename: file });
    assert.equal(context.window[file], tokens + ' </script>', `${file}: generated JS retains its original value`);
  }
  assert.ok(html.includes(`<style nonce="harbor-lg-bundle">${css}</style>`), 'CSS replacement tokens survive staging');
  assert.ok(html.includes("script-src 'nonce-harbor-lg-bundle'; style-src 'nonce-harbor-lg-bundle';"), 'Nonce CSP remains in place');
  assert.equal(/<script[^>]*\bsrc=/.test(html), false, 'LG page has no external script tags');
  for (const platform of ['android-assets', 'samsung']) {
    assert.equal(fs.readFileSync(path.join(fixture, 'tv/build', platform, 'shared/hls.min.js'), 'utf8'), sources.get('node_modules/hls.js/dist/hls.min.js'));
  }
  console.log('TV staging regression passed: literal tokens in all JS/CSS injections, script escaping, CSP, and external platform copies.');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

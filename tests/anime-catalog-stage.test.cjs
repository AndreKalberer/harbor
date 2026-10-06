'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname,'..');
const asset = fs.readFileSync(path.join(root,'shared/anime-metadata.js'),'utf8');
for(const platform of ['android-assets','samsung']) {
  assert.equal(fs.readFileSync(path.join(root,'tv/build',platform,'shared/anime-metadata.js'),'utf8'),asset);
  const html=fs.readFileSync(path.join(root,'tv/build',platform,'index.html'),'utf8');
  assert(html.indexOf('shared/anime-metadata.js')<html.indexOf('shared/anime-catalog.js'));
  assert(html.indexOf('shared/anime-catalog.js')<html.indexOf('shared/watch-browse.js'));
}
const lg=fs.readFileSync(path.join(root,'tv/build/lg/index.html'),'utf8');
assert(lg.includes(asset.replaceAll('</script','<\\/script')));
assert(lg.includes("script-src 'nonce-harbor-lg-bundle'"));
const context=vm.createContext({});vm.runInContext(asset,context);
assert.equal(context.HarborAnimeMetadata.rows.length,4132);
console.log('Anime asset staging, exact LG inline literal and CSP checks passed.');

const assert = require('node:assert/strict');
const playbackProviders = require('../shared/playback-providers.js');

assert.deepEqual(playbackProviders.providers.map((provider) => provider.id), [
  'vidlink',
  'vidsrc',
  'autoembed',
  'superembed',
  'vidfast',
  '111movies',
  'videasy',
  'vidcore',
  'cinesrc',
  'vidapi'
]);

assert.deepEqual(playbackProviders.allowedHosts, [
  'vidlink.pro',
  'vidsrc.to',
  'autoembed.to',
  'multiembed.mov',
  'streamingnow.mov',
  'vidfast.pro',
  'vidfast.vc',
  '111movies.net',
  'player.vidlove.cc',
  'player.videasy.net',
  'player.videasy.to',
  'vidcore.io',
  'cinesrc.st',
  'vaplayer.ru'
]);

assert.equal(playbackProviders.resolve('vidlink', '42', false, 1, 1), 'https://vidlink.pro/movie/42');
assert.equal(playbackProviders.resolve('vidsrc', '42', true, 3, 7), 'https://vidsrc.to/embed/tv/42/3/7');
assert.equal(playbackProviders.resolve('autoembed', '42', true, 3, 7), 'https://autoembed.to/tv/tmdb/42/3/7');
assert.equal(playbackProviders.resolve('superembed', '42', false, 1, 1), 'https://multiembed.mov/?video_id=42&tmdb=1');
assert.equal(playbackProviders.resolve('vidfast', '42', false, 1, 1), 'https://vidfast.pro/movie/42');
assert.equal(playbackProviders.resolve('111movies', '42', false, 1, 1), 'https://111movies.net/movie/42');
assert.equal(playbackProviders.resolve('videasy', '42', false, 1, 1), 'https://player.videasy.net/movie/42');
assert.equal(playbackProviders.resolve('vidcore', '42', false, 1, 1), 'https://vidcore.io/movie/42');
assert.equal(playbackProviders.resolve('cinesrc', '42', true, 3, 7), 'https://cinesrc.st/embed/tv/42?s=3&e=7');
assert.equal(playbackProviders.resolve('vidapi', '42', false, 1, 1), 'https://vaplayer.ru/embed/movie/42');
assert.equal(playbackProviders.resolve('missing', '42', false, 1, 1), 'https://vidlink.pro/movie/42');

process.stdout.write('Playback provider registry verified.\n');

// Per-title catalog provenance must not turn a preference or a successful page
// request into a claim that the provider has a working stream.
const movie = {type:'movie',tmdbId:'42',providerListings:[{providerId:'vidapi',mediaType:'movie',tmdbId:'42'}]};
assert.deepEqual(playbackProviders.listedMovieProviders(movie).map(p=>p.id), ['vidapi']);
for (const item of [null, {}, {type:'movie',tmdbId:'42',preferredProviderId:'vidapi'},
  {type:'movie',tmdbId:'42',id:'vidsrc-movie-42'},
  {...movie,tmdbId:'43'}, {...movie,type:'tv'}, {...movie,type:'anime'},
  {...movie,providerListings:[{providerId:'vidlink',mediaType:'movie',tmdbId:'42'}]},
  {...movie,providerListings:[{providerId:'vidapi',mediaType:'tv',tmdbId:'42'}]},
  {...movie,providerListings:'vidapi'}]) {
  assert.deepEqual(playbackProviders.listedMovieProviders(item), []);
  assert.equal(playbackProviders.serverGroups(item)[0].providers.length,10,'No data must retain all unknown fallbacks');
}
assert.deepEqual(playbackProviders.serverGroups(movie).map(g=>g.providers.length),[1,9]);
assert.equal(playbackProviders.serverGroups(movie)[0].providers[0].id,'vidapi');
assert.equal(playbackProviders.serverGroups(null)[0].providers.length,10);

// Exercise the real UI grouping, catalog formatter and saved-state projection.
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const renderer=fs.readFileSync(path.join(__dirname,'../app/renderer.js'),'utf8');
const element=tag=>({tag,children:[],append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;}});
const select=element('select');
const context=vm.createContext({playbackProvidersApi:playbackProviders,streamServerSelect:select,document:{createElement:element},TMDB_GENRE_LABELS:{}});
function extract(start,end){return renderer.slice(renderer.indexOf(start),renderer.indexOf(end,renderer.indexOf(start)));}
vm.runInContext(extract('const updateStreamServerOptions =','const WATCH_CATALOG ='),context);
vm.runInContext(extract('const formatVidSrcMovie =','const loadVidSrcMovieCatalog ='),context);
vm.runInContext(extract('const mediaSnapshot =','const persistUserState ='),context);
vm.runInContext("globalThis.listed=formatVidSrcMovie({tmdb_id:'42',title:'Listed movie'}); updateStreamServerOptions(listed); globalThis.saved=mediaSnapshot(listed);",context);
assert.equal(select.children.length,2);
assert.equal(select.children[0].children[0].value,'vidapi');
assert.match(select.children[0].children[0].textContent,/listed by VidAPI/);
assert.match(select.children[0].label,/playback not verified/);
assert.equal(select.children[1].children.length,9);
assert.deepEqual(playbackProviders.listedMovieProviders(context.saved).map(p=>p.id),['vidapi']);
// A different or unlisted title immediately replaces prior title provenance.
vm.runInContext("updateStreamServerOptions({type:'movie',tmdbId:'43',preferredProviderId:'vidapi'});",context);
assert.equal(select.children.length,1);
assert.equal(select.children[0].children.length,10);
assert(select.children[0].children.every(option=>/try server/.test(option.textContent)));
vm.runInContext('updateStreamServerOptions(null);',context);
assert.equal(select.children[0].children.length,10);
console.log('Catalog provenance, unknown fallback retention, saved listing and title replacement verified.');

const userState = require('../shared/user-state.js');
const restored=userState.normalize({favorites:[context.saved]}).favorites[0];
assert.deepEqual(playbackProviders.listedMovieProviders(restored).map(p=>p.id),['vidapi'],'Saved state must preserve catalog provenance');
for (const bad of [{...context.saved,tmdbId:'43'}, {...context.saved,type:'tv'}, {...context.saved,providerListings:[{providerId:'vidapi',mediaType:'tv',tmdbId:'42'}]}, {...context.saved,providerListings:null}, {...context.saved,tmdbId:'1'.repeat(101),providerListings:[{providerId:'vidapi',mediaType:'movie',tmdbId:'1'.repeat(101)}]}]) {
  assert.deepEqual(userState.normalize({favorites:[bad]}).favorites[0].providerListings,[]);
}
console.log('Saved-state normalization roundtrip and invalid listing rejection verified.');

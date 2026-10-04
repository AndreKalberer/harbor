const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const watchBrowse = require('../shared/watch-browse.js');
const readSource = relative => process.env.HARBOR_QA_ASAR
  ? require('@electron/asar').extractFile(process.env.HARBOR_QA_ASAR, relative).toString('utf8')
  : fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');

// Exercise the actual main-process fetch and renderer browse path without network
// access, a real API key, or changes to the user's profile.
function extract(source, start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  assert(first >= 0 && last > first, 'Catalog function boundaries must exist');
  return source.slice(first, last);
}
async function run() {
  const requests = [];
  const fixtures = [
    { tmdb_id: '100', title: 'A romance', genre: 'Romance', poster_url: 'https://image.tmdb.org/t/p/original/romance.jpg', rating: 4 },
    { tmdb_id: '101', title: 'An adventure', genres: [{ id: 28, name: 'Action' }], rating: 9 },
    { tmdb_id: '102', title: 'A haunting', genres: [27], rating: 6 }
  ];
  const main = vm.createContext({AbortSignal,app:{getVersion:()=> '2.3.3'},net:{fetch:async url => {
    requests.push(url);
    const page = Number(url.match(/page-(\d+)\.json$/)?.[1]) || 1;
    return {ok:true,json:async()=>({page,total_pages:52,total:1248,items:page < 50 ? fixtures : [
      {tmdb_id:String(1000+page),title:'Page '+page,genres:['Action'],rating:8}
    ]})};
  }}});
  const mainSource = readSource('electron/main.cjs');
  vm.runInContext(extract(mainSource,'const fetchVidSrcMovies =','const isAllowedStreamUrl ='),main);
  const fetchPage = page => {main.requestedPage=page;return vm.runInContext('fetchVidSrcMovies(null, requestedPage)',main);};
  const renderer = vm.createContext({
    window:{harbor:{getVidSrcMovies:fetchPage}}, TMDB_API_KEY:'',
    TMDB_GENRE_LABELS:{28:'Action',27:'Horror'}, watchBrowseApi:watchBrowse,
    activeCategory:'Watch',activeSubcategory:'Movies',activeWatchFilter:'action',
    watchBrowsePage:1,watchBrowseGeneration:0,watchBrowseKey:'',watchBrowseItems:[],
    watchBrowseLoading:false,watchBrowseLoaded:false,watchBrowseCanLoadMore:false,
    movieCatalogInfo:null,movieCatalogError:'',movieCatalogRetryPage:1,loadedProviderMovies:new Map(),
    currentWatchBrowseKey:()=>renderer.activeWatchFilter,
    itemMatchesWatchFilter:item=>watchBrowse.matchesLocalFilter(item,'Movies',renderer.activeWatchFilter),
    getSectionItems:()=>[], renderResources:()=>{}, mediaKey:item=>item.tmdbId,
    showStatusToast:()=>{throw new Error('Unexpected catalog failure');}, query:''
  });
  const rendererSource = readSource('app/renderer.js');
  vm.runInContext(extract(rendererSource,'const formatVidSrcMovie =','const loadMoreWatchBrowse ='),renderer);
  const browse = append => vm.runInContext(`loadActiveWatchBrowse({append:${Boolean(append)}})`,renderer);
  const ids = () => Array.from(renderer.watchBrowseItems,item=>item.tmdbId);
  await browse(false); assert.deepEqual(ids(),['101'],'Action must exclude the Romance fixture');
  renderer.activeWatchFilter='horror'; await browse(false); assert.deepEqual(ids(),['102']);
  renderer.activeWatchFilter='top-rated'; await browse(false); assert.deepEqual(ids(),['101']);
  assert(renderer.watchBrowseCanLoadMore,'Filtering a page must preserve upstream pagination');
  renderer.activeWatchFilter='documentary'; await browse(false); assert.deepEqual(ids(),[]);
  assert(renderer.watchBrowseCanLoadMore,'An empty filtered page is not the end of the feed');
  renderer.activeWatchFilter='popular'; renderer.watchBrowsePage=49; renderer.watchBrowseItems=[];
  await browse(true); await browse(true); await browse(true);
  assert.deepEqual(ids(),['1050','1051','1052'],'Pages above 50 must not repeat page 50');
  assert(requests.includes('https://vidapi.ru/movies/latest/page-51.json'));
  assert.equal(renderer.watchBrowseCanLoadMore,false,'The upstream final page must stop pagination');
  for(const page of [0,-1,1.5,Infinity,NaN,'not-a-page',Number.MAX_SAFE_INTEGER+1]) {
    const before=requests.length;
    assert.equal((await fetchPage(page)).status,'error');
    assert.equal(requests.length,before,'Invalid page values must not trigger a request');
  }
  assert.equal((await fetchPage(undefined)).status,'ok');
  console.log('Movie filters, genre formats, page 50→51→52, final-page state, and invalid pages verified.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});

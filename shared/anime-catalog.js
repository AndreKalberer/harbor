(function(root,factory){
  var source=typeof module==='object'&&module.exports?require('./anime-metadata.js'):root&&root.HarborAnimeMetadata;
  var api=factory(source);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.HarborAnimeCatalog=api;
}(typeof globalThis!=='undefined'?globalThis:this,function(source){
  'use strict';
  function identity(item){return (item.type==='movie'?'movie':'tv')+'/'+String(item.tmdbId||'');}
  function items(existing,surface){
    var known={},seen={}, result=[];
    (existing||[]).forEach(function(item){if(item.tmdbId)known[identity(item)]=item;});
    ((source&&source.rows)||[]).forEach(function(row){
      var key=row.type+'/'+row.tmdbId;
      if(seen[key]||row.adult!==false||(row.type==='movie'&&row.video!==false))return;
      seen[key]=true;
      if(known[key]){result.push(known[key]);return;}
      var movie=row.type==='movie';
      var item={id:surface==='tv'?(movie?'movie-':'anime-')+row.tmdbId:(movie?'vidsrc-movie-':'vidsrc-tv-')+row.tmdbId,
        tmdbId:row.tmdbId,name:row.name,category:'Watch',type:movie?'movie':'anime',
        year:'',rating:'',sections:['Anime','Metadata only',movie?'Feature':'Series'],section:'Anime',
        overview:'Anime '+(movie?'film':'series')+' metadata from Wikidata. Playback availability has not been verified.',
        artworkUrl:'',sourceEntityId:row.entityId,sourceDate:row.sourceDate,
        aliases:[row.japaneseLabel,row.originalTitle].filter(Boolean),metadataOnly:true,
        popularity:row.popularity};
      item.summary=item.overview;item.image='';item.tags=item.sections;
      item.meta='Anime '+(movie?'film':'series')+' · Metadata only';
      result.push(item);
    });
    return result;
  }
  function filters(){return [{id:'library',label:'Library',source:'anime-metadata'},
    {id:'movies',label:'Movies',source:'anime-metadata',local:{mediaType:'movie'}}];}
  function matchesQuery(item,query){
    var fold=function(value){return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();};
    var needle=fold(query);
    return !needle||[item.name].concat(item.aliases||[]).some(function(value){return fold(value).indexOf(needle)>=0;});
  }
  function page(all,filterId,number,query){
    var n=Number.isSafeInteger(number)&&number>0?number:1;
    var seen={},filtered=all.filter(function(item){var key=identity(item);
      if(seen[key]||(filterId==='movies'&&item.type!=='movie')||!matchesQuery(item,query))return false;
      seen[key]=true;return true;}).sort(function(a,b){return a.name.localeCompare(b.name)||identity(a).localeCompare(identity(b));});
    return {items:filtered.slice((n-1)*40,n*40),total:filtered.length,page:n,totalPages:Math.ceil(filtered.length/40),canLoadMore:n*40<filtered.length};
  }
  return {items:items,filters:filters,page:page,identity:identity,matchesQuery:matchesQuery};
}));

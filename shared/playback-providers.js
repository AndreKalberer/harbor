(function exposePlaybackProviders(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HarborPlaybackProviders = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createPlaybackProviders() {
  'use strict';

  var providers = [
    {
      id: 'vidlink',
      name: 'VidLink Pro [Fastest 1080p]',
      badge: 'badge-stream',
      host: 'vidlink.pro',
      movieTemplate: 'https://vidlink.pro/movie/{id}',
      seriesTemplate: 'https://vidlink.pro/tv/{id}/{season}/{episode}'
    },
    {
      id: 'vidsrc',
      name: 'VidSrc Ultra HD 4K',
      badge: 'badge-embed',
      host: 'vidsrc.to',
      movieTemplate: 'https://vidsrc.to/embed/movie/{id}',
      seriesTemplate: 'https://vidsrc.to/embed/tv/{id}/{season}/{episode}'
    },
    {
      id: 'autoembed',
      name: 'AutoEmbed Direct 1080p',
      badge: 'badge-stream',
      host: 'autoembed.to',
      movieTemplate: 'https://autoembed.to/movie/tmdb/{id}',
      seriesTemplate: 'https://autoembed.to/tv/tmdb/{id}/{season}/{episode}'
    },
    {
      id: 'superembed',
      name: 'SuperEmbed Multi-Source',
      badge: 'badge-embed',
      host: 'multiembed.mov',
      navigationHosts: ['streamingnow.mov'],
      movieTemplate: 'https://multiembed.mov/?video_id={id}&tmdb=1',
      seriesTemplate: 'https://multiembed.mov/?video_id={id}&tmdb=1&s={season}&e={episode}'
    },
    {
      id: 'vidfast',
      name: 'VidFast',
      badge: 'badge-stream',
      host: 'vidfast.pro',
      navigationHosts: ['vidfast.vc'],
      movieTemplate: 'https://vidfast.pro/movie/{id}',
      seriesTemplate: 'https://vidfast.pro/tv/{id}/{season}/{episode}'
    },
    {
      id: '111movies',
      name: '111Movies',
      badge: 'badge-embed',
      host: '111movies.net',
      navigationHosts: ['player.vidlove.cc'],
      movieTemplate: 'https://111movies.net/movie/{id}',
      seriesTemplate: 'https://111movies.net/tv/{id}/{season}/{episode}'
    },
    {
      id: 'videasy',
      name: 'Videasy',
      badge: 'badge-stream',
      host: 'player.videasy.net',
      navigationHosts: ['player.videasy.to'],
      movieTemplate: 'https://player.videasy.net/movie/{id}',
      seriesTemplate: 'https://player.videasy.net/tv/{id}/{season}/{episode}'
    },
    {
      id: 'vidcore',
      name: 'VidCore',
      badge: 'badge-embed',
      host: 'vidcore.io',
      movieTemplate: 'https://vidcore.io/movie/{id}',
      seriesTemplate: 'https://vidcore.io/tv/{id}/{season}/{episode}'
    },
    {
      id: 'cinesrc',
      name: 'CineSRC',
      badge: 'badge-stream',
      host: 'cinesrc.st',
      movieTemplate: 'https://cinesrc.st/embed/movie/{id}',
      seriesTemplate: 'https://cinesrc.st/embed/tv/{id}?s={season}&e={episode}'
    },
    {
      id: 'vidapi',
      name: 'VidAPI',
      badge: 'badge-stream',
      host: 'vaplayer.ru',
      movieTemplate: 'https://vaplayer.ru/embed/movie/{id}',
      seriesTemplate: 'https://vaplayer.ru/embed/tv/{id}/{season}/{episode}'
    }
  ].map(function (provider) { return Object.freeze(provider); });

  var providerById = Object.fromEntries(providers.map(function (provider) {
    return [provider.id, provider];
  }));

  function resolve(providerId, tmdbId, isSeries, season, episode) {
    var provider = providerById[providerId] || providerById.vidlink;
    var template = isSeries ? provider.seriesTemplate : provider.movieTemplate;
    return template
      .replace('{id}', String(tmdbId || ''))
      .replace('{season}', String(season || 1))
      .replace('{episode}', String(episode || 1));
  }

  return Object.freeze({
    providers: Object.freeze(providers),
    allowedHosts: Object.freeze([...new Set(providers.flatMap(function (provider) {
      return [provider.host, ...(provider.navigationHosts || [])];
    }))]),
    resolve: resolve
  });
});

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
      movieTemplate: 'https://multiembed.mov/?video_id={id}&tmdb=1',
      seriesTemplate: 'https://multiembed.mov/?video_id={id}&tmdb=1&s={season}&e={episode}'
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
    allowedHosts: Object.freeze(providers.map(function (provider) { return provider.host; })),
    resolve: resolve
  });
});

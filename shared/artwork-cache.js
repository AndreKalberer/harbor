(function exposeArtworkCache(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HarborArtworkCache = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createArtworkCacheApi() {
  'use strict';

  var scheme = 'harbor-artwork:';
  var cacheHost = 'cache';

  function isTrustedHost(hostname) {
    var host = String(hostname || '').toLowerCase();
    return host === 'image.tmdb.org'
      || host === 'covers.openlibrary.org'
      || /^is\d+(?:-ssl)?\.mzstatic\.com$/.test(host);
  }

  function normalizeSource(candidate) {
    try {
      var url = new URL(candidate);
      return url.protocol === 'https:' && isTrustedHost(url.hostname) ? url.href : '';
    } catch {
      return '';
    }
  }

  function encode(value) {
    if (typeof Buffer !== 'undefined') return Buffer.from(value, 'utf8').toString('base64url');
    return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function decode(value) {
    if (typeof Buffer !== 'undefined') return Buffer.from(value, 'base64url').toString('utf8');
    var base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return atob(base64);
  }

  function toCacheUrl(candidate) {
    var source = normalizeSource(candidate);
    return source ? scheme + '//' + cacheHost + '/' + encode(source) : '';
  }

  function fromCacheUrl(candidate) {
    try {
      var url = new URL(candidate);
      if (url.protocol !== scheme || url.hostname !== cacheHost) return '';
      return normalizeSource(decode(url.pathname.slice(1)));
    } catch {
      return '';
    }
  }

  return Object.freeze({
    scheme: scheme,
    isTrustedHost: isTrustedHost,
    normalizeSource: normalizeSource,
    toCacheUrl: toCacheUrl,
    fromCacheUrl: fromCacheUrl
  });
});

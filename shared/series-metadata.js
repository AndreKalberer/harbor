(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HarborSeriesMetadata = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function positiveInteger(value, fallback) {
    var parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : (fallback || 0);
  }

  function normalizeSeriesSeasons(data, fallbackEpisodeCount) {
    var seasons = data && Array.isArray(data.seasons) ? data.seasons : [];
    var normalized = seasons.filter(function (season) {
      return positiveInteger(season && season.season_number, 0) > 0
        && positiveInteger(season && season.episode_count, 0) > 0;
    }).map(function (season) {
      var number = positiveInteger(season.season_number, 1);
      var airDate = String(season.air_date || '');
      return {
        number: number,
        name: String(season.name || ('Season ' + number)),
        episodeCount: positiveInteger(season.episode_count, 1),
        airDate: airDate,
        year: airDate ? airDate.slice(0, 4) : '',
        posterPath: String(season.poster_path || '')
      };
    }).sort(function (left, right) { return left.number - right.number; });

    if (!normalized.length && positiveInteger(fallbackEpisodeCount, 0) > 0) {
      normalized.push({
        number: 1,
        name: 'Season 1',
        episodeCount: positiveInteger(fallbackEpisodeCount, 1),
        airDate: '',
        year: '',
        posterPath: ''
      });
    }
    return normalized;
  }

  function findSeason(seasons, seasonNumber) {
    var list = Array.isArray(seasons) ? seasons : [];
    var requested = positiveInteger(seasonNumber, list[0] ? list[0].number : 1);
    return list.find(function (season) { return season.number === requested; }) || list[0] || null;
  }

  function clampSelection(seasons, seasonNumber, episodeNumber) {
    var season = findSeason(seasons, seasonNumber);
    if (!season) return { season: 1, episode: 1, episodeCount: 1 };
    var episode = Math.min(positiveInteger(episodeNumber, 1), season.episodeCount);
    return { season: season.number, episode: episode, episodeCount: season.episodeCount };
  }

  function stepSelection(seasons, seasonNumber, episodeNumber, direction) {
    var list = Array.isArray(seasons) ? seasons : [];
    var current = clampSelection(list, seasonNumber, episodeNumber);
    var index = list.findIndex(function (season) { return season.number === current.season; });
    if (direction > 0) {
      if (current.episode < current.episodeCount) return { season: current.season, episode: current.episode + 1 };
      if (index >= 0 && index < list.length - 1) return { season: list[index + 1].number, episode: 1 };
    }
    if (direction < 0) {
      if (current.episode > 1) return { season: current.season, episode: current.episode - 1 };
      if (index > 0) return { season: list[index - 1].number, episode: list[index - 1].episodeCount };
    }
    return null;
  }

  return {
    normalizeSeriesSeasons: normalizeSeriesSeasons,
    findSeason: findSeason,
    clampSelection: clampSelection,
    stepSelection: stepSelection
  };
}));

const categoryList = document.querySelector('#category-list');
const watchFilterList = document.querySelector('#watch-filter-list');
const liveDirectoryControls = document.querySelector('#live-directory-controls');
const liveCountrySelect = document.querySelector('#live-country-select');
const liveLanguageSelect = document.querySelector('#live-language-select');
const liveDirectoryStatus = document.querySelector('#live-directory-status');
const resourceList = document.querySelector('#resource-list');
const searchInput = document.querySelector('#resource-search');
const compactSearchButton = document.querySelector('#compact-search-button');
const primaryNav = document.querySelector('#primary-nav');
const directoryTitle = document.querySelector('#directory-title');
const heroKicker = document.querySelector('#hero-kicker');
const heroPrimaryButton = document.querySelector('#hero-primary-button');
const heroLibraryButton = document.querySelector('#hero-library-button');
const heroFeature = document.querySelector('#hero-feature');
const heroFeatureTitle = document.querySelector('#hero-feature-title');
const heroFeatureMeta = document.querySelector('#hero-feature-meta');
const heroSection = document.querySelector('.hero');
const resultsLabel = document.querySelector('#results-label');
const clearButton = document.querySelector('#clear-button');
const showAllButton = document.querySelector('#show-all-button');
const emptyState = document.querySelector('#empty-state');
const catalogCount = document.querySelector('#catalog-count');
const appVersion = document.querySelector('#app-version');
const welcomeDialog = document.querySelector('#welcome-dialog');
const welcomeStartButton = document.querySelector('#welcome-start-button');
const welcomeMyHarborButton = document.querySelector('#welcome-my-harbor-button');
const artworkCacheApi = window.HarborArtworkCache;
const updateButton = document.querySelector('#update-button');
const updateDialog = document.querySelector('#update-dialog');
const updateTitle = document.querySelector('#update-title');
const chooseUpdateButton = document.querySelector('#choose-update-button');
const releasePageButton = document.querySelector('#release-page-button');
const updateStatus = document.querySelector('#update-status');
const providerDisclosure = document.querySelector('#provider-disclosure');
const diagnosticSummary = document.querySelector('#diagnostic-summary');
const copyDiagnosticsButton = document.querySelector('#copy-diagnostics-button');
const supportPageButton = document.querySelector('#support-page-button');
const tmdbPageButton = document.querySelector('#tmdb-page-button');

// Detail Dialog
const mediaDetailDialog = document.querySelector('#media-detail-dialog');
const closeDetailDialogBtn = document.querySelector('#close-detail-dialog-btn');
const detailTitle = document.querySelector('#detail-title');
const detailSubtitle = document.querySelector('#detail-subtitle');
const detailOverview = document.querySelector('#detail-overview');
const detailLiveGuide = document.querySelector('#detail-live-guide');
const detailGuideStatus = document.querySelector('#detail-guide-status');
const detailGuideList = document.querySelector('#detail-guide-list');
const detailEpisodesWrap = document.querySelector('#detail-episodes-wrap');
const detailSeasonSelect = document.querySelector('#detail-season-select');
const detailSeasonRow = detailSeasonSelect.closest('.episodes-select-row');
const detailEpisodesList = document.querySelector('#detail-episodes-list');
const detailPlayBtn = document.querySelector('#detail-play-btn');
const detailSaveBtn = document.querySelector('#detail-save-btn');

// In-App Stream Player Dialog
const inAppStreamDialog = document.querySelector('#in-app-stream-dialog');
const closeStreamDialogBtn = document.querySelector('#close-stream-dialog-btn');
const streamDialogTitle = document.querySelector('#stream-dialog-title');
const streamEpisodeTag = document.querySelector('#stream-episode-tag');
const streamServerSelect = document.querySelector('#stream-server-select');
const streamPrevBtn = document.querySelector('#stream-prev-btn');
const streamNextBtn = document.querySelector('#stream-next-btn');
const streamInAppWebview = document.querySelector('#stream-in-app-webview');
const streamDirectVideo = document.querySelector('#stream-direct-video');
const streamStatusOverlay = document.querySelector('#stream-status-overlay');
const streamStatusTitle = document.querySelector('#stream-status-title');
const streamStatusDetail = document.querySelector('#stream-status-detail');
const streamRetryButton = document.querySelector('#stream-retry-button');

// My Harbor
const myHarborDialog = document.querySelector('#my-harbor-dialog');
const closeMyHarborButton = document.querySelector('#close-my-harbor-button');
const myHarborTabs = document.querySelector('#my-harbor-tabs');
const myHarborContent = document.querySelector('#my-harbor-content');
const myListCount = document.querySelector('#my-list-count');
const continueCount = document.querySelector('#continue-count');
const historyCount = document.querySelector('#history-count');
const openLocalLibraryButton = document.querySelector('#open-local-library-button');

// Library Dialog
const playerButton = document.querySelector('#player-button');
const playerDialog = document.querySelector('#player-dialog');
const closePlayerButton = document.querySelector('#close-player-button');
const playerStage = document.querySelector('#player-stage');
const playerPlaceholder = document.querySelector('#player-placeholder');
const placeholderTitle = document.querySelector('#placeholder-title');
const placeholderText = document.querySelector('#placeholder-text');
const mediaFileInput = document.querySelector('#media-file-input');
const mediaName = document.querySelector('#media-name');
const mediaDetails = document.querySelector('#media-details');
const videoPlayer = document.querySelector('#video-player');
const audioPlayerShell = document.querySelector('#audio-player-shell');
const audioPlayer = document.querySelector('#audio-player');
const clearMediaButton = document.querySelector('#clear-media-button');
const readerToolbar = document.querySelector('#reader-toolbar');
const previousPageButton = document.querySelector('#previous-page-button');
const nextPageButton = document.querySelector('#next-page-button');
const pageStatus = document.querySelector('#page-status');
const zoomControls = document.querySelector('#zoom-controls');
const zoomOutButton = document.querySelector('#zoom-out-button');
const zoomInButton = document.querySelector('#zoom-in-button');
const zoomStatus = document.querySelector('#zoom-status');
const pdfViewerShell = document.querySelector('#pdf-viewer-shell');
const pdfCanvas = document.querySelector('#pdf-canvas');
const epubViewerShell = document.querySelector('#epub-viewer-shell');
const epubDocument = document.querySelector('#epub-document');
const comicViewerShell = document.querySelector('#comic-viewer-shell');
const comicPage = document.querySelector('#comic-page');
const gameViewerShell = document.querySelector('#game-viewer-shell');
const gameName = document.querySelector('#game-name');
const gameStatus = document.querySelector('#game-status');
const playGameButton = document.querySelector('#play-game-button');
const addGameButton = document.querySelector('#add-game-button');
const addGamePlaceholderButton = document.querySelector('#add-game-placeholder-button');

let readerMode = 'empty';
let pdfDocument = null;
let pdfPageNumber = 1;
let pdfZoom = 1.15;
let comicEntries = [];
let comicArchive = null;
let comicPageNumber = 0;
let selectedGameToken = null;
const activeObjectUrls = new Set();

const rememberObjectUrl = (blob) => {
  const url = URL.createObjectURL(blob);
  activeObjectUrls.add(url);
  return url;
};

const releaseObjectUrls = () => {
  activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  activeObjectUrls.clear();
};

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** unit);
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
};

const hideLibraryViews = () => {
  playerPlaceholder.hidden = true;
  videoPlayer.hidden = true;
  audioPlayerShell.hidden = true;
  pdfViewerShell.hidden = true;
  epubViewerShell.hidden = true;
  comicViewerShell.hidden = true;
  gameViewerShell.hidden = true;
  readerToolbar.hidden = true;
  zoomControls.hidden = true;
};

const resetLocalLibrary = () => {
  videoPlayer.pause();
  videoPlayer.removeAttribute('src');
  audioPlayer.pause();
  audioPlayer.removeAttribute('src');
  releaseObjectUrls();
  pdfDocument = null;
  comicArchive = null;
  comicEntries = [];
  readerMode = 'empty';
  hideLibraryViews();
  playerPlaceholder.hidden = false;
  clearMediaButton.hidden = true;
  mediaName.textContent = 'Open media from this computer';
  mediaDetails.textContent = 'Open video, audio, PDF, EPUB, CBZ, or an installed game';
};

const renderPdfPage = async () => {
  if (!pdfDocument) return;
  const page = await pdfDocument.getPage(pdfPageNumber);
  const viewport = page.getViewport({ scale: pdfZoom });
  const context = pdfCanvas.getContext('2d', { alpha: false });
  pdfCanvas.width = Math.ceil(viewport.width);
  pdfCanvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: context, viewport }).promise;
  pageStatus.textContent = `Page ${pdfPageNumber} of ${pdfDocument.numPages}`;
  zoomStatus.textContent = `${Math.round(pdfZoom * 100)}%`;
  previousPageButton.disabled = pdfPageNumber <= 1;
  nextPageButton.disabled = pdfPageNumber >= pdfDocument.numPages;
};

const openPdf = async (file) => {
  const pdfjs = await import('../node_modules/pdfjs-dist/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs', window.location.href).href;
  pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  pdfPageNumber = 1;
  pdfZoom = 1.15;
  readerMode = 'pdf';
  readerToolbar.hidden = false;
  zoomControls.hidden = false;
  pdfViewerShell.hidden = false;
  await renderPdfPage();
};

const sanitizeBookDocument = (bookDocument) => {
  bookDocument.querySelectorAll('script, iframe, object, embed, form, base, meta[http-equiv]').forEach((node) => node.remove());
  bookDocument.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith('on') || name === 'srcdoc') node.removeAttribute(attribute.name);
      if ((name === 'src' || name === 'href') && /^(?:https?:|javascript:|data:text\/html)/i.test(value)) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return bookDocument;
};

const openEpub = async (file) => {
  const archive = await JSZip.loadAsync(await file.arrayBuffer());
  const containerEntry = archive.file(/META-INF\/container\.xml$/i)[0];
  if (!containerEntry) throw new Error('EPUB container metadata is missing.');
  const parser = new DOMParser();
  const container = parser.parseFromString(await containerEntry.async('string'), 'application/xml');
  const packagePath = container.querySelector('rootfile')?.getAttribute('full-path');
  if (!packagePath) throw new Error('EPUB package metadata is missing.');
  const packageEntry = archive.file(packagePath);
  if (!packageEntry) throw new Error('EPUB package file is missing.');
  const packageDocument = parser.parseFromString(await packageEntry.async('string'), 'application/xml');
  const manifest = new Map(
    [...packageDocument.querySelectorAll('manifest item')].map((item) => [item.getAttribute('id'), item.getAttribute('href')])
  );
  const packageDirectory = packagePath.includes('/') ? packagePath.slice(0, packagePath.lastIndexOf('/') + 1) : '';
  const chapters = [...packageDocument.querySelectorAll('spine itemref')]
    .map((item) => manifest.get(item.getAttribute('idref')))
    .filter(Boolean)
    .map((chapter) => packageDirectory + chapter);
  const firstChapter = archive.file(chapters[0]);
  if (!firstChapter) throw new Error('EPUB chapter content is missing.');
  const chapterDocument = sanitizeBookDocument(
    parser.parseFromString(await firstChapter.async('string'), 'text/html')
  );
  epubDocument.replaceChildren(
    ...[...chapterDocument.body.childNodes].map((node) => document.importNode(node, true))
  );
  readerMode = 'epub';
  readerToolbar.hidden = false;
  epubViewerShell.hidden = false;
  pageStatus.textContent = `Chapter 1 of ${Math.max(chapters.length, 1)}`;
  previousPageButton.disabled = true;
  nextPageButton.disabled = chapters.length <= 1;
};

const naturalNameSort = (left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });

const renderComicPage = async () => {
  if (!comicArchive || !comicEntries.length) return;
  releaseObjectUrls();
  const image = await comicArchive.file(comicEntries[comicPageNumber]).async('blob');
  comicPage.src = rememberObjectUrl(image);
  comicPage.alt = `Comic page ${comicPageNumber + 1}`;
  pageStatus.textContent = `Page ${comicPageNumber + 1} of ${comicEntries.length}`;
  previousPageButton.disabled = comicPageNumber <= 0;
  nextPageButton.disabled = comicPageNumber >= comicEntries.length - 1;
};

const openComic = async (file) => {
  comicArchive = await JSZip.loadAsync(await file.arrayBuffer());
  comicEntries = Object.keys(comicArchive.files)
    .filter((name) => !comicArchive.files[name].dir && /\.(?:png|jpe?g|webp|gif)$/i.test(name))
    .sort(naturalNameSort);
  if (!comicEntries.length) throw new Error('No comic pages were found in this CBZ file.');
  comicPageNumber = 0;
  readerMode = 'comic';
  readerToolbar.hidden = false;
  comicViewerShell.hidden = false;
  await renderComicPage();
};

const openLocalFile = async (file) => {
  if (!file) return;
  hideLibraryViews();
  releaseObjectUrls();
  clearMediaButton.hidden = false;
  mediaName.textContent = file.name;
  mediaDetails.textContent = `${file.type || 'Local file'} · ${formatFileSize(file.size)}`;
  if (!playerDialog.open) playerDialog.showModal();

  const extension = file.name.split('.').pop()?.toLowerCase();
  try {
    if (file.type.startsWith('video/') || ['mp4', 'm4v', 'webm', 'ogv'].includes(extension)) {
      readerMode = 'video';
      videoPlayer.src = rememberObjectUrl(file);
      videoPlayer.hidden = false;
      videoPlayer.load();
    } else if (file.type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'oga', 'aac', 'm4a', 'flac'].includes(extension)) {
      readerMode = 'audio';
      audioPlayer.src = rememberObjectUrl(file);
      audioPlayerShell.hidden = false;
      audioPlayer.load();
    } else if (extension === 'pdf' || file.type === 'application/pdf') {
      await openPdf(file);
    } else if (extension === 'epub') {
      await openEpub(file);
    } else if (extension === 'cbz') {
      await openComic(file);
    } else {
      throw new Error('This file type is not supported yet.');
    }
  } catch (error) {
    readerMode = 'error';
    playerPlaceholder.hidden = false;
    placeholderTitle.textContent = 'Could not open this file';
    placeholderText.textContent = error.message || 'Try another local media file.';
    mediaDetails.textContent = error.message || 'The file could not be opened.';
  }
};

const chooseInstalledGame = async () => {
  const result = await window.harbor?.chooseGame?.();
  if (!result || result.status === 'cancelled') return;
  if (result.status !== 'selected') {
    gameStatus.textContent = result.message || 'That game could not be added.';
    return;
  }
  hideLibraryViews();
  readerMode = 'game';
  selectedGameToken = result.token;
  gameName.textContent = result.name;
  gameStatus.textContent = 'Ready to launch';
  gameViewerShell.hidden = false;
  clearMediaButton.hidden = false;
  mediaName.textContent = result.name;
  mediaDetails.textContent = 'Installed game · stays on this computer';
  void refreshSavedGameLibrary();
};

mediaFileInput.addEventListener('change', () => {
  const [file] = mediaFileInput.files;
  void openLocalFile(file);
  mediaFileInput.value = '';
});

playerStage.addEventListener('dragover', (event) => {
  event.preventDefault();
});

playerStage.addEventListener('drop', (event) => {
  event.preventDefault();
  const [file] = event.dataTransfer.files;
  void openLocalFile(file);
});

previousPageButton.addEventListener('click', () => {
  if (readerMode === 'pdf' && pdfPageNumber > 1) {
    pdfPageNumber -= 1;
    void renderPdfPage();
  } else if (readerMode === 'comic' && comicPageNumber > 0) {
    comicPageNumber -= 1;
    void renderComicPage();
  }
});

nextPageButton.addEventListener('click', () => {
  if (readerMode === 'pdf' && pdfPageNumber < pdfDocument.numPages) {
    pdfPageNumber += 1;
    void renderPdfPage();
  } else if (readerMode === 'comic' && comicPageNumber < comicEntries.length - 1) {
    comicPageNumber += 1;
    void renderComicPage();
  }
});

zoomOutButton.addEventListener('click', () => {
  if (readerMode !== 'pdf') return;
  pdfZoom = Math.max(0.55, pdfZoom - 0.15);
  void renderPdfPage();
});

zoomInButton.addEventListener('click', () => {
  if (readerMode !== 'pdf') return;
  pdfZoom = Math.min(2.5, pdfZoom + 0.15);
  void renderPdfPage();
});

clearMediaButton.addEventListener('click', resetLocalLibrary);
addGameButton.addEventListener('click', chooseInstalledGame);
addGamePlaceholderButton.addEventListener('click', chooseInstalledGame);
playGameButton.addEventListener('click', async () => {
  if (!selectedGameToken) return;
  const result = await window.harbor?.launchGame?.(selectedGameToken);
  gameStatus.textContent = result?.status === 'opened' ? 'Game launched' : (result?.message || 'The game could not be launched.');
});

// TMDB catalog access is injected only into packaged release builds.
const TMDB_API_KEY = String(window.HARBOR_CONFIG?.tmdbApiKey || '').trim();
const TMDB_BASE = 'https://api.themoviedb.org/3';
const seriesMetadataApi = window.HarborSeriesMetadata;
const watchBrowseApi = window.HarborWatchBrowse;

// Massive Comprehensive Master Media Database (120+ Titles across Watch, Read, Listen, Play)
const EXPANDED_MASTER_CATALOG = window.HarborCatalogData;

// Upstream Stream Providers
const playbackProvidersApi = window.HarborPlaybackProviders;
const STREAM_PROVIDERS = Object.fromEntries(playbackProvidersApi.providers.map((provider) => [
  provider.id,
  {
    name: provider.name,
    badge: provider.badge,
    resolve: (tmdbId, isTv, season, episode) => (
      playbackProvidersApi.resolve(provider.id, tmdbId, isTv, season, episode)
    )
  }
]));
providerDisclosure.textContent = playbackProvidersApi.providers.map((provider) => provider.name).join(', ') + '.';

const WATCH_CATALOG = EXPANDED_MASTER_CATALOG.filter((item) => item.category === 'Watch');
let directoryLinkCatalog = [];
let activeCategory = 'Home';
let activeSubcategory = 'All';
let activeWatchFilter = '';
const categories = ['Home', 'Watch', 'Listen', 'Read', 'Play'];
let query = '';
let discoveryMediaList = [...WATCH_CATALOG];
let currentMediaList = [...discoveryMediaList];
let activeMedia = null;
let heroMedia = null;
let activeSeason = 1;
let activeEpisode = 1;
let activeSeriesSeasons = [];
let activeProviderKey = 'vidlink';
let streamProviderAttempts = 0;
let streamLoadTimeout = null;
let streamStatusHideTimeout = null;
let streamChromeHideTimeout = null;
let searchTimeout = null;
let searchController = null;
let searchSequence = 0;
let searchState = { term: '', loading: false, total: null, page: 1, canLoadMore: false, partial: false };
let watchBrowseItems = [];
let watchBrowseKey = '';
let watchBrowseGeneration = 0;
let watchBrowseLoading = false;
let watchBrowseLoaded = false;
let watchBrowseCanLoadMore = false;
let watchBrowsePage = 1;
let activeLiveCountry = '';
let activeLiveLanguage = '';
let liveDirectoryFacets = { countries: [], languages: [], sports: [] };
let liveDirectoryTotal = 0;
let liveDirectoryCached = false;
let streamHls = null;
let liveStreamCandidates = [];
let liveStreamIndex = 0;
let liveStreamRecoveryAttempts = 0;
let liveGuideGeneration = 0;
const catalogTotals = {
  Watch: { All: null, Movies: null, 'TV Shows': null, Anime: null, Sports: null, 'Live TV': 'Live' },
  Listen: { All: 0, Music: 0 },
  Read: { All: 0, Comics: 0, Manga: 0, 'eBooks & Audiobooks': 0 },
  Play: { All: 0, Games: 0 }
};
const searchCache = new Map();
const seriesMetadataCache = new Map();
const SEARCH_DEBOUNCE_MS = 160;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_REQUEST_TIMEOUT_MS = 4500;
const CATALOG_REQUEST_TIMEOUT_MS = 12000;
const CATALOG_TOTAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CATALOG_TOTAL_CACHE_KEY = 'harbor:catalog-totals:v3';
const userStateApi = window.HarborUserState;
const USER_STATE_KEY = userStateApi.CURRENT_KEY;
const USER_HISTORY_LIMIT = 80;

const createDefaultUserState = () => userStateApi.defaults();

const loadUserState = () => userStateApi.load(localStorage);

let userState = loadUserState();
let activeMyHarborTab = 'list';
let streamPlaybackStartedAt = 0;
let streamPlaybackConfirmed = false;
let streamReadinessPoll = null;
let streamLoadGeneration = 0;
let savedGameLibrary = [];

const mediaKey = (item) => String(item?.id || [item?.category, item?.type, item?.name].join(':'));

const mediaSnapshot = (item) => ({
  id: item.id,
  tmdbId: item.tmdbId,
  name: item.name,
  category: item.category,
  type: item.type,
  year: item.year,
  rating: item.rating,
  sections: [...(item.sections || [])],
  overview: item.overview || '',
  artworkUrl: item.artworkUrl || '',
  audioUrl: item.audioUrl || '',
  directStream: item.directStream || '',
  channelId: item.channelId || '',
  feedId: item.feedId || '',
  countryCode: item.countryCode || '',
  countryName: item.countryName || '',
  countryFlag: item.countryFlag || '',
  languageCodes: [...(item.languageCodes || [])],
  languageNames: [...(item.languageNames || [])],
  liveCategories: [...(item.liveCategories || [])],
  sports: [...(item.sports || [])],
  streamCandidates: (item.streamCandidates || []).slice(0, 4).map((stream) => ({ ...stream }))
});

const persistUserState = () => {
  try {
    userState = userStateApi.save(localStorage, userState);
  } catch {
    // Harbor remains usable if local persistence is unavailable.
  }
  document.documentElement.classList.toggle('reduce-motion', Boolean(userState.settings.reduceMotion));
};

const isFavorite = (item) => userState.favorites.some((entry) => mediaKey(entry) === mediaKey(item));

const toggleFavorite = (item) => {
  if (!item) return false;
  const key = mediaKey(item);
  const wasFavorite = userState.favorites.some((entry) => mediaKey(entry) === key);
  userState.favorites = wasFavorite
    ? userState.favorites.filter((entry) => mediaKey(entry) !== key)
    : [mediaSnapshot(item), ...userState.favorites.filter((entry) => mediaKey(entry) !== key)].slice(0, 120);
  persistUserState();
  return !wasFavorite;
};

const recordHistory = (item) => {
  if (!item) return;
  const snapshot = { ...mediaSnapshot(item), lastOpenedAt: Date.now() };
  const key = mediaKey(item);
  userState.history = [snapshot, ...userState.history.filter((entry) => mediaKey(entry) !== key)]
    .slice(0, USER_HISTORY_LIMIT);
  persistUserState();
};

const recordProgress = (item, progress, details = {}) => {
  if (!item || !userState.settings.rememberProgress) return;
  const normalizedProgress = Math.max(0, Math.min(1, Number(progress) || 0));
  const key = mediaKey(item);
  userState.progress[key] = {
    item: mediaSnapshot(item),
    progress: normalizedProgress,
    season: details.season || 1,
    episode: details.episode || 1,
    updatedAt: Date.now()
  };
  persistUserState();
};

const continueEntries = () => Object.values(userState.progress)
  .filter((entry) => entry?.item && entry.progress > 0 && entry.progress < 0.96)
  .sort((left, right) => right.updatedAt - left.updatedAt);

const showStatusToast = (title, detail = '') => {
  document.querySelector('.status-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'status-toast';
  toast.setAttribute('role', 'status');
  toast.textContent = title;
  if (detail) toast.append(Object.assign(document.createElement('small'), { textContent: detail }));
  document.body.append(toast);
  setTimeout(() => toast.remove(), 2400);
};

persistUserState();

const SECTION_CONFIG = {
  Home: {
    kicker: 'Harbor',
    title: 'Something great is always on.',
    description: 'Watch, listen, read, and play—your way.',
    action: 'Start watching',
    subcategories: []
  },
  Watch: {
    kicker: 'Watch',
    title: 'Find your next favorite.',
    description: 'Movies, series, anime, sports, and live television—all in one place.',
    action: 'Play featured',
    subcategories: ['All', 'Movies', 'TV Shows', 'Anime', 'Sports', 'Live TV']
  },
  Listen: {
    kicker: 'Listen',
    title: 'Choose where you want to listen.',
    description: 'A clean directory of music sites collected from YarrList.',
    action: 'Open featured site',
    subcategories: ['All', 'Music']
  },
  Read: {
    kicker: 'Read',
    title: 'Choose where you want to read.',
    description: 'Manga, comics, eBooks, and audiobook sites collected from YarrList.',
    action: 'Open featured site',
    subcategories: ['All', 'Comics', 'Manga', 'eBooks & Audiobooks']
  },
  Play: {
    kicker: 'Play',
    title: 'Choose where you want to browse.',
    description: 'A straightforward directory of game sites collected from YarrList.',
    action: 'Open featured site',
    subcategories: ['All', 'Games']
  }
};

const readableLabel = (value = '') => value
  .toLowerCase()
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const createElement = (tagName, className, text) => {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const itemMatchesSubcategory = (item, subcategory) => {
  if (subcategory === 'All') return true;
  const tags = (item.sections || []).map((value) => value.toLowerCase());
  const type = String(item.type || '').toLowerCase();
  const tagIncludes = (value) => tags.some((tag) => tag.includes(value));
  if (tags.includes(subcategory.toLowerCase())) return true;

  const matchers = {
    Movies: () => type === 'movie',
    'TV Shows': () => type === 'tv',
    Anime: () => type === 'anime' || tagIncludes('anime'),
    Sports: () => tagIncludes('sport'),
    'Live TV': () => type === 'live' || tagIncludes('live tv'),
    Music: () => type === 'music',
    Soundtracks: () => tagIncludes('soundtrack') || tagIncludes('score') || tagIncludes('orchestral'),
    Radio: () => type === 'radio' || tagIncludes('radio'),
    Podcasts: () => type === 'podcast' || tagIncludes('podcast'),
    Audiobooks: () => type === 'audiobook' || tagIncludes('audiobook'),
    Books: () => type === 'book',
    Comics: () => type === 'comic' || tagIncludes('comic'),
    Manga: () => type === 'manga' || tagIncludes('manga'),
    'Light Novels': () => type === 'novel' || tagIncludes('light novel'),
    'PC Games': () => item.category === 'Play',
    Action: () => tagIncludes('action'),
    RPG: () => tagIncludes('rpg') || tagIncludes('role-playing'),
    Adventure: () => tagIncludes('adventure'),
    Strategy: () => tagIncludes('strategy')
  };

  return matchers[subcategory]?.() || false;
};

const isLiveDirectory = (subcategory = activeSubcategory) => activeCategory === 'Watch' && ['Sports', 'Live TV'].includes(subcategory);

const currentWatchBrowseKey = () => [
  activeSubcategory,
  activeWatchFilter,
  isLiveDirectory() ? activeLiveCountry : '',
  isLiveDirectory() ? activeLiveLanguage : '',
  isLiveDirectory() ? normalizeSearchText(query) : ''
].join(':');

const itemMatchesWatchFilter = (item, subcategory = activeSubcategory, filterId = activeWatchFilter) => (
  !filterId || watchBrowseApi.matchesLocalFilter(item, subcategory, filterId)
);

const getSectionItems = (category, subcategory = 'All') => currentMediaList.filter((item) => (
  item.category === category && itemMatchesSubcategory(item, subcategory)
));

const searchRankingApi = window.HarborSearchRanking;
const normalizeSearchText = searchRankingApi.normalizeSearchText;
const searchScore = searchRankingApi.searchScore;

const searchResultKey = (item) => [
  normalizeSearchText(item.name),
  normalizeSearchText(item.category),
  normalizeSearchText(item.type)
].join('|');

const rankSearchResults = (items, term) => {
  const deduplicated = new Map();
  items.forEach((item, index) => {
    if (!item?.name || !item?.category) return;
    const key = searchResultKey(item);
    const existing = deduplicated.get(key);
    const score = searchScore(item, term);
    const rankedItem = { item, score, index };

    if (!existing) {
      deduplicated.set(key, rankedItem);
      return;
    }

    const merged = {
      ...existing.item,
      ...item,
      artworkUrl: item.artworkUrl || existing.item.artworkUrl,
      overview: item.overview || existing.item.overview,
      sections: [...new Set([...(existing.item.sections || []), ...(item.sections || [])])]
    };
    deduplicated.set(key, {
      item: merged,
      score: Math.max(existing.score, score),
      index: Math.min(existing.index, index)
    });
  });

  return [...deduplicated.values()]
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.item);
};

const getSearchScope = () => ({
  category: activeCategory,
  subcategory: activeCategory === 'Home' ? 'All' : activeSubcategory,
  watchFilter: activeCategory === 'Watch' ? activeWatchFilter : ''
});

const artworkSource = (candidate) => artworkCacheApi.toCacheUrl(candidate) || candidate;

const getSearchScopeName = (scope = getSearchScope()) => {
  if (scope.category === 'Home') return 'Harbor';
  if (scope.subcategory === 'All') return scope.category;
  const filter = watchBrowseApi.getFilter(scope.subcategory, scope.watchFilter);
  const isDefaultFilter = !filter || filter.id === watchBrowseApi.defaultFilterId(scope.subcategory);
  return isDefaultFilter ? scope.subcategory : filter.label + ' ' + scope.subcategory;
};

const itemMatchesSearchScope = (item, scope = getSearchScope()) => {
  if (scope.category === 'Home') return true;
  if (item.category !== scope.category) return false;
  if (scope.subcategory === 'All') return true;
  return itemMatchesSubcategory(item, scope.subcategory)
    && itemMatchesWatchFilter(item, scope.subcategory, scope.watchFilter);
};

const getSearchCacheKey = (term, scope = getSearchScope()) => [
  normalizeSearchText(term),
  scope.category,
  scope.subcategory,
  scope.watchFilter || ''
].join('|');

const isCurrentSearchRequest = (term, sequence, scope) => (
  sequence === searchSequence && getSearchCacheKey(query) === getSearchCacheKey(term, scope)
);

const localSearchResults = (term, scope = getSearchScope()) => {
  const source = scope.category === 'Watch' && scope.subcategory !== 'All' && watchBrowseLoaded
    ? [...watchBrowseItems, ...discoveryMediaList]
    : discoveryMediaList;
  return rankSearchResults(source.filter((item) => itemMatchesSearchScope(item, scope)), term);
};

const fetchSearchJson = async (url, signal, timeoutMs = SEARCH_REQUEST_TIMEOUT_MS) => {
  const timeoutController = new AbortController();
  const abortForParent = () => timeoutController.abort();
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
  signal?.addEventListener('abort', abortForParent, { once: true });

  try {
    const response = await fetch(url, { signal: timeoutController.signal });
    if (!response.ok) throw new Error('Search service returned ' + response.status);
    return await response.json();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortForParent);
  }
};

const TMDB_GENRE_LABELS = {
  16: 'Animation', 18: 'Drama', 27: 'Horror', 28: 'Action', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 878: 'Sci-Fi', 10751: 'Family', 10759: 'Action & Adventure',
  10762: 'Kids', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy'
};

// Map TMDB item to Harbor Watch item
const formatTmdbItem = (item) => {
  const isTv = item.media_type === 'tv' || (!item.title && item.name);
  const title = item.title || item.name || 'Untitled';
  const date = item.release_date || item.first_air_date || '';
  const year = date ? date.split('-')[0] : '2024';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '8.0';
  const isAnime = isTv
    && (item.genre_ids || []).includes(16)
    && (item.original_language === 'ja' || (item.origin_country || []).includes('JP'));
  const sportsText = normalizeSearchText([title, item.overview].filter(Boolean).join(' '));
  const isSports = /\b(sport|football|soccer|basketball|baseball|hockey|tennis|boxing|wrestling|racing|formula 1|ufc)\b/.test(sportsText);
  const primarySection = isAnime ? 'Anime' : (isTv ? 'TV Show' : 'Movie');
  const genres = (item.genre_ids || []).map((genreId) => TMDB_GENRE_LABELS[genreId]).filter(Boolean);

  return {
    id: 'tmdb-' + item.id,
    tmdbId: String(item.id),
    name: title,
    category: 'Watch',
    type: isAnime ? 'anime' : (isTv ? 'tv' : 'movie'),
    year: year,
    rating: rating,
    sections: [...new Set([primarySection, isTv ? 'Series' : 'Feature', ...genres, ...(isSports ? ['Sports'] : [])])],
    overview: item.overview || 'A popular title available to watch in Harbor.',
    artworkUrl: item.backdrop_path
      ? 'https://image.tmdb.org/t/p/w780' + item.backdrop_path
      : (item.poster_path ? 'https://image.tmdb.org/t/p/w500' + item.poster_path : ''),
    sources: [
      { key: 'vidlink', name: 'STREAM HOST', badge: 'badge-stream' },
      { key: 'vidsrc', name: 'EMBED PROVIDER', badge: 'badge-embed' }
    ]
  };
};

const liveItemId = (entry, index) => 'iptv-' + String(entry.id || entry.channelId || entry.name || index)
  .replace(/[^a-z0-9]+/gi, '-')
  .replace(/^-+|-+$/g, '')
  .toLowerCase();

const formatLiveChannel = (entry, index, section, filter) => ({
  id: liveItemId(entry, index),
  name: entry.name || 'Live channel',
  category: 'Watch',
  type: 'live',
  year: 'Live',
  rating: '',
  sections: [...new Set([
    section,
    filter?.label || entry.group || 'Live TV',
    ...(entry.groups || []),
    entry.countryName || '',
    ...(entry.languageNames || [])
  ].filter(Boolean))],
  overview: [
    'A public live channel from the IPTV-org catalog, played directly inside Harbor.',
    entry.countryName ? (entry.countryFlag ? entry.countryFlag + ' ' : '') + entry.countryName : '',
    entry.languageNames?.length ? entry.languageNames.join(', ') : '',
    entry.streams?.[0]?.quality || ''
  ].filter(Boolean).join(' · '),
  artworkUrl: entry.logo || '',
  directStream: entry.url,
  channelId: entry.channelId || '',
  feedId: entry.feedId || '',
  countryCode: entry.countryCode || '',
  countryName: entry.countryName || '',
  countryFlag: entry.countryFlag || '',
  languageCodes: [...(entry.languageCodes || [])],
  languageNames: [...(entry.languageNames || [])],
  liveCategories: [...(entry.categories || [])],
  sports: [...(entry.sports || [])],
  streamCandidates: (entry.streams || []).map((stream) => ({ ...stream })),
  sources: [{ name: 'PUBLIC LIVE STREAM', badge: 'badge-relay' }]
});

const localWatchBrowseItems = () => getSectionItems('Watch', activeSubcategory)
  .filter((item) => itemMatchesWatchFilter(item));

const loadActiveWatchBrowse = async ({ append = false } = {}) => {
  if (activeCategory !== 'Watch' || activeSubcategory === 'All') return;
  const filter = watchBrowseApi.getFilter(activeSubcategory, activeWatchFilter);
  if (!filter) return;
  const key = currentWatchBrowseKey();
  const generation = ++watchBrowseGeneration;
  const page = append ? watchBrowsePage + 1 : 1;
  watchBrowseKey = key;
  watchBrowseLoading = true;
  watchBrowseLoaded = false;
  if (!append) watchBrowseItems = [];
  renderResources();

  try {
    let items = [];
    let canLoadMore = false;
    if (filter.source === 'iptv') {
      const directory = await watchBrowseApi.loadLiveDirectory(activeSubcategory, activeWatchFilter, {
        limit: 240,
        country: activeLiveCountry,
        language: activeLiveLanguage,
        query: query.trim(),
        storage: localStorage
      });
      items = directory.channels.map((entry, index) => formatLiveChannel(entry, index, activeSubcategory, filter));
      liveDirectoryFacets = directory.facets || { countries: [], languages: [], sports: [] };
      liveDirectoryTotal = Number(directory.total) || items.length;
      liveDirectoryCached = Boolean(directory.cached);
    } else if (TMDB_API_KEY) {
      const request = watchBrowseApi.buildTmdbRequest(activeSubcategory, activeWatchFilter, page);
      const params = new URLSearchParams({ api_key: TMDB_API_KEY, ...request.params });
      const data = await fetchSearchJson(TMDB_BASE + '/' + request.endpoint + '?' + params.toString(), undefined, CATALOG_REQUEST_TIMEOUT_MS);
      items = (data.results || []).map((item) => formatTmdbItem({ ...item, media_type: request.mediaType === 'movie' ? 'movie' : 'tv' }));
      canLoadMore = Number(data.page || page) < Number(data.total_pages || 0);
    } else {
      items = localWatchBrowseItems();
    }

    if (generation !== watchBrowseGeneration || key !== currentWatchBrowseKey()) return;
    watchBrowseItems = append
      ? [...watchBrowseItems, ...items.filter((item) => !watchBrowseItems.some((existing) => mediaKey(existing) === mediaKey(item)))]
      : items;
    watchBrowsePage = page;
    watchBrowseCanLoadMore = filter.source === 'tmdb' && canLoadMore;
    watchBrowseLoading = false;
    watchBrowseLoaded = true;
    if (filter.source === 'iptv' && query.trim()) {
      currentMediaList = [...items];
      searchState = { term: normalizeSearchText(query), loading: false, total: liveDirectoryTotal, page: 1, canLoadMore: false, partial: false };
    }
    renderResources();
  } catch (error) {
    if (generation !== watchBrowseGeneration || key !== currentWatchBrowseKey()) return;
    watchBrowseItems = localWatchBrowseItems();
    watchBrowseCanLoadMore = false;
    watchBrowseLoading = false;
    watchBrowseLoaded = true;
    if (filter.source === 'iptv') {
      liveDirectoryTotal = watchBrowseItems.length;
      liveDirectoryCached = false;
      if (query.trim()) {
        currentMediaList = [...watchBrowseItems];
        searchState = { term: normalizeSearchText(query), loading: false, total: watchBrowseItems.length, page: 1, canLoadMore: false, partial: true };
      }
    }
    renderResources();
    showStatusToast('Live catalog is temporarily unavailable', 'Showing Harbor’s built-in picks instead.');
  }
};

const loadMoreWatchBrowse = () => {
  if (!watchBrowseLoading && watchBrowseCanLoadMore) void loadActiveWatchBrowse({ append: true });
};

// Map iTunes item to Harbor Listen item
const formatItunesItem = (item) => ({
  id: 'itunes-' + item.trackId,
  name: item.trackName + ' - ' + item.artistName,
  category: 'Listen',
  type: 'music',
  year: (item.releaseDate || '2024').split('-')[0],
  rating: '9.2',
  sections: [item.primaryGenreName || 'Music', item.collectionName || 'Track'],
  overview: 'Artist: ' + item.artistName + ' · Album: ' + (item.collectionName || 'Single'),
  artworkUrl: (item.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
  audioUrl: item.previewUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'AUDIO MIRROR', badge: 'badge-mirror' }]
});

const formatItunesPodcastItem = (item) => ({
  id: 'itunes-podcast-' + (item.collectionId || item.trackId || item.collectionName),
  name: item.collectionName || item.trackName || 'Untitled podcast',
  category: 'Listen',
  type: 'podcast',
  year: (item.releaseDate || '2026').split('-')[0],
  rating: '9.0',
  sections: ['Podcast', item.primaryGenreName || 'Talk'],
  overview: 'By ' + (item.artistName || 'Independent creator') + '.',
  artworkUrl: item.artworkUrl600 || item.artworkUrl100 || '',
  sources: []
});

const formatItunesAudiobookItem = (item) => ({
  id: 'itunes-audiobook-' + (item.collectionId || item.trackId || item.collectionName),
  name: item.collectionName || item.trackName || 'Untitled audiobook',
  category: 'Listen',
  type: 'audiobook',
  year: (item.releaseDate || '2026').split('-')[0],
  rating: '9.0',
  sections: ['Audiobook', item.primaryGenreName || 'Books'],
  overview: 'Narrated work by ' + (item.artistName || 'Unknown author') + '.',
  artworkUrl: (item.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
  audioUrl: item.previewUrl || '',
  sources: []
});

const formatRadioItem = (item) => ({
  id: 'radio-' + (item.stationuuid || item.changeuuid || item.name),
  name: item.name || 'Live radio',
  category: 'Listen',
  type: 'radio',
  year: 'Live',
  rating: Math.min(9.9, 7.5 + Math.log10((Number(item.votes) || 0) + 1)).toFixed(1),
  sections: ['Radio', item.country || (item.tags || '').split(',')[0] || 'Live'],
  overview: [item.country, item.tags].filter(Boolean).join(' · ') || 'Live radio station.',
  artworkUrl: item.favicon || '',
  audioUrl: item.url_resolved || item.url || '',
  sources: []
});

// Map OpenLibrary / Gutendex item to Harbor Read item
const formatBookItem = (item) => ({
  id: 'book-' + (item.id || Math.random()),
  name: item.title,
  category: 'Read',
  type: 'book',
  year: '2023',
  rating: '9.0',
  sections: ['Book', (item.subjects && item.subjects[0]) || 'Literature'],
  overview: 'Author: ' + ((item.authors && item.authors[0] && item.authors[0].name) || 'Classic Author') + '. Available for in-app reading.',
  artworkUrl: item.formats?.['image/jpeg'] || '',
  sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
});

const formatOpenLibraryItem = (item) => {
  const subjects = (item.subject || []).map((subject) => normalizeSearchText(subject));
  const hasSubject = (value) => subjects.some((subject) => subject.includes(value));
  const type = hasSubject('manga')
    ? 'manga'
    : (hasSubject('comic') || hasSubject('graphic novel'))
      ? 'comic'
      : hasSubject('light novel')
        ? 'novel'
        : 'book';
  const label = type === 'manga'
    ? 'Manga'
    : type === 'comic'
      ? 'Comic'
      : type === 'novel'
        ? 'Light Novel'
        : 'Book';
  const author = item.author_name?.[0] || 'Unknown author';

  return {
    id: 'openlibrary-' + String(item.key || item.title || Math.random()).replace(/[^a-z0-9]/gi, '-'),
    name: item.title || 'Untitled',
    category: 'Read',
    type,
    year: item.first_publish_year || '—',
    rating: '8.8',
    sections: [label, ...subjects.slice(0, 1).map(readableLabel)],
    overview: 'By ' + author + '. Find a local copy to read in Harbor.',
    artworkUrl: item.cover_i ? 'https://covers.openlibrary.org/b/id/' + item.cover_i + '-L.jpg' : '',
    sources: []
  };
};

const formatDirectoryLink = (item, index) => ({
  id: 'directory-' + item.category.toLowerCase() + '-' + index + '-' + item.domain,
  name: item.name,
  category: item.category,
  type: 'external',
  year: 'Website',
  rating: '',
  sections: item.sections?.length ? item.sections : [item.category],
  overview: 'Open ' + item.domain + ' in your browser. This link is listed in the YarrList ' + item.category.toLowerCase() + ' directory.',
  artworkUrl: '',
  domain: item.domain,
  externalUrl: item.url,
  directorySource: 'YarrList'
});

const applyDirectoryLinkTotals = () => {
  for (const category of ['Listen', 'Read', 'Play']) {
    const items = directoryLinkCatalog.filter((item) => item.category === category);
    catalogTotals[category].All = items.length;
    SECTION_CONFIG[category].subcategories.slice(1).forEach((subcategory) => {
      catalogTotals[category][subcategory] = items.filter((item) => itemMatchesSubcategory(item, subcategory)).length;
    });
  }
};

const loadDirectoryLinks = async () => {
  const links = await window.harbor?.getDirectoryLinks?.();
  directoryLinkCatalog = Array.isArray(links) ? links.map(formatDirectoryLink) : [];
  applyDirectoryLinkTotals();
  discoveryMediaList = [...WATCH_CATALOG, ...directoryLinkCatalog];
  if (!normalizeSearchText(query)) {
    currentMediaList = [...discoveryMediaList];
    renderResources();
  }
};

// Fetch Live Trending
const fetchTrendingMedia = async () => {
  try {
    const res = await fetch(TMDB_BASE + '/trending/all/day?api_key=' + TMDB_API_KEY);
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    const tmdbItems = (data.results || []).map(formatTmdbItem);
    discoveryMediaList = [...tmdbItems, ...WATCH_CATALOG, ...directoryLinkCatalog];
  } catch {
    discoveryMediaList = [...WATCH_CATALOG, ...directoryLinkCatalog];
  }

  if (!normalizeSearchText(query)) {
    currentMediaList = [...discoveryMediaList];
    renderResources();
  }
};

const formatCatalogTotal = (value) => new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1
}).format(value);

const applyCatalogTotalValues = (values) => {
  const setNumber = (section, subcategory, key) => {
    const value = Number(values.get(key));
    if (Number.isFinite(value) && value > 0) catalogTotals[section][subcategory] = value;
  };

  setNumber('Watch', 'Movies', 'movies');
  setNumber('Watch', 'TV Shows', 'shows');
  setNumber('Watch', 'Anime', 'anime');
  setNumber('Watch', 'Sports', 'sports');
  if (typeof catalogTotals.Watch.Movies === 'number' && typeof catalogTotals.Watch['TV Shows'] === 'number') {
    catalogTotals.Watch.All = catalogTotals.Watch.Movies + catalogTotals.Watch['TV Shows'];
  }

  renderCategories();
};

const loadCachedCatalogTotals = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(CATALOG_TOTAL_CACHE_KEY) || 'null');
    if (!cached || Date.now() - cached.createdAt >= CATALOG_TOTAL_CACHE_TTL_MS) return;
    Object.entries(cached.totals || {}).forEach(([section, values]) => {
      if (section !== 'Watch') return;
      if (!catalogTotals[section] || !values) return;
      Object.entries(values).forEach(([subcategory, value]) => {
        if (value !== null && catalogTotals[section][subcategory] !== undefined) {
          catalogTotals[section][subcategory] = value;
        }
      });
    });
  } catch {
    localStorage.removeItem(CATALOG_TOTAL_CACHE_KEY);
  }
};

const saveCatalogTotals = () => {
  try {
    localStorage.setItem(CATALOG_TOTAL_CACHE_KEY, JSON.stringify({
      createdAt: Date.now(),
      totals: catalogTotals
    }));
  } catch {
    // A failed cache write should never block browsing.
  }
};

const catalogTotalRequest = (key, url, selectTotal) => fetchSearchJson(
  url,
  undefined,
  CATALOG_REQUEST_TIMEOUT_MS
).then((data) => [{ key, total: Number(selectTotal(data)) || 0 }]);

const fetchSportsCatalogTotal = async () => {
  const keywords = await fetchSearchJson(
    TMDB_BASE + '/search/keyword?api_key=' + TMDB_API_KEY + '&query=sport&page=1',
    undefined,
    CATALOG_REQUEST_TIMEOUT_MS
  );
  const keyword = (keywords.results || []).find((item) => ['sport', 'sports'].includes(normalizeSearchText(item.name)))
    || keywords.results?.[0];
  if (!keyword?.id) return [];

  const [movies, shows] = await Promise.all([
    fetchSearchJson(TMDB_BASE + '/discover/movie?api_key=' + TMDB_API_KEY + '&include_adult=false&with_keywords=' + keyword.id + '&page=1', undefined, CATALOG_REQUEST_TIMEOUT_MS),
    fetchSearchJson(TMDB_BASE + '/discover/tv?api_key=' + TMDB_API_KEY + '&include_adult=false&with_keywords=' + keyword.id + '&page=1', undefined, CATALOG_REQUEST_TIMEOUT_MS)
  ]);
  return [{ key: 'sports', total: (Number(movies.total_results) || 0) + (Number(shows.total_results) || 0) }];
};

const fetchCatalogTotals = async () => {
  const requests = [
    catalogTotalRequest('movies', TMDB_BASE + '/discover/movie?api_key=' + TMDB_API_KEY + '&include_adult=false&page=1', (data) => data.total_results),
    catalogTotalRequest('shows', TMDB_BASE + '/discover/tv?api_key=' + TMDB_API_KEY + '&include_adult=false&page=1', (data) => data.total_results),
    Promise.all([
      fetchSearchJson(TMDB_BASE + '/discover/movie?api_key=' + TMDB_API_KEY + '&include_adult=false&with_genres=16&with_original_language=ja&page=1', undefined, CATALOG_REQUEST_TIMEOUT_MS),
      fetchSearchJson(TMDB_BASE + '/discover/tv?api_key=' + TMDB_API_KEY + '&include_adult=false&with_genres=16&with_original_language=ja&page=1', undefined, CATALOG_REQUEST_TIMEOUT_MS)
    ]).then(([movies, shows]) => [{ key: 'anime', total: (Number(movies.total_results) || 0) + (Number(shows.total_results) || 0) }]),
    fetchSportsCatalogTotal()
  ];

  const settled = await Promise.allSettled(requests);
  const values = new Map(settled.flatMap((result) => (
    result.status === 'fulfilled'
      ? result.value.filter((entry) => entry.total > 0).map((entry) => [entry.key, entry.total])
      : []
  )));
  applyCatalogTotalValues(values);
  saveCatalogTotals();
};

// Global Multi-Category Search (Movies, TV Shows, Anime, Books, Music, Games)
const applySearchBatch = (term, sequence, scope, localResults, batches, totals, hasMore, failures, loading, page) => {
  if (!isCurrentSearchRequest(term, sequence, scope)) return;

  const combined = [localResults, ...batches.values()].flat();
  currentMediaList = rankSearchResults(
    combined.filter((item) => itemMatchesSearchScope(item, scope)),
    term
  );

  const existingKeys = new Set(localResults.map(searchResultKey));
  const hasRelevantNextPage = [...batches.entries()].some(([key, items]) => (
    hasMore.get(key) && items.some((item) => (
      itemMatchesSearchScope(item, scope)
      && searchScore(item, term) > 0
      && !existingKeys.has(searchResultKey(item))
    ))
  ));
  searchState = {
    term: normalizeSearchText(term),
    loading,
    total: currentMediaList.length,
    page,
    canLoadMore: !loading && hasRelevantNextPage,
    partial: failures.size > 0
  };
  renderResources();
};

const searchGlobalMedia = async (term, sequence, scope, page = 1, append = false) => {
  const normalizedTerm = normalizeSearchText(term);
  if (normalizedTerm.length < 2 || !isCurrentSearchRequest(term, sequence, scope)) return;

  const cacheKey = getSearchCacheKey(term, scope);
  const cached = !append && page === 1 ? searchCache.get(cacheKey) : null;
  if (cached && Date.now() - cached.createdAt < SEARCH_CACHE_TTL_MS) {
    if (!isCurrentSearchRequest(term, sequence, scope)) return;
    currentMediaList = cached.items;
    searchState = { term: normalizedTerm, loading: false, total: cached.total, page: cached.page || 1, canLoadMore: Boolean(cached.canLoadMore), partial: Boolean(cached.partial) };
    renderResources();
    return;
  }

  searchController = new AbortController();
  const { signal } = searchController;
  const localResults = append ? [...currentMediaList] : localSearchResults(term, scope);
  const batches = new Map();
  const totals = new Map();
  const hasMore = new Map();
  const failures = new Set();
  const pageOffset = (page - 1) * 20;

  const availableProviders = [
    {
      key: 'watch-movies',
      category: 'Watch',
      subcategories: ['Movies', 'Sports'],
      exactSubcategories: ['Movies'],
      url: TMDB_BASE + '/search/movie?api_key=' + TMDB_API_KEY + '&query=' + encodeURIComponent(term) + '&include_adult=false&page=' + page,
      format: (data) => ({
        items: (data.results || []).map((item) => formatTmdbItem({ ...item, media_type: 'movie' })),
        total: Number(data.total_results) || 0
      })
    },
    {
      key: 'watch-shows',
      category: 'Watch',
      subcategories: ['TV Shows', 'Anime', 'Sports'],
      exactSubcategories: ['TV Shows'],
      url: TMDB_BASE + '/search/tv?api_key=' + TMDB_API_KEY + '&query=' + encodeURIComponent(term) + '&include_adult=false&page=' + page,
      format: (data) => ({
        items: (data.results || []).map((item) => formatTmdbItem({ ...item, media_type: 'tv' })),
        total: Number(data.total_results) || 0
      })
    },
    {
      key: 'listen-music',
      category: 'Listen',
      subcategories: ['Music', 'Soundtracks'],
      exactSubcategories: ['Music'],
      url: 'https://itunes.apple.com/search?term=' + encodeURIComponent(term) + '&media=music&entity=song&limit=20&offset=' + pageOffset,
      format: (data) => ({
        items: (data.results || []).map(formatItunesItem),
        total: Number(data.resultCount) || 0
      })
    },
    {
      key: 'listen-podcasts',
      category: 'Listen',
      subcategories: ['Podcasts'],
      exactSubcategories: ['Podcasts'],
      url: 'https://itunes.apple.com/search?term=' + encodeURIComponent(term) + '&media=podcast&entity=podcast&limit=20&offset=' + pageOffset,
      format: (data) => ({
        items: (data.results || []).map(formatItunesPodcastItem),
        total: Number(data.resultCount) || 0
      })
    },
    {
      key: 'listen-audiobooks',
      category: 'Listen',
      subcategories: ['Audiobooks'],
      exactSubcategories: ['Audiobooks'],
      url: 'https://itunes.apple.com/search?term=' + encodeURIComponent(term) + '&media=audiobook&entity=audiobook&limit=20&offset=' + pageOffset,
      format: (data) => ({
        items: (data.results || []).map(formatItunesAudiobookItem),
        total: Number(data.resultCount) || 0
      })
    },
    {
      key: 'listen-radio',
      category: 'Listen',
      subcategories: ['Radio'],
      exactSubcategories: ['Radio'],
      url: 'https://de1.api.radio-browser.info/json/stations/search?name=' + encodeURIComponent(term) + '&limit=20&offset=' + pageOffset + '&hidebroken=true&order=votes&reverse=true',
      format: (data) => ({
        items: (Array.isArray(data) ? data : []).map(formatRadioItem),
        total: Array.isArray(data) ? data.length : 0
      })
    },
    {
      key: 'read',
      category: 'Read',
      subcategories: ['Books', 'Comics', 'Manga', 'Light Novels'],
      exactSubcategories: [],
      url: 'https://openlibrary.org/search.json?q=' + encodeURIComponent(term) + '&limit=20&page=' + page + '&fields=key,title,author_name,first_publish_year,cover_i,subject',
      format: (data) => ({
        items: (data.docs || []).map(formatOpenLibraryItem),
        total: Number(data.numFound ?? data.num_found) || 0
      })
    }
  ];

  const providers = availableProviders.filter((provider) => {
    if (provider.category !== 'Watch') return false;
    if (scope.category === 'Home') return true;
    if (provider.category !== scope.category) return false;
    return scope.subcategory === 'All' || provider.subcategories.includes(scope.subcategory);
  });

  const tasks = providers.map(async (provider) => {
    try {
      const data = await fetchSearchJson(provider.url, signal);
      if (signal.aborted || !isCurrentSearchRequest(term, sequence, scope)) return;
      const result = provider.format(data);
      const scopedItems = result.items.filter((item) => itemMatchesSearchScope(item, scope));
      const hasExactProviderTotal = scope.category === 'Home'
        || scope.subcategory === 'All'
        || provider.exactSubcategories.includes(scope.subcategory);
      batches.set(provider.key, scopedItems);
      totals.set(provider.key, hasExactProviderTotal ? result.total : scopedItems.length);
      hasMore.set(provider.key, result.total > page * 20 || result.items.length >= 20);
      applySearchBatch(term, sequence, scope, localResults, batches, totals, hasMore, failures, true, page);
    } catch (error) {
      if (!signal.aborted && error?.name !== 'AbortError') {
        failures.add(provider.key);
        console.warn(provider.key + ' search is temporarily unavailable.');
      }
    }
  });

  await Promise.allSettled(tasks);
  if (signal.aborted || !isCurrentSearchRequest(term, sequence, scope)) return;

  applySearchBatch(term, sequence, scope, localResults, batches, totals, hasMore, failures, false, page);
  searchCache.set(cacheKey, {
    createdAt: Date.now(),
    items: [...currentMediaList],
    total: searchState.total,
    page: searchState.page,
    canLoadMore: searchState.canLoadMore,
    partial: searchState.partial
  });
  while (searchCache.size > 30) searchCache.delete(searchCache.keys().next().value);
};

const beginSearch = (term) => {
  query = term;
  clearTimeout(searchTimeout);
  searchController?.abort();
  searchController = null;
  const sequence = ++searchSequence;
  const normalizedTerm = normalizeSearchText(term);
  const scope = getSearchScope();
  const cacheKey = getSearchCacheKey(term, scope);

  if (isLiveDirectory()) {
    resetWatchBrowseState();
    currentMediaList = [];
    searchState = {
      term: normalizedTerm,
      loading: true,
      total: null,
      page: 1,
      canLoadMore: false,
      partial: false
    };
    renderResources();
    searchTimeout = setTimeout(() => void loadActiveWatchBrowse(), normalizedTerm ? SEARCH_DEBOUNCE_MS : 0);
    return;
  }

  if (!normalizedTerm) {
    searchState = { term: '', loading: false, total: null, page: 1, canLoadMore: false, partial: false };
    currentMediaList = [...discoveryMediaList];
    renderResources();
    return;
  }

  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < SEARCH_CACHE_TTL_MS) {
    currentMediaList = [...cached.items];
    searchState = { term: normalizedTerm, loading: false, total: cached.total, page: cached.page || 1, canLoadMore: Boolean(cached.canLoadMore), partial: Boolean(cached.partial) };
    renderResources();
    return;
  }

  currentMediaList = localSearchResults(term, scope);
  searchState = {
    term: normalizedTerm,
    loading: normalizedTerm.length >= 2,
    total: normalizedTerm.length < 2 ? currentMediaList.length : null,
    page: 1,
    canLoadMore: false,
    partial: false
  };
  renderResources();
  if (normalizedTerm.length < 2) return;
  searchTimeout = setTimeout(() => void searchGlobalMedia(term, sequence, scope), SEARCH_DEBOUNCE_MS);
};

const loadMoreSearchResults = () => {
  if (!normalizeSearchText(query) || searchState.loading || !searchState.canLoadMore) return;
  searchController?.abort();
  searchController = null;
  const sequence = ++searchSequence;
  const scope = getSearchScope();
  const page = (searchState.page || 1) + 1;
  searchState = { ...searchState, loading: true, canLoadMore: false };
  renderResources();
  void searchGlobalMedia(query, sequence, scope, page, true);
};

const filteredMedia = () => {
  if (query.trim()) return currentMediaList.filter((item) => itemMatchesSearchScope(item));
  if (activeCategory === 'Home') return currentMediaList;
  if (activeCategory === 'Watch' && activeSubcategory !== 'All') {
    if (watchBrowseKey === currentWatchBrowseKey() && (watchBrowseLoaded || watchBrowseLoading)) return watchBrowseItems;
    return localWatchBrowseItems();
  }
  return getSectionItems(activeCategory, activeSubcategory);
};

const categoryCount = (subcategory) => {
  const catalogTotal = catalogTotals[activeCategory]?.[subcategory];
  if (catalogTotal !== undefined) {
    if (catalogTotal === null) return '';
    if (typeof catalogTotal === 'string') return catalogTotal;
    return formatCatalogTotal(catalogTotal);
  }
  if (activeCategory === 'Home') return currentMediaList.length;
  return getSectionItems(activeCategory, subcategory).length;
};

const categoryAvailabilityLabel = (visibleCount) => {
  if (activeCategory !== 'Watch' && activeCategory !== 'Home') {
    return visibleCount + ' curated ' + (visibleCount === 1 ? 'link' : 'links') + ' from YarrList';
  }
  const catalogTotal = catalogTotals[activeCategory]?.[activeSubcategory];
  const featuredLabel = visibleCount + ' featured ' + (visibleCount === 1 ? 'pick' : 'picks');

  if (typeof catalogTotal === 'number') {
    return 'Showing ' + featuredLabel + ' from ' + formatCatalogTotal(catalogTotal) + ' searchable items';
  }
  if (catalogTotal === 'Full') return 'Showing ' + featuredLabel + ' from the full catalog';
  if (catalogTotal === 'Live') {
    return 'Showing ' + visibleCount + ' of ' + Math.max(liveDirectoryTotal, visibleCount) + ' compatible public live ' + (liveDirectoryTotal === 1 ? 'channel' : 'channels');
  }
  if (catalogTotal === 'Library') return 'Showing ' + featuredLabel + ' from your library';
  return 'Showing ' + featuredLabel;
};

const resetWatchBrowseState = () => {
  watchBrowseGeneration++;
  watchBrowseItems = [];
  watchBrowseKey = '';
  watchBrowseLoading = false;
  watchBrowseLoaded = false;
  watchBrowseCanLoadMore = false;
  watchBrowsePage = 1;
};

const replaceLiveFacetOptions = (select, label, entries, selectedValue, valueKey = 'code') => {
  const fragment = document.createDocumentFragment();
  fragment.append(Object.assign(document.createElement('option'), { value: '', textContent: label }));
  entries.forEach((entry) => {
    const value = String(entry[valueKey] || '');
    if (!value) return;
    const option = document.createElement('option');
    option.value = value;
    option.textContent = [entry.flag || '', entry.name || value].filter(Boolean).join(' ');
    fragment.append(option);
  });
  select.replaceChildren(fragment);
  select.value = selectedValue;
};

const renderLiveDirectoryControls = () => {
  const visible = isLiveDirectory();
  liveDirectoryControls.hidden = !visible;
  if (!visible) return;
  replaceLiveFacetOptions(liveCountrySelect, 'All countries', liveDirectoryFacets.countries || [], activeLiveCountry);
  replaceLiveFacetOptions(liveLanguageSelect, 'All languages', liveDirectoryFacets.languages || [], activeLiveLanguage);
  liveDirectoryStatus.textContent = watchBrowseLoading
    ? 'Checking the current IPTV-org directory and Harbor stream-health filters…'
    : Math.max(liveDirectoryTotal, watchBrowseItems.length) + ' compatible channels'
      + (liveDirectoryCached ? ' · showing the last successful catalog snapshot' : ' · unsafe and unsupported streams removed');
};

const reloadLiveDirectory = () => {
  resetWatchBrowseState();
  searchState = { term: normalizeSearchText(query), loading: Boolean(query.trim()), total: null, page: 1, canLoadMore: false, partial: false };
  if (query.trim()) currentMediaList = [];
  renderResources();
  void loadActiveWatchBrowse();
};

const renderWatchFilters = () => {
  watchFilterList.replaceChildren();
  const filters = activeCategory === 'Watch' && activeSubcategory !== 'All'
    ? watchBrowseApi.getFilters(activeSubcategory)
    : [];
  watchFilterList.hidden = filters.length === 0;
  filters.forEach((filter) => {
    const button = createElement('button', 'watch-filter-button', filter.label);
    const active = activeWatchFilter === filter.id;
    button.type = 'button';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.addEventListener('click', () => {
      if (activeWatchFilter === filter.id && watchBrowseLoaded) return;
      clearTimeout(searchTimeout);
      searchController?.abort();
      searchController = null;
      searchSequence++;
      query = '';
      searchInput.value = '';
      searchState = { term: '', loading: false, total: null, page: 1, canLoadMore: false, partial: false };
      currentMediaList = [...discoveryMediaList];
      activeWatchFilter = filter.id;
      resetWatchBrowseState();
      renderResources();
      void loadActiveWatchBrowse();
    });
    watchFilterList.append(button);
  });
  renderLiveDirectoryControls();
};

const renderCategories = () => {
  document.querySelectorAll('[data-section]').forEach((button) => {
    const isActive = button.dataset.section === activeCategory;
    button.classList.toggle('active', isActive);
    if (button.classList.contains('primary-nav-button')) {
      button.setAttribute('aria-current', isActive ? 'page' : 'false');
    }
  });

  categoryList.replaceChildren();
  const subcategories = SECTION_CONFIG[activeCategory]?.subcategories || [];
  subcategories.forEach((category) => {
    const button = createElement('button', 'category-button');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(activeSubcategory === category));
    if (activeSubcategory === category) button.classList.add('active');
    const count = String(categoryCount(category));
    const duplicatesCategory = category === 'Live TV' && count === 'Live';
    const countLabel = createElement('span', 'category-count', duplicatesCategory ? '' : count);
    countLabel.hidden = !count || duplicatesCategory;
    button.setAttribute('aria-label', category + (count && !duplicatesCategory ? ', ' + count : ''));
    button.append(createElement('span', 'category-name', category), countLabel);
    button.addEventListener('click', () => {
      if (activeSubcategory !== category) {
        activeLiveCountry = '';
        activeLiveLanguage = '';
        liveDirectoryFacets = { countries: [], languages: [], sports: [] };
        liveDirectoryTotal = 0;
        liveDirectoryCached = false;
      }
      activeSubcategory = category;
      activeWatchFilter = activeCategory === 'Watch' && category !== 'All'
        ? watchBrowseApi.defaultFilterId(category)
        : '';
      resetWatchBrowseState();
      if (normalizeSearchText(query)) beginSearch(query);
      else {
        renderCategories();
        renderResources();
        if (activeCategory === 'Watch' && category !== 'All') void loadActiveWatchBrowse();
      }
    });
    categoryList.append(button);
  });
  renderWatchFilters();
};

const setActiveSection = (category) => {
  if (!categories.includes(category)) return;
  clearTimeout(searchTimeout);
  searchController?.abort();
  searchController = null;
  searchSequence++;
  activeCategory = category;
  activeSubcategory = 'All';
  activeWatchFilter = '';
  activeLiveCountry = '';
  activeLiveLanguage = '';
  liveDirectoryFacets = { countries: [], languages: [], sports: [] };
  liveDirectoryTotal = 0;
  liveDirectoryCached = false;
  resetWatchBrowseState();
  query = '';
  searchState = { term: '', loading: false, total: null, page: 1, canLoadMore: false, partial: false };
  searchInput.value = '';
  currentMediaList = [...discoveryMediaList];
  renderResources();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const fallbackSeriesSeasons = (item) => seriesMetadataApi.normalizeSeriesSeasons(
  item?.seasons ? { seasons: item.seasons } : null,
  0
);

// Fetch canonical season names and counts so Harbor never invents episode buttons.
const fetchTvShowDetails = async (tmdbId, item = activeMedia) => {
  const cacheKey = String(tmdbId || '');
  if (seriesMetadataCache.has(cacheKey)) return seriesMetadataCache.get(cacheKey);
  if (!TMDB_API_KEY || !cacheKey) return fallbackSeriesSeasons(item);

  try {
    const data = await fetchSearchJson(
      TMDB_BASE + '/tv/' + encodeURIComponent(cacheKey) + '?api_key=' + TMDB_API_KEY,
      undefined,
      CATALOG_REQUEST_TIMEOUT_MS
    );
    const seasons = seriesMetadataApi.normalizeSeriesSeasons(data, 0);
    if (seasons.length) seriesMetadataCache.set(cacheKey, seasons);
    return seasons;
  } catch {
    return fallbackSeriesSeasons(item);
  }
};

const activeSeasonMetadata = () => seriesMetadataApi.findSeason(activeSeriesSeasons, activeSeason);

const updateStreamEpisodeControls = () => {
  const isSeries = activeMedia && (activeMedia.type === 'tv' || activeMedia.type === 'anime');
  streamEpisodeTag.hidden = !isSeries;
  streamPrevBtn.hidden = !isSeries;
  streamNextBtn.hidden = !isSeries;
  if (!isSeries) return;

  const season = activeSeasonMetadata();
  streamEpisodeTag.textContent = (season?.name || ('Season ' + activeSeason)) + ' · Episode ' + activeEpisode;
  streamPrevBtn.disabled = !seriesMetadataApi.stepSelection(activeSeriesSeasons, activeSeason, activeEpisode, -1);
  streamNextBtn.disabled = !seriesMetadataApi.stepSelection(activeSeriesSeasons, activeSeason, activeEpisode, 1);
};

const showStreamChrome = () => {
  clearTimeout(streamChromeHideTimeout);
  inAppStreamDialog.classList.remove('controls-hidden');
  streamChromeHideTimeout = setTimeout(() => {
    if (inAppStreamDialog.open && streamStatusOverlay.hidden) inAppStreamDialog.classList.add('controls-hidden');
  }, 3200);
};

const syncSaveButton = (button, item) => {
  if (!button) return;
  const saved = Boolean(item && isFavorite(item));
  button.textContent = saved ? '✓ In My List' : '＋ My List';
  button.setAttribute('aria-pressed', String(saved));
};

const saveActiveStreamProgress = () => {
  if (!activeMedia || activeMedia.type === 'live') return;
  const existing = userState.progress[mediaKey(activeMedia)]?.progress || 0;
  let progress = existing;
  if (!streamDirectVideo.hidden && Number.isFinite(streamDirectVideo.duration) && streamDirectVideo.duration > 0) {
    progress = streamDirectVideo.currentTime / streamDirectVideo.duration;
  }
  if (!streamPlaybackConfirmed && streamDirectVideo.hidden) return;
  recordProgress(activeMedia, Math.max(0.01, progress), {
    season: activeSeason,
    episode: activeEpisode
  });
};

const showStreamStatus = (title, detail, canRetry = false) => {
  clearTimeout(streamStatusHideTimeout);
  streamStatusTitle.textContent = title;
  streamStatusDetail.textContent = detail;
  streamRetryButton.hidden = !canRetry;
  streamStatusOverlay.classList.toggle('failed', canRetry);
  streamStatusOverlay.classList.remove('ready');
  streamStatusOverlay.hidden = false;
  showStreamChrome();
};

const markStreamReady = () => {
  if (streamPlaybackConfirmed || !activeMedia || !inAppStreamDialog.open) return;
  streamPlaybackConfirmed = true;
  clearTimeout(streamLoadTimeout);
  streamLoadTimeout = null;
  streamStatusOverlay.classList.remove('failed');
  streamStatusOverlay.classList.add('ready');
  if (activeMedia.type === 'live' && liveStreamCandidates[liveStreamIndex]?.url) {
    watchBrowseApi.markLiveStreamSuccess(liveStreamCandidates[liveStreamIndex].url, localStorage);
  }
  if (activeMedia.type === 'live') {
    streamStatusHideTimeout = setTimeout(() => {
      streamStatusOverlay.hidden = true;
      streamStatusOverlay.classList.remove('ready');
      showStreamChrome();
    }, 420);
    return;
  }
  const existing = userState.progress[mediaKey(activeMedia)];
  const resumesSameSelection = existing
    && Number(existing.season || 1) === activeSeason
    && Number(existing.episode || 1) === activeEpisode;
  recordProgress(activeMedia, resumesSameSelection ? Math.max(0.01, existing.progress || 0) : 0.01, {
    season: activeSeason,
    episode: activeEpisode
  });
  streamStatusHideTimeout = setTimeout(() => {
    streamStatusOverlay.hidden = true;
    streamStatusOverlay.classList.remove('ready');
    showStreamChrome();
  }, 420);
};

const stopStreamReadinessPoll = () => {
  clearTimeout(streamReadinessPoll);
  streamReadinessPoll = null;
};

const inspectStreamGuest = async () => {
  stopStreamReadinessPoll();
  if (!activeMedia || !inAppStreamDialog.open || streamInAppWebview.hidden || streamPlaybackConfirmed) return;
  const generation = streamLoadGeneration;
  try {
    const result = await streamInAppWebview.executeJavaScript(`(() => {
      const media = document.querySelector('video, audio');
      const text = String(document.body?.innerText || '').toLowerCase();
      return {
        playing: Boolean(media && !media.paused && media.readyState >= 2),
        failed: /failed to load|unable to play|playback error|video not found/.test(text)
      };
    })()`, true);
    if (generation !== streamLoadGeneration || !inAppStreamDialog.open) return;
    if (result?.playing) {
      markStreamReady();
      return;
    }
    if (result?.failed) {
      tryNextStreamRoute();
      return;
    }
  } catch {
    // The provider may still be initializing; the bounded route timeout remains authoritative.
  }
  if (generation === streamLoadGeneration && activeMedia && inAppStreamDialog.open && !streamPlaybackConfirmed) {
    streamReadinessPoll = setTimeout(inspectStreamGuest, 900);
  }
};

const tryNextStreamRoute = () => {
  clearTimeout(streamLoadTimeout);
  streamLoadTimeout = null;
  if (!activeMedia || !inAppStreamDialog.open || activeMedia.directStream) return;
  const providerKeys = Object.keys(STREAM_PROVIDERS);
  streamProviderAttempts += 1;
  if (streamProviderAttempts >= providerKeys.length) {
    showStreamStatus('Unable to play right now', 'Try again in a moment or choose another title.', true);
    return;
  }
  const currentIndex = Math.max(0, providerKeys.indexOf(activeProviderKey));
  activeProviderKey = providerKeys[(currentIndex + 1) % providerKeys.length];
  streamServerSelect.value = activeProviderKey;
  showStreamStatus(activeMedia.name, 'One moment — Harbor is getting it ready.');
  setTimeout(() => {
    if (inAppStreamDialog.open) loadStreamSource();
  }, 180);
};

const currentLiveStream = () => liveStreamCandidates[liveStreamIndex] || null;

const tryNextLiveStream = () => {
  clearTimeout(streamLoadTimeout);
  streamLoadTimeout = null;
  if (!activeMedia || activeMedia.type !== 'live' || !inAppStreamDialog.open) return;
  const failed = currentLiveStream();
  if (failed?.url) watchBrowseApi.markLiveStreamFailure(failed.url, localStorage);
  liveStreamIndex += 1;
  liveStreamRecoveryAttempts = 0;
  if (liveStreamIndex >= liveStreamCandidates.length) {
    showStreamStatus('Unable to play right now', 'Harbor tried every compatible stream published for this channel. Try again later or choose another channel.', true);
    return;
  }
  showStreamStatus(activeMedia.name, 'That feed did not respond. Trying another public stream…');
  setTimeout(() => {
    if (inAppStreamDialog.open && activeMedia?.type === 'live') loadStreamSource();
  }, 180);
};

// Open In-App Streaming Player
const startStreamPlayback = async (item, season = 1, episode = 1) => {
  activeMedia = item;
  activeSeason = season;
  activeEpisode = episode;
  activeSeriesSeasons = [];
  streamPlaybackStartedAt = Date.now();
  streamPlaybackConfirmed = false;
  stopStreamReadinessPoll();
  streamProviderAttempts = 0;
  liveStreamCandidates = item.type === 'live'
    ? ((item.streamCandidates || []).length ? item.streamCandidates : [{ url: item.directStream, type: 'hls', quality: '', label: '' }]).filter((stream) => stream?.url)
    : [];
  liveStreamIndex = 0;
  liveStreamRecoveryAttempts = 0;

  const isSeries = item.type === 'tv' || item.type === 'anime';

  streamDialogTitle.textContent = item.name;
  if (mediaDetailDialog.open) mediaDetailDialog.close();
  if (!inAppStreamDialog.open) inAppStreamDialog.showModal();
  showStreamStatus(item.name, item.type === 'live' ? 'Connecting to the public live feed…' : (isSeries ? 'Getting your episode ready…' : 'Getting your movie ready…'));

  if (isSeries) {
    activeSeriesSeasons = await fetchTvShowDetails(item.tmdbId, item);
    if (activeMedia !== item || !inAppStreamDialog.open) return;
    const selection = seriesMetadataApi.clampSelection(activeSeriesSeasons, season, episode);
    activeSeason = selection.season;
    activeEpisode = selection.episode;
  }

  updateStreamEpisodeControls();
  streamServerSelect.value = activeProviderKey;
  loadStreamSource();
};

const destroyStreamHls = () => {
  if (!streamHls) return;
  streamHls.destroy();
  streamHls = null;
};

const loadStreamSource = () => {
  if (!activeMedia) return;
  streamLoadGeneration++;
  clearTimeout(streamLoadTimeout);
  streamLoadTimeout = null;
  stopStreamReadinessPoll();
  streamPlaybackConfirmed = false;
  destroyStreamHls();

  const isSeries = activeMedia.type === 'tv' || activeMedia.type === 'anime';
  const season = activeSeasonMetadata();
  showStreamStatus(
    activeMedia.name,
    isSeries
      ? (season?.name || ('Season ' + activeSeason)) + ' · Episode ' + activeEpisode
      : 'Getting your movie ready…'
  );

  const directStream = activeMedia.type === 'live' ? currentLiveStream()?.url : activeMedia.directStream;
  if (directStream) {
    streamInAppWebview.hidden = true;
    streamDirectVideo.hidden = false;
    streamDirectVideo.pause();
    streamDirectVideo.removeAttribute('src');
    const isHlsStream = /\.m3u8(?:$|[?#])/i.test(directStream);
    if (isHlsStream && window.Hls?.isSupported()) {
      streamHls = new window.Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 60 });
      streamHls.attachMedia(streamDirectVideo);
      streamHls.on(window.Hls.Events.MEDIA_ATTACHED, () => streamHls?.loadSource(directStream));
      streamHls.on(window.Hls.Events.MANIFEST_PARSED, () => streamDirectVideo.play().catch(() => {}));
      streamHls.on(window.Hls.Events.ERROR, (_event, data) => {
        if (!data?.fatal) return;
        if (activeMedia?.type === 'live') {
          if (liveStreamRecoveryAttempts < 1 && data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
            liveStreamRecoveryAttempts += 1;
            streamHls?.startLoad();
          } else if (liveStreamRecoveryAttempts < 1 && data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
            liveStreamRecoveryAttempts += 1;
            streamHls?.recoverMediaError();
          } else tryNextLiveStream();
        } else if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) streamHls?.startLoad();
        else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) streamHls?.recoverMediaError();
        else showStreamStatus('Unable to play right now', 'This live channel is not responding. Try another channel.', true);
      });
    } else {
      streamDirectVideo.src = directStream;
      streamDirectVideo.play().catch(() => {});
    }
    streamLoadTimeout = setTimeout(() => {
      if (activeMedia?.type === 'live') tryNextLiveStream();
      else showStreamStatus('Unable to play right now', 'The live channel did not respond. Try again shortly.', true);
    }, 15000);
    return;
  }

  streamDirectVideo.pause();
  destroyStreamHls();
  streamDirectVideo.hidden = true;
  streamInAppWebview.hidden = false;

  const provider = STREAM_PROVIDERS[activeProviderKey] || STREAM_PROVIDERS.vidlink;
  const streamUrl = provider.resolve(activeMedia.tmdbId, isSeries, activeSeason, activeEpisode);

  streamInAppWebview.src = streamUrl;
  streamLoadTimeout = setTimeout(tryNextStreamRoute, 18000);
};

// Open In-App Audio Playback
const playAudioStream = (item) => {
  activeMedia = item;
  resetLocalLibrary();
  hideLibraryViews();
  audioPlayerShell.hidden = false;
  readerMode = 'audio';
  mediaName.textContent = item.name;
  mediaDetails.textContent = (item.sections || ['Audio']).join(' · ');
  playerDialog.showModal();
  recordProgress(item, Math.max(0.01, userState.progress[mediaKey(item)]?.progress || 0));
  if (item.audioUrl) {
    audioPlayer.src = item.audioUrl;
    audioPlayer.load();
    audioPlayer.play().catch(() => {});
  }
};

const formatGuideClock = (value) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));

const loadLiveGuide = async (item) => {
  const generation = ++liveGuideGeneration;
  detailGuideList.replaceChildren();
  detailGuideStatus.textContent = 'Checking IPTV-org programme sources…';
  const guide = await watchBrowseApi.loadLiveGuide(item.channelId, item.feedId, { limit: 5 });
  if (generation !== liveGuideGeneration || activeMedia !== item || !mediaDetailDialog.open) return;
  if (!guide.programmes?.length) {
    detailGuideStatus.textContent = 'A current programme schedule is not published for this channel. Live playback is still available.';
    return;
  }
  detailGuideStatus.textContent = [guide.provider ? 'Listings from ' + guide.provider : '', guide.language ? guide.language.toUpperCase() : ''].filter(Boolean).join(' · ');
  detailGuideList.append(...guide.programmes.map((programme) => {
    const itemElement = document.createElement('li');
    itemElement.classList.toggle('current', Boolean(programme.current));
    const time = document.createElement('time');
    time.dateTime = programme.start;
    time.textContent = formatGuideClock(programme.start) + '–' + formatGuideClock(programme.stop);
    const copy = document.createElement('div');
    copy.append(createElement('strong', '', programme.title));
    if (programme.description) copy.append(createElement('p', '', programme.description));
    itemElement.append(time, copy);
    return itemElement;
  }));
};

// Media Detail Dialog (Episodes, live guide, and sources)
const openDetailDialog = async (item) => {
  activeMedia = item;
  const storedSelection = userState.progress[mediaKey(item)] || {};
  activeSeason = Number(storedSelection.season) || 1;
  activeEpisode = Number(storedSelection.episode) || 1;

  const isLive = item.type === 'live';
  detailTitle.textContent = item.name;
  detailSubtitle.textContent = isLive
    ? ['Live', item.countryFlag, item.countryName, ...(item.languageNames || []), item.streamCandidates?.[0]?.quality].filter(Boolean).join(' · ')
    : item.year + ' · ★ ' + item.rating + ' · ' + (item.sections || []).join(', ');
  detailOverview.textContent = item.overview;
  syncSaveButton(detailSaveBtn, item);
  detailPlayBtn.hidden = !isLive;
  detailLiveGuide.hidden = !isLive;
  if (isLive) {
    detailPlayBtn.onclick = () => void startStreamPlayback(item);
    detailGuideStatus.textContent = 'Checking programme data…';
    detailGuideList.replaceChildren();
  } else {
    liveGuideGeneration++;
  }

  detailSaveBtn.onclick = () => {
    const saved = toggleFavorite(item);
    syncSaveButton(detailSaveBtn, item);
    syncSaveButton(heroLibraryButton, heroMedia);
    renderResources();
    showStatusToast(saved ? 'Added to My List' : 'Removed from My List', item.name);
  };

  const isSeries = item.type === 'tv' || item.type === 'anime';
  detailEpisodesWrap.hidden = !isSeries;
  if (!mediaDetailDialog.open) mediaDetailDialog.showModal();
  if (isLive) void loadLiveGuide(item);

  if (isSeries) {
    activeSeriesSeasons = [];
    detailSeasonRow.hidden = false;
    detailSeasonSelect.disabled = true;
    detailSeasonSelect.innerHTML = '<option>Loading seasons…</option>';
    detailEpisodesList.innerHTML = '<p class="episode-loading-copy">Loading episodes…</p>';
    activeSeriesSeasons = await fetchTvShowDetails(item.tmdbId, item);
    if (activeMedia !== item || !mediaDetailDialog.open) return;
    detailSeasonRow.hidden = !activeSeriesSeasons.length;
    detailSeasonSelect.innerHTML = '';
    for (const season of activeSeriesSeasons) {
      const opt = document.createElement('option');
      opt.value = season.number;
      opt.textContent = season.name + ' · ' + season.episodeCount + (season.episodeCount === 1 ? ' episode' : ' episodes');
      detailSeasonSelect.appendChild(opt);
    }
    const selection = seriesMetadataApi.clampSelection(activeSeriesSeasons, activeSeason, activeEpisode);
    activeSeason = selection.season;
    activeEpisode = selection.episode;
    detailSeasonSelect.value = String(activeSeason);
    detailSeasonSelect.disabled = !activeSeriesSeasons.length;
    renderEpisodeChips();

    detailSeasonSelect.onchange = (e) => {
      activeSeason = parseInt(e.target.value, 10);
      activeEpisode = 1;
      renderEpisodeChips();
    };
  }
};

const renderEpisodeChips = () => {
  detailEpisodesList.innerHTML = '';
  const season = activeSeasonMetadata();
  const count = season?.episodeCount || 0;
  if (!count) {
    detailEpisodesList.innerHTML = '<p class="episode-loading-copy">Episode information is unavailable.</p>';
    return;
  }
  for (let ep = 1; ep <= count; ep++) {
    const btn = document.createElement('button');
    btn.className = 'ep-btn ' + (ep === activeEpisode ? 'active' : '');
    btn.textContent = 'Episode ' + ep;
    btn.onclick = () => {
      activeEpisode = ep;
      startStreamPlayback(activeMedia, activeSeason, activeEpisode);
    };
    detailEpisodesList.appendChild(btn);
  }
};

const handleMediaClick = async (item) => {
  activeMedia = item;

  if (item.externalUrl) {
    const result = await window.harbor?.openDirectoryLink?.(item.externalUrl);
    showStatusToast(
      result?.status === 'opened' ? 'Opened in your browser' : 'This link could not be opened',
      item.domain || item.name
    );
    return;
  }

  recordHistory(item);

  if (item._resume && item.category === 'Watch') {
    startStreamPlayback(item, item._resume.season || 1, item._resume.episode || 1);
    return;
  }

  if (item.category === 'Watch') {
    if (item.type === 'tv' || item.type === 'anime' || item.type === 'live') {
      openDetailDialog(item);
    } else {
      startStreamPlayback(item);
    }
  } else if (item.category === 'Listen') {
    if (item.audioUrl) {
      playAudioStream(item);
      mediaName.textContent = item.name;
    } else {
      resetLocalLibrary();
      placeholderTitle.textContent = 'Open ' + item.name;
      placeholderText.textContent = 'Choose a local audio file. Your listening stays on this device.';
      playerDialog.showModal();
    }
  } else if (item.category === 'Read' || item.category === 'Play') {
    resetLocalLibrary();
    placeholderTitle.textContent = item.category === 'Play' ? 'Add ' + item.name : 'Open ' + item.name;
    placeholderText.textContent = item.category === 'Play'
      ? 'Choose the installed game on this computer to add it to your Harbor library.'
      : 'Choose a local EPUB, PDF, or CBZ copy. Your reading stays on this device.';
    playerDialog.showModal();
  }
};

const buildCard = (item) => {
  const card = createElement('article', 'media-card');
  card.dataset.category = item.category;
  card.dataset.external = String(Boolean(item.externalUrl));
  const openButton = createElement('button', 'media-card-open');
  openButton.type = 'button';
  openButton.setAttribute('aria-label', 'Open ' + item.name + (item.externalUrl ? ' in your browser' : ''));
  openButton.addEventListener('click', () => void handleMediaClick(item));

  const art = createElement('span', 'media-art');
  const fallback = createElement('span', 'art-fallback');
  fallback.append(
    createElement('span', '', (item.sections || [item.category])[0]),
    createElement('strong', '', item.name)
  );
  art.append(fallback);

  if (item.artworkUrl) {
    const image = document.createElement('img');
    image.src = artworkSource(item.artworkUrl);
    image.alt = '';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('load', () => { fallback.hidden = true; }, { once: true });
    image.addEventListener('error', () => { fallback.hidden = false; image.remove(); }, { once: true });
    art.append(image);
  }

  if (item.type === 'live') art.append(createElement('span', 'media-badge', 'Live'));
  art.append(createElement('span', 'card-play', item.externalUrl ? '↗' : '▶'));

  const copy = createElement('span', 'media-card-copy');
  copy.append(
    createElement('strong', 'media-card-title', item.name),
    createElement(
      'span',
      'media-card-meta',
      item.externalUrl
        ? (item.domain || 'Website') + ' · ' + (item.sections || []).slice(0, 2).join(' · ')
        : (item.type === 'live'
          ? 'Live · ' + (item.sections || []).slice(0, 2).join(' · ')
          : item.year + ' · ★ ' + item.rating + ' · ' + (item.sections || []).slice(0, 2).join(' · '))
    )
  );
  openButton.append(art, copy);

  const saveButton = createElement('button', 'card-save', isFavorite(item) ? '✓' : '＋');
  saveButton.type = 'button';
  saveButton.title = isFavorite(item) ? 'Remove from My List' : 'Add to My List';
  saveButton.setAttribute('aria-label', saveButton.title + ': ' + item.name);
  saveButton.setAttribute('aria-pressed', String(isFavorite(item)));
  saveButton.addEventListener('click', () => {
    const saved = toggleFavorite(item);
    showStatusToast(saved ? 'Added to My List' : 'Removed from My List', item.name);
    renderResources();
    if (myHarborDialog.open) renderMyHarbor();
  });

  if (item.externalUrl) card.append(openButton);
  else card.append(openButton, saveButton);
  if (item._resume) {
    const progress = createElement('span', 'card-progress');
    const fill = createElement('span', 'card-progress-fill');
    fill.style.width = Math.round(item._resume.progress * 100) + '%';
    progress.append(fill);
    card.append(progress);
  }
  return card;
};

const renderMyHarborSettings = () => {
  const settings = createElement('div', 'settings-list');
  [
    ['autoplayNext', 'Autoplay next episode', 'Move into the next episode automatically.'],
    ['rememberProgress', 'Remember playback progress', 'Keep Continue Watching on this device.'],
    ['reduceMotion', 'Reduce motion', 'Minimize interface movement and animation.']
  ].forEach(([key, label, description]) => {
    const row = createElement('label', 'setting-row');
    const copy = createElement('span', 'setting-copy');
    copy.append(createElement('strong', '', label), createElement('small', '', description));
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(userState.settings[key]);
    input.addEventListener('change', () => {
      userState.settings[key] = input.checked;
      persistUserState();
    });
    row.append(copy, input);
    settings.append(row);
  });

  const clearActivity = createElement('button', 'button-secondary clear-activity-button', 'Clear viewing activity');
  clearActivity.type = 'button';
  clearActivity.addEventListener('click', () => {
    userState.history = [];
    userState.progress = {};
    persistUserState();
    renderMyHarbor();
    showStatusToast('Viewing activity cleared');
  });
  const dataSection = createElement('section', 'settings-data-section');
  const dataCopy = createElement('div', 'setting-copy');
  dataCopy.append(
    createElement('strong', '', 'Your Harbor data'),
    createElement('small', '', 'Back up or restore My List, viewing history, progress, and preferences. Installed-game paths are never included.')
  );
  const dataActions = createElement('div', 'settings-data-actions');
  const exportData = Object.assign(createElement('button', 'button-secondary', 'Back up data'), { type: 'button' });
  const importData = Object.assign(createElement('button', 'button-secondary', 'Restore backup'), { type: 'button' });
  exportData.addEventListener('click', async () => {
    exportData.disabled = true;
    const result = await window.harbor?.exportUserData?.(userState).catch(() => ({ status: 'error' }));
    exportData.disabled = false;
    if (result?.status === 'saved') showStatusToast('Harbor data backed up', result.fileName || 'Backup saved');
    else if (result?.status === 'error') showStatusToast('Backup could not be saved', result.message || 'Try another location.');
  });
  importData.addEventListener('click', async () => {
    importData.disabled = true;
    const result = await window.harbor?.importUserData?.().catch(() => ({ status: 'error' }));
    importData.disabled = false;
    if (result?.status === 'ready' && result.state) {
      if (!window.confirm(`Restore ${result.fileName || 'this Harbor backup'}? This replaces the current My Harbor data on this device.`)) return;
      userState = userStateApi.normalize(result.state);
      persistUserState();
      renderMyHarbor();
      showStatusToast('Harbor data restored', 'My List, activity, progress, and preferences are ready.');
    } else if (result?.status === 'invalid' || result?.status === 'error') {
      showStatusToast('Backup could not be restored', result.message || 'Choose a valid Harbor backup.');
    }
  });
  dataActions.append(exportData, importData);
  dataSection.append(dataCopy, dataActions);
  const showWelcome = Object.assign(createElement('button', 'button-secondary clear-activity-button', 'Show welcome guide'), { type: 'button' });
  showWelcome.addEventListener('click', () => {
    myHarborDialog.close();
    welcomeDialog.showModal();
    welcomeStartButton.focus();
  });
  settings.append(dataSection, showWelcome, clearActivity);
  return settings;
};

const renderSavedGameLibrary = () => {
  if (!savedGameLibrary.length) {
    const empty = createElement('div', 'my-harbor-empty');
    empty.append(
      createElement('strong', '', 'Your local library is ready.'),
      createElement('p', '', 'Add games installed on this computer and launch them without exposing their file paths to the app.'),
      Object.assign(createElement('button', 'button-primary', 'Add an installed game'), { type: 'button' })
    );
    empty.lastChild.addEventListener('click', chooseInstalledGame);
    return empty;
  }

  const list = createElement('div', 'saved-game-list');
  savedGameLibrary.forEach((game) => {
    const row = createElement('article', 'saved-game-row');
    const mark = createElement('span', 'saved-game-mark', '◆');
    const copy = createElement('div', 'saved-game-copy');
    copy.append(
      createElement('strong', '', game.name),
      createElement('small', '', 'Installed game · added ' + new Date(game.addedAt || Date.now()).toLocaleDateString())
    );
    const actions = createElement('div', 'saved-game-actions');
    const play = Object.assign(createElement('button', 'button-primary', 'Play'), { type: 'button' });
    const remove = Object.assign(createElement('button', 'button-secondary', 'Remove'), { type: 'button' });
    play.addEventListener('click', async () => {
      const result = await window.harbor?.launchSavedGame?.(game.id);
      showStatusToast(result?.status === 'opened' ? 'Game launched' : 'Could not launch game', result?.message || game.name);
    });
    remove.addEventListener('click', async () => {
      const result = await window.harbor?.removeGame?.(game.id);
      if (result?.status === 'removed') {
        await refreshSavedGameLibrary();
        showStatusToast('Removed from local library', game.name);
      }
    });
    actions.append(play, remove);
    row.append(mark, copy, actions);
    list.append(row);
  });

  const addAnother = Object.assign(createElement('button', 'button-secondary add-saved-game', 'Add another game'), { type: 'button' });
  addAnother.addEventListener('click', chooseInstalledGame);
  list.append(addAnother);
  return list;
};

const refreshSavedGameLibrary = async () => {
  const entries = await window.harbor?.listGames?.();
  savedGameLibrary = Array.isArray(entries) ? entries : [];
  if (myHarborDialog.open && activeMyHarborTab === 'library') renderMyHarbor();
  return savedGameLibrary;
};

const renderMyHarbor = () => {
  const continueList = continueEntries();
  myListCount.textContent = String(userState.favorites.length);
  continueCount.textContent = String(continueList.length);
  historyCount.textContent = String(userState.history.length);
  myHarborTabs.querySelectorAll('[data-my-harbor-tab]').forEach((button) => {
    const active = button.dataset.myHarborTab === activeMyHarborTab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    if (active) myHarborContent.setAttribute('aria-labelledby', button.id);
  });

  if (activeMyHarborTab === 'settings') {
    myHarborContent.replaceChildren(renderMyHarborSettings());
    return;
  }

  if (activeMyHarborTab === 'library') {
    myHarborContent.replaceChildren(renderSavedGameLibrary());
    return;
  }

  const source = activeMyHarborTab === 'list'
    ? userState.favorites
    : activeMyHarborTab === 'history'
      ? userState.history
      : continueList.map((entry) => ({ ...entry.item, _resume: entry }));

  if (!source.length) {
    const empty = createElement('div', 'my-harbor-empty');
    const messages = {
      list: ['Your list is ready for something great.', 'Use the ＋ button on any title to save it here.'],
      continue: ['Nothing waiting for you.', 'Start watching or listening and Harbor will remember your place.'],
      history: ['No recent activity yet.', 'Things you open will appear here.']
    };
    const [title, description] = messages[activeMyHarborTab];
    empty.append(createElement('strong', '', title), createElement('p', '', description));
    myHarborContent.replaceChildren(empty);
    return;
  }

  const grid = createElement('div', 'my-harbor-grid');
  source.forEach((item) => {
    grid.append(buildCard(item));
  });
  myHarborContent.replaceChildren(grid);
};

const openMyHarbor = (tab = 'list') => {
  if (!myHarborDialog.open) myHarborReturnFocus = document.activeElement;
  activeMyHarborTab = tab;
  renderMyHarbor();
  if (!myHarborDialog.open) myHarborDialog.showModal();
  void refreshSavedGameLibrary();
};

const buildRail = (title, items, options = {}) => {
  if (!items.length) return null;
  const section = createElement('section', 'content-rail');
  const heading = createElement('div', 'rail-heading');
  const headingCopy = createElement('div');
  headingCopy.append(createElement('h2', '', title));
  if (options.description) headingCopy.append(createElement('p', '', options.description));
  heading.append(headingCopy);

  if (options.subcategory) {
    const seeAll = createElement('button', 'rail-link', 'See all →');
    seeAll.type = 'button';
    seeAll.addEventListener('click', () => {
      activeSubcategory = options.subcategory;
      renderResources();
      window.scrollTo({ top: document.querySelector('.browse-shell').offsetTop - 78, behavior: 'smooth' });
    });
    heading.append(seeAll);
  }

  const itemsWrap = createElement('div', 'rail-items');
  itemsWrap.append(...items.slice(0, options.limit || 12).map(buildCard));
  section.append(heading, itemsWrap);
  return section;
};

const renderResources = () => {
  const visible = filteredMedia();
  const config = SECTION_CONFIG[activeCategory] || SECTION_CONFIG.Home;
  const rails = [];
  const searchScopeName = getSearchScopeName();
  const searchLocation = searchScopeName === 'Harbor' ? 'across Harbor' : 'in ' + searchScopeName;
  const searchLoadingTarget = searchScopeName === 'Harbor' ? 'the full Harbor catalog' : searchScopeName + ' only';
  const formattedSearchTotal = searchState.total === null
    ? null
    : new Intl.NumberFormat().format(searchState.total);
  const partialSearchNote = searchState.partial
    ? ' Some catalog sources are temporarily unavailable, so these results may be incomplete.'
    : '';
  const searchSummary = (searchState.loading
    ? (visible.length
      ? visible.length + ' promising ' + (visible.length === 1 ? 'match' : 'matches') + ' so far. Searching ' + searchLoadingTarget + '…'
      : 'Searching ' + searchLoadingTarget + '…')
    : (formattedSearchTotal && searchState.total > visible.length
      ? 'Showing the best ' + visible.length + ' from ' + formattedSearchTotal + ' matches ' + searchLocation + '.'
      : visible.length + ' ' + (visible.length === 1 ? 'match' : 'matches') + ' ' + searchLocation + '.')) + partialSearchNote;

  if (query.trim()) {
    const resultsSection = createElement('section', 'content-rail');
    const heading = createElement('div', 'rail-heading');
    const headingCopy = createElement('div');
    headingCopy.append(
      createElement('h2', '', 'Search results'),
      createElement('p', '', searchSummary)
    );
    heading.append(headingCopy);
    const grid = createElement('div', 'search-grid');
    grid.append(...visible.map(buildCard));
    resultsSection.append(heading, grid);
    if (searchState.canLoadMore && !searchState.loading) {
      const moreWrap = createElement('div', 'load-more-wrap');
      const moreButton = Object.assign(createElement('button', 'button-secondary load-more-button', 'Show more results'), { type: 'button' });
      moreButton.addEventListener('click', loadMoreSearchResults);
      moreWrap.append(moreButton);
      resultsSection.append(moreWrap);
    } else if (searchState.loading && searchState.page > 1) {
      const moreWrap = createElement('div', 'load-more-wrap');
      moreWrap.append(createElement('span', 'loading-more-label', 'Loading more…'));
      resultsSection.append(moreWrap);
    }
    rails.push(resultsSection);
  } else if (activeCategory === 'Home') {
    const popular = [...currentMediaList].sort((a, b) => Number(b.rating) - Number(a.rating));
    [
      buildRail('Continue watching', continueEntries().map((entry) => ({ ...entry.item, _resume: entry })), { description: 'Jump back in' }),
      buildRail('My List', userState.favorites, { description: 'Saved for later' }),
      buildRail('Popular on Harbor', popular, { description: 'A little bit of everything' }),
      buildRail('Watch tonight', getSectionItems('Watch'), { description: 'Movies, shows, anime, sports, and live TV' }),
      buildRail('Listen elsewhere', getSectionItems('Listen'), { description: 'Curated music links from YarrList' }),
      buildRail('Read elsewhere', getSectionItems('Read'), { description: 'Curated manga, comic, and eBook links from YarrList' }),
      buildRail('Find games', getSectionItems('Play'), { description: 'Curated game links from YarrList' })
    ].filter(Boolean).forEach((rail) => rails.push(rail));
  } else if (activeSubcategory === 'All') {
    config.subcategories.slice(1).forEach((subcategory) => {
      const items = getSectionItems(activeCategory, subcategory);
      const rail = buildRail(subcategory, items, { subcategory });
      if (rail) rails.push(rail);
    });
    if (!rails.length) {
      const rail = buildRail('Browse all', getSectionItems(activeCategory));
      if (rail) rails.push(rail);
    }
  } else {
    const resultsSection = createElement('section', 'content-rail');
    const heading = createElement('div', 'rail-heading');
    const headingCopy = createElement('div');
    const activeFilter = activeCategory === 'Watch'
      ? watchBrowseApi.getFilter(activeSubcategory, activeWatchFilter)
      : null;
    headingCopy.append(
      createElement('h2', '', activeFilter ? activeFilter.label + ' ' + activeSubcategory : activeSubcategory),
      createElement('p', '', watchBrowseLoading ? 'Loading the latest picks…' : categoryAvailabilityLabel(visible.length))
    );
    heading.append(headingCopy);
    const grid = createElement('div', 'category-grid');
    grid.append(...visible.map(buildCard));
    resultsSection.append(heading, grid);
    if (watchBrowseCanLoadMore && !watchBrowseLoading) {
      const moreWrap = createElement('div', 'load-more-wrap');
      const moreButton = Object.assign(createElement('button', 'button-secondary load-more-button', 'Show more'), { type: 'button' });
      moreButton.addEventListener('click', loadMoreWatchBrowse);
      moreWrap.append(moreButton);
      resultsSection.append(moreWrap);
    }
    rails.push(resultsSection);
  }

  resourceList.replaceChildren(...rails);

  searchInput.placeholder = 'Search ' + searchScopeName;
  searchInput.setAttribute('aria-label', 'Search ' + searchScopeName);
  heroKicker.textContent = query.trim() ? 'Search ' + searchScopeName : config.kicker;
  directoryTitle.textContent = query.trim()
    ? (searchScopeName === 'Harbor'
      ? 'Results for “' + query.trim() + '”'
      : searchScopeName + ' results for “' + query.trim() + '”')
    : config.title;
  resultsLabel.textContent = query.trim()
    ? searchSummary
    : config.description;

  heroMedia = query.trim()
    ? visible[0]
    : (activeCategory === 'Home' ? getSectionItems('Watch')[0] : visible[0]);
  heroFeature.hidden = !heroMedia;
  heroSection.style.setProperty('--hero-artwork', heroMedia?.artworkUrl ? 'url("' + artworkSource(heroMedia.artworkUrl).replace(/"/g, '%22') + '")' : 'none');
  if (heroMedia) {
    heroFeatureTitle.textContent = heroMedia.name;
    heroFeatureMeta.textContent = heroMedia.externalUrl
      ? (heroMedia.domain || 'Website') + ' · YarrList'
      : (heroMedia.type === 'live'
        ? 'Live · ' + (heroMedia.sections || []).slice(0, 2).join(' · ')
        : heroMedia.year + ' · ' + (heroMedia.sections || []).slice(0, 2).join(' · '));
    heroFeature.setAttribute('aria-label', 'Open featured title ' + heroMedia.name);
  }
  syncSaveButton(heroLibraryButton, heroMedia);
  heroLibraryButton.hidden = !heroMedia || Boolean(heroMedia.externalUrl);
  heroPrimaryButton.lastChild.textContent = ' ' + config.action;

  emptyState.querySelector('h2').textContent = query.trim() && searchState.partial
    ? 'Search is partly unavailable'
    : 'Nothing here yet';
  emptyState.querySelector('p').textContent = query.trim() && searchState.partial
    ? 'Some catalog sources could not be reached. Try again in a moment or explore another category.'
    : 'Try a different search or explore another category.';
  emptyState.hidden = visible.length > 0 || searchState.loading || watchBrowseLoading;
  resourceList.hidden = visible.length === 0 && !watchBrowseLoading;
  clearButton.hidden = !query;
  catalogCount.textContent = query.trim()
    ? (searchState.loading
      ? 'Searching ' + searchLoadingTarget + '…'
      : (formattedSearchTotal || visible.length) + ' ' + searchScopeName + ' ' + ((searchState.total || visible.length) === 1 ? 'match' : 'matches') + (searchState.partial ? ' · partial results' : ''))
    : (activeCategory === 'Listen' || activeCategory === 'Read' || activeCategory === 'Play'
      ? getSectionItems(activeCategory).length + ' curated links from YarrList'
      : (watchBrowseLoading ? 'Loading the latest catalog…' : 'Millions of movies, shows, and live channels to explore'));
  renderCategories();
};

const resetFilters = () => {
  clearTimeout(searchTimeout);
  searchController?.abort();
  searchController = null;
  searchSequence++;
  activeCategory = 'Home';
  activeSubcategory = 'All';
  activeWatchFilter = '';
  resetWatchBrowseState();
  query = '';
  searchState = { term: '', loading: false, total: null, page: 1, canLoadMore: false, partial: false };
  searchInput.value = '';
  currentMediaList = [...discoveryMediaList];
  renderResources();
};

const clearSearchPreservingScope = () => {
  clearTimeout(searchTimeout);
  searchController?.abort();
  searchController = null;
  searchSequence++;
  query = '';
  searchState = { term: '', loading: false, total: null, page: 1, canLoadMore: false, partial: false };
  searchInput.value = '';
  currentMediaList = [...discoveryMediaList];
  renderResources();
  searchInput.focus();
};

// Search locally on every keystroke, then merge remote results after a short debounce.
searchInput.addEventListener('input', (event) => {
  beginSearch(event.target.value);
});

clearButton.addEventListener('click', clearSearchPreservingScope);
showAllButton.addEventListener('click', resetFilters);
compactSearchButton.addEventListener('click', () => {
  searchInput.focus();
  searchInput.select();
});
liveCountrySelect.addEventListener('change', () => {
  activeLiveCountry = liveCountrySelect.value;
  reloadLiveDirectory();
});
liveLanguageSelect.addEventListener('change', () => {
  activeLiveLanguage = liveLanguageSelect.value;
  reloadLiveDirectory();
});

// Stream Controls
streamServerSelect.addEventListener('change', (e) => {
  activeProviderKey = e.target.value;
  streamProviderAttempts = 0;
  loadStreamSource();
});

streamInAppWebview.addEventListener('dom-ready', inspectStreamGuest);
streamInAppWebview.addEventListener('did-fail-load', (event) => {
  if (event.errorCode === -3 || event.isMainFrame === false) return;
  tryNextStreamRoute();
});
streamInAppWebview.addEventListener('render-process-gone', tryNextStreamRoute);
streamDirectVideo.addEventListener('canplay', markStreamReady);
streamDirectVideo.addEventListener('error', () => {
  if (activeMedia?.type === 'live') tryNextLiveStream();
  else showStreamStatus('Unable to play right now', 'The live channel could not be played. Try again shortly.', true);
});
streamRetryButton.addEventListener('click', () => {
  if (activeMedia?.type === 'live') {
    liveStreamIndex = 0;
    liveStreamRecoveryAttempts = 0;
    loadStreamSource();
    return;
  }
  streamProviderAttempts = 0;
  activeProviderKey = Object.keys(STREAM_PROVIDERS)[0];
  streamServerSelect.value = activeProviderKey;
  loadStreamSource();
});

const changeStreamEpisode = (direction) => {
  if (!activeMedia) return;
  const next = seriesMetadataApi.stepSelection(activeSeriesSeasons, activeSeason, activeEpisode, direction);
  if (!next) return;
  saveActiveStreamProgress();
  activeSeason = next.season;
  activeEpisode = next.episode;
  streamProviderAttempts = 0;
  streamPlaybackStartedAt = Date.now();
  updateStreamEpisodeControls();
  loadStreamSource();
};

streamNextBtn.onclick = () => changeStreamEpisode(1);
streamPrevBtn.onclick = () => changeStreamEpisode(-1);

inAppStreamDialog.addEventListener('mousemove', showStreamChrome);
inAppStreamDialog.addEventListener('focusin', showStreamChrome);

closeStreamDialogBtn.addEventListener('click', () => {
  saveActiveStreamProgress();
  clearTimeout(streamLoadTimeout);
  streamLoadTimeout = null;
  clearTimeout(streamStatusHideTimeout);
  clearTimeout(streamChromeHideTimeout);
  stopStreamReadinessPoll();
  streamPlaybackConfirmed = false;
  streamLoadGeneration++;
  liveStreamCandidates = [];
  liveStreamIndex = 0;
  liveStreamRecoveryAttempts = 0;
  streamDirectVideo.pause();
  destroyStreamHls();
  streamDirectVideo.removeAttribute('src');
  streamInAppWebview.src = 'about:blank';
  inAppStreamDialog.classList.remove('controls-hidden');
  inAppStreamDialog.close();
  renderResources();
});

closeDetailDialogBtn.addEventListener('click', () => {
  liveGuideGeneration++;
  mediaDetailDialog.close();
});

document.querySelectorAll('[data-section]').forEach((button) => {
  button.addEventListener('click', () => setActiveSection(button.dataset.section));
});

heroFeature.addEventListener('click', () => {
  if (heroMedia) handleMediaClick(heroMedia);
});

heroPrimaryButton.addEventListener('click', () => {
  if (heroMedia) handleMediaClick(heroMedia);
  else setActiveSection(activeCategory === 'Home' ? 'Watch' : activeCategory);
});

heroLibraryButton.addEventListener('click', () => {
  if (!heroMedia) return;
  const saved = toggleFavorite(heroMedia);
  renderResources();
  showStatusToast(saved ? 'Added to My List' : 'Removed from My List', heroMedia.name);
});

playerButton.addEventListener('click', () => openMyHarbor());
closeMyHarborButton.addEventListener('click', () => myHarborDialog.close());
let myHarborReturnFocus = null;
myHarborTabs.addEventListener('click', (event) => {
  const button = event.target.closest('[data-my-harbor-tab]');
  if (!button) return;
  activeMyHarborTab = button.dataset.myHarborTab;
  renderMyHarbor();
});
myHarborTabs.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const tabs = [...myHarborTabs.querySelectorAll('[data-my-harbor-tab]')];
  const current = Math.max(0, tabs.indexOf(document.activeElement));
  const next = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? tabs.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  event.preventDefault();
  activeMyHarborTab = tabs[next].dataset.myHarborTab;
  renderMyHarbor();
  tabs[next].focus();
});
myHarborDialog.addEventListener('close', () => {
  if (myHarborReturnFocus?.isConnected && myHarborReturnFocus !== document.body) myHarborReturnFocus.focus();
  myHarborReturnFocus = null;
});
openLocalLibraryButton.addEventListener('click', () => {
  myHarborDialog.close();
  activeMedia = null;
  playerDialog.showModal();
});
closePlayerButton.addEventListener('click', () => playerDialog.close());

const completeOnboarding = () => {
  if (!userState.settings.onboardingComplete) {
    userState.settings.onboardingComplete = true;
    persistUserState();
  }
};
welcomeDialog.addEventListener('close', completeOnboarding);
welcomeStartButton.addEventListener('click', () => {
  completeOnboarding();
  welcomeDialog.close();
  setActiveSection('Watch');
});
welcomeMyHarborButton.addEventListener('click', () => {
  completeOnboarding();
  welcomeDialog.close();
  openMyHarbor('list');
});

let lastPlaybackProgressWrite = 0;
let updateReturnFocus = null;
const trackHtmlMediaProgress = (mediaElement) => {
  if (!activeMedia || !Number.isFinite(mediaElement.duration) || mediaElement.duration <= 0) return;
  const now = Date.now();
  if (now - lastPlaybackProgressWrite < 5000) return;
  lastPlaybackProgressWrite = now;
  recordProgress(activeMedia, mediaElement.currentTime / mediaElement.duration, {
    season: activeSeason,
    episode: activeEpisode
  });
};
streamDirectVideo.addEventListener('timeupdate', () => trackHtmlMediaProgress(streamDirectVideo));
audioPlayer.addEventListener('timeupdate', () => trackHtmlMediaProgress(audioPlayer));
streamDirectVideo.addEventListener('ended', () => {
  if (!activeMedia) return;
  recordProgress(activeMedia, 1, { season: activeSeason, episode: activeEpisode });
  if ((activeMedia.type === 'tv' || activeMedia.type === 'anime') && userState.settings.autoplayNext) {
    streamNextBtn.click();
  }
});
audioPlayer.addEventListener('ended', () => {
  if (activeMedia) recordProgress(activeMedia, 1);
});

updateButton.addEventListener('click', async () => {
  updateReturnFocus = document.activeElement;
  updateStatus.textContent = 'Checking the stable release channel…';
  updateDialog.showModal();
  updateTitle.focus({ preventScroll: true });
  const [version, release, device] = await Promise.all([
    window.harbor?.getVersion?.(),
    window.harbor?.checkForUpdates?.(),
    window.harbor?.getDiagnostics?.()
  ]);
  if (version) {
    appVersion.textContent = 'Harbor ' + version;
  }
  if (release?.status === 'checked' && release.updateAvailable) {
    updateStatus.textContent = `Harbor ${release.latestVersion} is available. Download it, then return here to verify and install it.`;
  } else if (release?.status === 'checked') {
    updateStatus.textContent = `Harbor ${release.currentVersion} is up to date on the Stable channel.`;
  } else {
    updateStatus.textContent = release?.message || `You are using Harbor ${version || ''}.`;
  }
  if (device) {
    diagnosticSummary.textContent = `Harbor ${device.appVersion} · ${device.platform} ${device.osRelease} · ${device.architecture} · Electron ${device.electronVersion}`;
  }
});

updateDialog.addEventListener('close', () => {
  if (updateReturnFocus?.isConnected) updateReturnFocus.focus();
  updateReturnFocus = null;
});

chooseUpdateButton.addEventListener('click', async () => {
  updateStatus.textContent = 'Choose the Harbor installer you downloaded.';
  const result = await window.harbor?.chooseUpdate?.();
  if (!result || result.status === 'cancelled') {
    updateStatus.textContent = 'No update selected.';
  } else if (result.status === 'opened') {
    updateStatus.textContent = 'The updater is open. Follow its steps to finish.';
  } else {
    updateStatus.textContent = result.message || 'That update could not be opened.';
  }
});

releasePageButton.addEventListener('click', async () => {
  updateStatus.textContent = 'Opening the official Harbor downloads page…';
  const result = await window.harbor?.openReleasePage?.();
  updateStatus.textContent = result?.status === 'opened'
    ? 'Downloads opened in your browser.'
    : 'The downloads page could not be opened.';
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    if (welcomeDialog.open) {
      welcomeDialog.close();
    } else if (inAppStreamDialog.open) {
      saveActiveStreamProgress();
      clearTimeout(streamLoadTimeout);
      streamLoadTimeout = null;
      stopStreamReadinessPoll();
      streamPlaybackConfirmed = false;
      streamLoadGeneration++;
      streamDirectVideo.pause();
      destroyStreamHls();
      streamDirectVideo.removeAttribute('src');
      streamInAppWebview.src = 'about:blank';
      inAppStreamDialog.close();
    } else if (mediaDetailDialog.open) {
      mediaDetailDialog.close();
    } else if (myHarborDialog.open) {
      myHarborDialog.close();
    } else if (playerDialog.open) {
      playerDialog.close();
    } else if (updateDialog.open) {
      updateDialog.close();
    } else if (query) {
      clearSearchPreservingScope();
    }
  }
});

// Render Watch immediately, then add the validated desktop link directory.
loadCachedCatalogTotals();
renderResources();
if (!userState.settings.onboardingComplete) {
  requestAnimationFrame(() => {
    welcomeDialog.showModal();
    welcomeStartButton.focus();
  });
}
void window.harbor?.getVersion?.().then((version) => {
  if (version) appVersion.textContent = 'Harbor ' + version;
});

copyDiagnosticsButton.addEventListener('click', async () => {
  const result = await window.harbor?.copyDiagnostics?.();
  showStatusToast(result?.status === 'copied' ? 'Diagnostics copied' : 'Diagnostics could not be copied');
});

supportPageButton.addEventListener('click', async () => {
  const result = await window.harbor?.openTrustedPage?.('support');
  if (result?.status !== 'opened') showStatusToast('Support page could not be opened');
});

tmdbPageButton.addEventListener('click', async () => {
  const result = await window.harbor?.openTrustedPage?.('tmdb');
  if (result?.status !== 'opened') showStatusToast('TMDB could not be opened');
});
setTimeout(() => {
  void window.harbor?.checkForUpdates?.().then((release) => {
    if (release?.status !== 'checked' || !release.updateAvailable) return;
    updateButton.classList.add('update-available');
    updateButton.setAttribute('aria-label', `Harbor ${release.latestVersion} is available`);
    updateButton.title = `Harbor ${release.latestVersion} is available`;
  });
}, 3500);
if (!window.harbor?.chooseUpdate) {
  chooseUpdateButton.disabled = true;
  chooseUpdateButton.textContent = 'Available in the installed app';
  updateStatus.textContent = 'Update controls are available in the installed Harbor app.';
}
void (async () => {
  await loadDirectoryLinks();
  await fetchTrendingMedia();
  void fetchCatalogTotals();
})();

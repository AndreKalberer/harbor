const categoryList = document.querySelector('#category-list');
const resourceList = document.querySelector('#resource-list');
const searchInput = document.querySelector('#resource-search');
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
const updateButton = document.querySelector('#update-button');
const updateDialog = document.querySelector('#update-dialog');
const chooseUpdateButton = document.querySelector('#choose-update-button');
const releasePageButton = document.querySelector('#release-page-button');
const updateStatus = document.querySelector('#update-status');

// Detail Dialog
const mediaDetailDialog = document.querySelector('#media-detail-dialog');
const closeDetailDialogBtn = document.querySelector('#close-detail-dialog-btn');
const detailTitle = document.querySelector('#detail-title');
const detailSubtitle = document.querySelector('#detail-subtitle');
const detailOverview = document.querySelector('#detail-overview');
const detailEpisodesWrap = document.querySelector('#detail-episodes-wrap');
const detailSeasonSelect = document.querySelector('#detail-season-select');
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

// Massive Comprehensive Master Media Database (120+ Titles across Watch, Read, Listen, Play)
const EXPANDED_MASTER_CATALOG = [
  // ==================== WATCH (MOVIES, SHOWS, ANIME, LIVE TV) ====================
  {
    id: 'w-1',
    tmdbId: '693134',
    name: 'Dune: Part Two',
    category: 'Watch',
    type: 'movie',
    year: 2024,
    rating: '8.6',
    sections: ['Movie', 'Sci-Fi'],
    overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-2',
    tmdbId: '533535',
    name: 'Deadpool & Wolverine',
    category: 'Watch',
    type: 'movie',
    year: 2024,
    rating: '8.5',
    sections: ['Movie', 'Action'],
    overview: 'A listless Wade Wilson teams up with a reluctant Wolverine to face an existential threat.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-3',
    tmdbId: '872585',
    name: 'Oppenheimer',
    category: 'Watch',
    type: 'movie',
    year: 2023,
    rating: '8.9',
    sections: ['Movie', 'Biography'],
    overview: 'The story of J. Robert Oppenheimer role in the development of the atomic bomb.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-4',
    tmdbId: '569094',
    name: 'Spider-Man: Across the Spider-Verse',
    category: 'Watch',
    type: 'movie',
    year: 2023,
    rating: '9.0',
    sections: ['Movie', 'Animation'],
    overview: 'Miles Morales catapults across the Multiverse to encounter a team of Spider-People.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-5',
    tmdbId: '157336',
    name: 'Interstellar',
    category: 'Watch',
    type: 'movie',
    year: 2014,
    rating: '8.7',
    sections: ['Movie', 'Sci-Fi'],
    overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity survival.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-6',
    tmdbId: '155',
    name: 'The Dark Knight',
    category: 'Watch',
    type: 'movie',
    year: 2008,
    rating: '9.0',
    sections: ['Movie', 'Action'],
    overview: 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-7',
    tmdbId: '27205',
    name: 'Inception',
    category: 'Watch',
    type: 'movie',
    year: 2010,
    rating: '8.8',
    sections: ['Movie', 'Sci-Fi'],
    overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-8',
    tmdbId: '603',
    name: 'The Matrix',
    category: 'Watch',
    type: 'movie',
    year: 1999,
    rating: '8.7',
    sections: ['Movie', 'Action'],
    overview: 'A computer hacker learns about the true nature of reality and his role in the war against its controllers.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-9',
    tmdbId: '550',
    name: 'Fight Club',
    category: 'Watch',
    type: 'movie',
    year: 1999,
    rating: '8.8',
    sections: ['Movie', 'Drama'],
    overview: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-10',
    tmdbId: '680',
    name: 'Pulp Fiction',
    category: 'Watch',
    type: 'movie',
    year: 1994,
    rating: '8.9',
    sections: ['Movie', 'Crime'],
    overview: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-11',
    tmdbId: '1396',
    name: 'Breaking Bad',
    category: 'Watch',
    type: 'tv',
    year: 2008,
    rating: '9.5',
    seasonsCount: 5,
    episodesPerSeason: 13,
    sections: ['TV Show', 'Crime'],
    overview: 'A chemistry teacher diagnosed with lung cancer turns to manufacturing and selling methamphetamine.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-12',
    tmdbId: '66732',
    name: 'Stranger Things',
    category: 'Watch',
    type: 'tv',
    year: 2016,
    rating: '8.6',
    seasonsCount: 4,
    episodesPerSeason: 8,
    sections: ['TV Show', 'Sci-Fi'],
    overview: 'A small town uncovers a mystery involving secret experiments and terrifying supernatural forces.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-13',
    tmdbId: '100088',
    name: 'The Last of Us',
    category: 'Watch',
    type: 'tv',
    year: 2023,
    rating: '8.9',
    seasonsCount: 1,
    episodesPerSeason: 9,
    sections: ['TV Show', 'Drama'],
    overview: 'Joel and Ellie traverse a post-pandemic America facing ruthless killers and monsters.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-14',
    tmdbId: '1399',
    name: 'Game of Thrones',
    category: 'Watch',
    type: 'tv',
    year: 2011,
    rating: '8.4',
    seasonsCount: 8,
    episodesPerSeason: 10,
    sections: ['TV Show', 'Fantasy'],
    overview: 'Seven noble families fight for control of the mythical land of Westeros.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-15',
    tmdbId: '94997',
    name: 'House of the Dragon',
    category: 'Watch',
    type: 'tv',
    year: 2022,
    rating: '8.4',
    seasonsCount: 2,
    episodesPerSeason: 10,
    sections: ['TV Show', 'Fantasy'],
    overview: 'The Targaryen dynasty at the absolute apex of its power, with more than 15 dragons under their yoke.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-16',
    tmdbId: '126308',
    name: 'Shogun',
    category: 'Watch',
    type: 'tv',
    year: 2024,
    rating: '8.8',
    seasonsCount: 1,
    episodesPerSeason: 10,
    sections: ['TV Show', 'History'],
    overview: 'Lord Yoshii Toranaga discovers secrets that could tip the scales of power in feudal Japan.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-17',
    tmdbId: '93405',
    name: 'Squid Game',
    category: 'Watch',
    type: 'tv',
    year: 2021,
    rating: '8.0',
    seasonsCount: 2,
    episodesPerSeason: 9,
    sections: ['TV Show', 'Thriller'],
    overview: 'Hundreds of cash-strapped players accept a strange invitation to compete in children games.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-18',
    tmdbId: '76479',
    name: 'The Boys',
    category: 'Watch',
    type: 'tv',
    year: 2019,
    rating: '8.5',
    seasonsCount: 4,
    episodesPerSeason: 8,
    sections: ['TV Show', 'Action'],
    overview: 'A group of vigilantes set out to take down corrupt superheroes who abuse their superpowers.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-19',
    tmdbId: '85937',
    name: 'Demon Slayer: Kimetsu no Yaiba',
    category: 'Watch',
    type: 'anime',
    year: 2019,
    rating: '8.7',
    seasonsCount: 4,
    episodesPerSeason: 24,
    sections: ['Anime', 'Action'],
    overview: 'Tanjiro Kamado sets out to become a demon slayer to avenge his family and cure his sister.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-20',
    tmdbId: '1429',
    name: 'Attack on Titan',
    category: 'Watch',
    type: 'anime',
    year: 2013,
    rating: '9.1',
    seasonsCount: 4,
    episodesPerSeason: 25,
    sections: ['Anime', 'Dark Fantasy'],
    overview: 'Young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-21',
    tmdbId: '94605',
    name: 'Jujutsu Kaisen',
    category: 'Watch',
    type: 'anime',
    year: 2020,
    rating: '8.8',
    seasonsCount: 2,
    episodesPerSeason: 24,
    sections: ['Anime', 'Supernatural'],
    overview: 'Yuji Itadori enters Tokyo Prefectural Jujutsu High School after swallowing a cursed talisman.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-22',
    tmdbId: '209867',
    name: 'Solo Leveling',
    category: 'Watch',
    type: 'anime',
    year: 2024,
    rating: '8.9',
    seasonsCount: 1,
    episodesPerSeason: 12,
    sections: ['Anime', 'Action'],
    overview: 'Sung Jinwoo finds himself in a mysterious quest enabling him to level up.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-23',
    tmdbId: '37854',
    name: 'One Piece (Anime Series)',
    category: 'Watch',
    type: 'anime',
    year: 1999,
    rating: '8.9',
    seasonsCount: 21,
    episodesPerSeason: 50,
    sections: ['Anime', 'Adventure'],
    overview: 'Follows the adventures of Monkey D. Luffy and his pirate crew in order to find the greatest treasure.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-24',
    tmdbId: '46260',
    name: 'Naruto: Shippuden',
    category: 'Watch',
    type: 'anime',
    year: 2007,
    rating: '8.6',
    seasonsCount: 21,
    episodesPerSeason: 24,
    sections: ['Anime', 'Ninja'],
    overview: 'Naruto Uzumaki, is a loud, hyperactive, adolescent ninja who constantly searches for approval.',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'EMBED PROVIDER', badge: 'badge-embed' }]
  },
  {
    id: 'w-25',
    tmdbId: 'live-sports',
    name: 'World Sports HD Live Feed',
    category: 'Watch',
    type: 'live',
    year: 2026,
    rating: '9.2',
    sections: ['Live TV', 'Sports'],
    overview: 'Continuous live sports stream relay with low latency 60fps feed.',
    directStream: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    sources: [{ name: 'STREAM RELAY', badge: 'badge-relay' }]
  },
  {
    id: 'w-26',
    tmdbId: 'live-news',
    name: 'Global 24/7 News Network',
    category: 'Watch',
    type: 'live',
    year: 2026,
    rating: '8.8',
    sections: ['Live TV', 'News'],
    overview: 'International breaking news and live broadcast stream relay.',
    directStream: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    sources: [{ name: 'STREAM RELAY', badge: 'badge-relay' }]
  },

  // ==================== READ (MANGA, NOVELS, BOOKS, COMICS) ====================
  {
    id: 'r-1',
    name: 'Berserk (Deluxe Edition Manga Vol. 1-14)',
    category: 'Read',
    type: 'manga',
    year: 2023,
    rating: '9.8',
    sections: ['Manga', 'Dark Fantasy'],
    overview: 'The legendary dark fantasy manga following Guts the Black Swordsman seeking revenge on Griffith.',
    sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'r-2',
    name: 'One Piece Manga (Complete Volumes 1-108)',
    category: 'Read',
    type: 'manga',
    year: 2024,
    rating: '9.6',
    sections: ['Manga', 'Adventure'],
    overview: 'Monkey D. Luffy explores the Grand Line in search of the legendary One Piece treasure.',
    sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'r-3',
    name: 'Chainsaw Man (Complete Manga Part 1 & 2)',
    category: 'Read',
    type: 'manga',
    year: 2024,
    rating: '9.3',
    sections: ['Manga', 'Action'],
    overview: 'Denji becomes Chainsaw Man by making a contract with the chainsaw devil Pochita.',
    sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'r-4',
    name: 'Vagabond (Definitive Edition by Takehiko Inoue)',
    category: 'Read',
    type: 'manga',
    year: 2023,
    rating: '9.7',
    sections: ['Manga', 'Samurai'],
    overview: 'The fictionalized account of the life of legendary Japanese swordsman Miyamoto Musashi.',
    sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'r-5',
    name: 'Vinland Saga (Complete Manga Box Sets)',
    category: 'Read',
    type: 'manga',
    year: 2024,
    rating: '9.5',
    sections: ['Manga', 'Historical'],
    overview: 'Thorfinn pursues a journey with his father killer in order to take revenge and end that life.',
    sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'r-6',
    name: 'Dune Chronicles by Frank Herbert (Books 1-6 EPUB/PDF)',
    category: 'Read',
    type: 'book',
    year: 2023,
    rating: '9.4',
    sections: ['Book', 'Sci-Fi'],
    overview: 'The complete set of Frank Herbert sci-fi masterpiece exploring politics on Arrakis.',
    sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'r-7',
    name: 'The Hobbit & The Lord of the Rings (Illustrated Collection)',
    category: 'Read',
    type: 'book',
    year: 2023,
    rating: '9.8',
    sections: ['Book', 'High Fantasy'],
    overview: 'J.R.R. Tolkien legendary epic journey through Middle-earth.',
    sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'r-8',
    name: '1984 & Animal Farm by George Orwell (EPUB)',
    category: 'Read',
    type: 'book',
    year: 2022,
    rating: '9.5',
    sections: ['Book', 'Classics'],
    overview: 'Classic dystopian visions of totalitarian control and surveillance.',
    sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'r-9',
    name: 'Solo Leveling (Light Novel & Manhwa Complete Edition)',
    category: 'Read',
    type: 'novel',
    year: 2024,
    rating: '9.2',
    sections: ['Light Novel', 'Action'],
    overview: 'The complete light novel series chronicling the rise of Shadow Monarch Sung Jinwoo.',
    sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'r-10',
    name: 'Overlord Light Novel (Volumes 1-16 Complete)',
    category: 'Read',
    type: 'novel',
    year: 2023,
    rating: '9.1',
    sections: ['Light Novel', 'Fantasy'],
    overview: 'Momonga is transported into his favorite MMORPG world as the powerful skeletal sorcerer Ainz Ooal Gown.',
    sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'r-11',
    name: 'Batman: The Long Halloween & Year One (CBZ Comic)',
    category: 'Read',
    type: 'comic',
    year: 2022,
    rating: '9.3',
    sections: ['Comic', 'Mystery'],
    overview: 'Classic graphic novel collections remastered in high resolution digital format.',
    sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'r-12',
    name: 'Watchmen by Alan Moore (Ultimate Graphic Novel)',
    category: 'Read',
    type: 'comic',
    year: 2022,
    rating: '9.7',
    sections: ['Comic', 'Superhero'],
    overview: 'In an alternate 1985 America, costumed superheroes are part of daily society until a conspiracy strikes.',
    sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },

  // ==================== LISTEN (MUSIC, SOUNDTRACKS, AUDIOBOOKS, RADIO) ====================
  {
    id: 'l-1',
    name: 'Hans Zimmer: Live in Prague (Lossless FLAC 24-Bit)',
    category: 'Listen',
    type: 'music',
    year: 2024,
    rating: '9.7',
    sections: ['Music', 'Soundtrack'],
    overview: 'High-resolution recordings of Interstellar, Inception, Gladiator, and The Dark Knight.',
    audioUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'FLAC MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'l-2',
    name: 'Interstellar: Original Motion Picture Soundtrack (Expanded)',
    category: 'Listen',
    type: 'music',
    year: 2023,
    rating: '9.8',
    sections: ['Music', 'Score'],
    overview: 'The complete organ and orchestral masterpiece by Hans Zimmer.',
    audioUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'FLAC MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'l-3',
    name: 'Lo-Fi Chill & Beats 24/7 Live Stream Relay',
    category: 'Listen',
    type: 'radio',
    year: 2026,
    rating: '9.5',
    sections: ['Music', 'Lo-Fi'],
    overview: 'Continuous relax and study lo-fi hip hop stream relay with lossless audio quality.',
    audioUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    sources: [{ name: 'STREAM RELAY', badge: 'badge-relay' }]
  },
  {
    id: 'l-4',
    name: 'Anime & Gaming Symphony Soundtracks Collection',
    category: 'Listen',
    type: 'music',
    year: 2024,
    rating: '9.4',
    sections: ['Music', 'Orchestral'],
    overview: 'Orchestral arrangements of Studio Ghibli, Attack on Titan, Final Fantasy, and Elden Ring.',
    audioUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'l-5',
    name: 'Daft Punk: Complete Discography (Remastered FLAC)',
    category: 'Listen',
    type: 'music',
    year: 2024,
    rating: '9.9',
    sections: ['Music', 'Electronic'],
    overview: 'Discovery, Homework, Random Access Memories, and Alive 2007 in ultra fidelity.',
    audioUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'FLAC MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'l-6',
    name: 'Queen: Greatest Hits I, II & III (Studio Masters)',
    category: 'Listen',
    type: 'music',
    year: 2023,
    rating: '9.8',
    sections: ['Music', 'Rock'],
    overview: 'Bohemian Rhapsody, Don Stop Me Now, Under Pressure in high-resolution audio.',
    audioUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    sources: [{ name: 'STREAM HOST', badge: 'badge-stream' }, { name: 'FLAC MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'l-7',
    name: 'Atomic Habits Audiobook by James Clear',
    category: 'Listen',
    type: 'audiobook',
    year: 2023,
    rating: '9.3',
    sections: ['Audiobook', 'Self-Dev'],
    overview: 'Unabridged narrator edition with high-bitrate voice mastering.',
    sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'l-8',
    name: 'Dune Audiobook Series by Frank Herbert (Full Cast)',
    category: 'Listen',
    type: 'audiobook',
    year: 2024,
    rating: '9.6',
    sections: ['Audiobook', 'Sci-Fi'],
    overview: 'Full cast dramatic narration of the sci-fi epic.',
    sources: [{ name: 'FILE HOST', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'l-9',
    name: '99% Invisible',
    category: 'Listen',
    type: 'podcast',
    year: 2026,
    rating: '9.4',
    sections: ['Podcast', 'Design'],
    overview: 'Stories about the unnoticed architecture and design that shape everyday life.'
  },
  {
    id: 'l-10',
    name: 'Science Vs',
    category: 'Listen',
    type: 'podcast',
    year: 2026,
    rating: '9.2',
    sections: ['Podcast', 'Science'],
    overview: 'A curious, evidence-led look at the ideas people argue about most.'
  },

  // ==================== PLAY ====================
  {
    id: 'p-1',
    name: 'Elden Ring: Shadow of the Erdtree',
    category: 'Play',
    type: 'game',
    year: 2024,
    rating: '9.8',
    sections: ['PC Game', 'Action RPG'],
    overview: 'Guided by Empyrean Miquella, players explore the Land of Shadow.',
    sources: [{ name: 'AUTO DOWNLOAD', badge: 'badge-file' }, { name: 'DIRECT MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'p-2',
    name: 'Cyberpunk 2077: Phantom Liberty',
    category: 'Play',
    type: 'game',
    year: 2024,
    rating: '9.4',
    sections: ['PC Game', 'Open World'],
    overview: 'Return to Night City as V in a high-stakes spy thriller adventure.',
    sources: [{ name: 'AUTO DOWNLOAD', badge: 'badge-file' }, { name: 'DIRECT MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'p-3',
    name: 'Grand Theft Auto V',
    category: 'Play',
    type: 'game',
    year: 2024,
    rating: '9.5',
    sections: ['PC Game', 'Action'],
    overview: 'Experience the blockbuster in stunning 4K with ray tracing and ultra settings.',
    sources: [{ name: 'AUTO DOWNLOAD', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'p-4',
    name: 'Red Dead Redemption 2',
    category: 'Play',
    type: 'game',
    year: 2024,
    rating: '9.9',
    sections: ['PC Game', 'Open World'],
    overview: 'Arthur Morgan and the Van der Linde gang are outlaws on the run across the rugged heartland of America.',
    sources: [{ name: 'AUTO DOWNLOAD', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'p-5',
    name: 'Minecraft',
    category: 'Play',
    type: 'game',
    year: 2024,
    rating: '9.7',
    sections: ['PC Game', 'Sandbox'],
    overview: 'Explore infinite worlds and build everything from simple homes to grand castles.',
    sources: [{ name: 'AUTO DOWNLOAD', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'p-6',
    name: 'The Legend of Zelda: Tears of the Kingdom',
    category: 'Play',
    type: 'retro',
    year: 2023,
    rating: '9.9',
    sections: ['Console Game', 'Adventure'],
    overview: 'Explore the vast landscapes of Hyrule and the mysterious islands above it.',
    sources: [{ name: 'AUTO DOWNLOAD', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'p-7',
    name: 'Super Mario Odyssey',
    category: 'Play',
    type: 'retro',
    year: 2024,
    rating: '9.7',
    sections: ['Console Game', 'Platformer'],
    overview: 'Join Mario on massive, globe-trotting 3D adventures.',
    sources: [{ name: 'AUTO DOWNLOAD', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'p-8',
    name: 'Pokémon Emerald',
    category: 'Play',
    type: 'retro',
    year: 2023,
    rating: '9.8',
    sections: ['Handheld Game', 'RPG'],
    overview: 'A classic adventure through the Hoenn region with a team of Pokémon companions.',
    sources: [{ name: 'AUTO DOWNLOAD', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'p-9',
    name: 'Retro Classics',
    category: 'Play',
    type: 'retro',
    year: 2024,
    rating: '9.6',
    sections: ['Arcade', 'Retro Games'],
    overview: 'A place in your library for the classic games you already have installed.',
    sources: [{ name: 'AUTO DOWNLOAD', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'p-10',
    name: 'Dark Souls III',
    category: 'Play',
    type: 'game',
    year: 2023,
    rating: '9.6',
    sections: ['PC Game', 'Action RPG'],
    overview: 'As fires fade and the world falls into ruin, journey into a universe filled with more colossal enemies and environments.',
    sources: [{ name: 'AUTO DOWNLOAD', badge: 'badge-file' }, { name: 'MIRROR', badge: 'badge-mirror' }]
  },
  {
    id: 'p-11',
    name: 'Civilization VI',
    category: 'Play',
    type: 'game',
    year: 2016,
    rating: '8.8',
    sections: ['PC Game', 'Strategy'],
    overview: 'Build an empire, guide a civilization, and compete across centuries of history.'
  },
  {
    id: 'p-12',
    name: 'Into the Breach',
    category: 'Play',
    type: 'game',
    year: 2018,
    rating: '9.1',
    sections: ['PC Game', 'Strategy'],
    overview: 'A tightly designed turn-based strategy game about protecting cities from an alien threat.'
  }
];

// Upstream Stream Providers
const STREAM_PROVIDERS = {
  vidlink: {
    name: 'VidLink Pro [Fastest 1080p]',
    badge: 'badge-stream',
    resolve: (tmdbId, isTv, season, episode) => {
      if (isTv) return 'https://vidlink.pro/tv/' + tmdbId + '/' + season + '/' + episode;
      return 'https://vidlink.pro/movie/' + tmdbId;
    }
  },
  vidsrc: {
    name: 'VidSrc Ultra HD 4K',
    badge: 'badge-embed',
    resolve: (tmdbId, isTv, season, episode) => {
      if (isTv) return 'https://vidsrc.to/embed/tv/' + tmdbId + '/' + season + '/' + episode;
      return 'https://vidsrc.to/embed/movie/' + tmdbId;
    }
  },
  autoembed: {
    name: 'AutoEmbed Direct 1080p',
    badge: 'badge-stream',
    resolve: (tmdbId, isTv, season, episode) => {
      if (isTv) return 'https://autoembed.to/tv/tmdb/' + tmdbId + '/' + season + '/' + episode;
      return 'https://autoembed.to/movie/tmdb/' + tmdbId;
    }
  },
  superembed: {
    name: 'SuperEmbed Multi-Source',
    badge: 'badge-embed',
    resolve: (tmdbId, isTv, season, episode) => {
      if (isTv) return 'https://multiembed.mov/?video_id=' + tmdbId + '&tmdb=1&s=' + season + '&e=' + episode;
      return 'https://multiembed.mov/?video_id=' + tmdbId + '&tmdb=1';
    }
  }
};

let activeCategory = 'Home';
let activeSubcategory = 'All';
const categories = ['Home', 'Watch', 'Listen', 'Read', 'Play'];
let query = '';
let discoveryMediaList = [...EXPANDED_MASTER_CATALOG];
let currentMediaList = [...discoveryMediaList];
let activeMedia = null;
let heroMedia = null;
let activeSeason = 1;
let activeEpisode = 1;
let activeProviderKey = 'vidlink';
let streamProviderAttempts = 0;
let streamLoadTimeout = null;
let searchTimeout = null;
let searchController = null;
let searchSequence = 0;
let searchState = { term: '', loading: false, total: null, page: 1, canLoadMore: false };
const catalogTotals = {
  Watch: { All: null, Movies: null, 'TV Shows': null, Anime: null, Sports: null, 'Live TV': 'Live' },
  Listen: { All: null, Music: null, Soundtracks: null, Radio: null, Podcasts: 'Full', Audiobooks: null },
  Read: { All: null, Books: null, Comics: null, Manga: null, 'Light Novels': null },
  Play: { All: 'Library', 'PC Games': 'Library', Action: 'Library', RPG: 'Library', Adventure: 'Library', Strategy: 'Library' }
};
const searchCache = new Map();
const SEARCH_DEBOUNCE_MS = 160;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_REQUEST_TIMEOUT_MS = 4500;
const CATALOG_REQUEST_TIMEOUT_MS = 12000;
const CATALOG_TOTAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CATALOG_TOTAL_CACHE_KEY = 'harbor:catalog-totals:v2';
const USER_STATE_KEY = 'harbor:user-state:v1';
const USER_HISTORY_LIMIT = 80;

const createDefaultUserState = () => ({
  favorites: [],
  history: [],
  progress: {},
  settings: {
    autoplayNext: true,
    rememberProgress: true,
    reduceMotion: false
  }
});

const loadUserState = () => {
  const fallback = createDefaultUserState();
  try {
    const stored = JSON.parse(localStorage.getItem(USER_STATE_KEY) || 'null');
    if (!stored || typeof stored !== 'object') return fallback;
    return {
      favorites: Array.isArray(stored.favorites) ? stored.favorites : [],
      history: Array.isArray(stored.history) ? stored.history : [],
      progress: stored.progress && typeof stored.progress === 'object' ? stored.progress : {},
      settings: {
        ...fallback.settings,
        ...(stored.settings && typeof stored.settings === 'object' ? stored.settings : {})
      }
    };
  } catch {
    return fallback;
  }
};

let userState = loadUserState();
let activeMyHarborTab = 'list';
let streamPlaybackStartedAt = 0;
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
  seasonsCount: item.seasonsCount,
  episodesPerSeason: item.episodesPerSeason
});

const persistUserState = () => {
  try {
    localStorage.setItem(USER_STATE_KEY, JSON.stringify(userState));
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
    title: 'Press play on your day.',
    description: 'Music, soundtracks, radio, podcasts, and audiobooks for every mood.',
    action: 'Play something',
    subcategories: ['All', 'Music', 'Soundtracks', 'Radio', 'Podcasts', 'Audiobooks']
  },
  Read: {
    kicker: 'Read',
    title: 'Get lost in a good story.',
    description: 'Books, comics, manga, and light novels worth making time for.',
    action: 'Open a book',
    subcategories: ['All', 'Books', 'Comics', 'Manga', 'Light Novels']
  },
  Play: {
    kicker: 'Play',
    title: 'Pick up the controller.',
    description: 'Browse by mood, then launch games you already have from your personal library.',
    action: 'Choose a game',
    subcategories: ['All', 'PC Games', 'Action', 'RPG', 'Adventure', 'Strategy']
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

const getSectionItems = (category, subcategory = 'All') => currentMediaList.filter((item) => (
  item.category === category && itemMatchesSubcategory(item, subcategory)
));

const normalizeSearchText = (value = '') => String(value)
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const searchScore = (item, term) => {
  const needle = normalizeSearchText(term);
  if (!needle) return 0;

  const name = normalizeSearchText(item.name);
  const sections = normalizeSearchText((item.sections || []).join(' '));
  const metadata = normalizeSearchText([item.category, item.type, sections].join(' '));
  const overview = normalizeSearchText(item.overview);
  const tokens = needle.split(' ').filter(Boolean);
  let score = 0;

  if (name === needle) score += 1200;
  else if (name.startsWith(needle)) {
    score += 900;
    score += Math.max(0, 120 - ((name.length - needle.length) * 3));
  }
  else if (name.includes(' ' + needle)) score += 760;
  else if (name.includes(needle)) score += 620;

  const nameTokenMatches = tokens.filter((token) => name.includes(token)).length;
  if (nameTokenMatches === tokens.length) score += 360;
  else score += nameTokenMatches * 90;

  if (metadata === needle || sections === needle) score += 280;
  else if (metadata.includes(needle)) score += 180;

  const metadataTokenMatches = tokens.filter((token) => metadata.includes(token)).length;
  score += metadataTokenMatches * 45;

  if (overview.includes(needle)) score += 35;
  if (score === 0) return 0;
  score += Math.min(10, Number(item.rating) || 0);
  return score;
};

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
  subcategory: activeCategory === 'Home' ? 'All' : activeSubcategory
});

const getSearchScopeName = (scope = getSearchScope()) => (
  scope.category === 'Home'
    ? 'Harbor'
    : (scope.subcategory === 'All' ? scope.category : scope.subcategory)
);

const itemMatchesSearchScope = (item, scope = getSearchScope()) => {
  if (scope.category === 'Home') return true;
  if (item.category !== scope.category) return false;
  return scope.subcategory === 'All' || itemMatchesSubcategory(item, scope.subcategory);
};

const getSearchCacheKey = (term, scope = getSearchScope()) => [
  normalizeSearchText(term),
  scope.category,
  scope.subcategory
].join('|');

const isCurrentSearchRequest = (term, sequence, scope) => (
  sequence === searchSequence && getSearchCacheKey(query) === getSearchCacheKey(term, scope)
);

const localSearchResults = (term, scope = getSearchScope()) => rankSearchResults(
  discoveryMediaList.filter((item) => itemMatchesSearchScope(item, scope)),
  term
);

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

  return {
    id: 'tmdb-' + item.id,
    tmdbId: String(item.id),
    name: title,
    category: 'Watch',
    type: isAnime ? 'anime' : (isTv ? 'tv' : 'movie'),
    year: year,
    rating: rating,
    sections: [primarySection, isTv ? 'Series' : 'Feature', ...(isSports ? ['Sports'] : [])],
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

// Fetch Live Trending
const fetchTrendingMedia = async () => {
  try {
    const res = await fetch(TMDB_BASE + '/trending/all/day?api_key=' + TMDB_API_KEY);
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    const tmdbItems = (data.results || []).map(formatTmdbItem);
    discoveryMediaList = [...tmdbItems, ...EXPANDED_MASTER_CATALOG];
  } catch {
    discoveryMediaList = [...EXPANDED_MASTER_CATALOG];
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

  setNumber('Listen', 'Music', 'music');
  setNumber('Listen', 'Soundtracks', 'soundtracks');
  setNumber('Listen', 'Radio', 'radio');
  setNumber('Listen', 'Audiobooks', 'audiobooks');
  const listenKnownTotal = ['Music', 'Radio', 'Audiobooks']
    .map((subcategory) => catalogTotals.Listen[subcategory])
    .filter((value) => typeof value === 'number')
    .reduce((sum, value) => sum + value, 0);
  if (listenKnownTotal > 0) catalogTotals.Listen.All = formatCatalogTotal(listenKnownTotal) + '+';

  setNumber('Read', 'Books', 'books');
  setNumber('Read', 'Comics', 'comics');
  setNumber('Read', 'Manga', 'manga');
  setNumber('Read', 'Light Novels', 'lightNovels');
  const readKnownTotal = ['Books', 'Comics', 'Manga', 'Light Novels']
    .map((subcategory) => catalogTotals.Read[subcategory])
    .filter((value) => typeof value === 'number')
    .reduce((sum, value) => sum + value, 0);
  if (readKnownTotal > 0) catalogTotals.Read.All = formatCatalogTotal(readKnownTotal) + '+';

  renderCategories();
};

const loadCachedCatalogTotals = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(CATALOG_TOTAL_CACHE_KEY) || 'null');
    if (!cached || Date.now() - cached.createdAt >= CATALOG_TOTAL_CACHE_TTL_MS) return;
    Object.entries(cached.totals || {}).forEach(([section, values]) => {
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

const fetchMusicCatalogTotals = async () => {
  const music = await fetchSearchJson(
    'https://musicbrainz.org/ws/2/recording/?query=*%3A*&limit=1&fmt=json',
    undefined,
    CATALOG_REQUEST_TIMEOUT_MS
  );
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const soundtracks = await fetchSearchJson(
    'https://musicbrainz.org/ws/2/recording/?query=tag%3Asoundtrack&limit=1&fmt=json',
    undefined,
    CATALOG_REQUEST_TIMEOUT_MS
  );
  return [
    { key: 'music', total: Number(music.count) || 0 },
    { key: 'soundtracks', total: Number(soundtracks.count) || 0 }
  ];
};

const fetchCatalogTotals = async () => {
  const requests = [
    catalogTotalRequest('movies', TMDB_BASE + '/discover/movie?api_key=' + TMDB_API_KEY + '&include_adult=false&page=1', (data) => data.total_results),
    catalogTotalRequest('shows', TMDB_BASE + '/discover/tv?api_key=' + TMDB_API_KEY + '&include_adult=false&page=1', (data) => data.total_results),
    Promise.all([
      fetchSearchJson(TMDB_BASE + '/discover/movie?api_key=' + TMDB_API_KEY + '&include_adult=false&with_genres=16&with_original_language=ja&page=1', undefined, CATALOG_REQUEST_TIMEOUT_MS),
      fetchSearchJson(TMDB_BASE + '/discover/tv?api_key=' + TMDB_API_KEY + '&include_adult=false&with_genres=16&with_original_language=ja&page=1', undefined, CATALOG_REQUEST_TIMEOUT_MS)
    ]).then(([movies, shows]) => [{ key: 'anime', total: (Number(movies.total_results) || 0) + (Number(shows.total_results) || 0) }]),
    fetchSportsCatalogTotal(),
    fetchMusicCatalogTotals(),
    catalogTotalRequest('radio', 'https://de1.api.radio-browser.info/json/stats', (data) => data.stations),
    catalogTotalRequest('books', 'https://gutendex.com/books', (data) => data.count),
    catalogTotalRequest('comics', 'https://openlibrary.org/search.json?q=subject%3Acomics&limit=0&fields=key', (data) => data.numFound ?? data.num_found),
    catalogTotalRequest('manga', 'https://openlibrary.org/search.json?q=subject%3Amanga&limit=0&fields=key', (data) => data.numFound ?? data.num_found),
    catalogTotalRequest('lightNovels', 'https://openlibrary.org/search.json?q=%22light%20novel%22&limit=0&fields=key', (data) => data.numFound ?? data.num_found),
    catalogTotalRequest('audiobooks', 'https://openlibrary.org/search.json?q=subject%3Aaudiobooks&limit=0&fields=key', (data) => data.numFound ?? data.num_found)
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
const applySearchBatch = (term, sequence, scope, localResults, batches, totals, hasMore, loading, page) => {
  if (!isCurrentSearchRequest(term, sequence, scope)) return;

  const combined = [localResults, ...batches.values()].flat();
  currentMediaList = rankSearchResults(
    combined.filter((item) => itemMatchesSearchScope(item, scope)),
    term
  );

  const localOnlyCount = localResults.filter((item) => (
    item.category === 'Play' || ['live', 'radio', 'podcast', 'audiobook'].includes(item.type)
  )).length;
  const providerTotal = [...totals.values()].reduce((sum, value) => sum + value, 0);
  searchState = {
    term: normalizeSearchText(term),
    loading,
    total: loading ? searchState.total : Math.max(currentMediaList.length, providerTotal + localOnlyCount, searchState.total || 0),
    page,
    canLoadMore: [...hasMore.values()].some(Boolean)
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
    searchState = { term: normalizedTerm, loading: false, total: cached.total, page: cached.page || 1, canLoadMore: Boolean(cached.canLoadMore) };
    renderResources();
    return;
  }

  searchController = new AbortController();
  const { signal } = searchController;
  const localResults = append ? [...currentMediaList] : localSearchResults(term, scope);
  const batches = new Map();
  const totals = new Map();
  const hasMore = new Map();
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
      applySearchBatch(term, sequence, scope, localResults, batches, totals, hasMore, true, page);
    } catch (error) {
      if (!signal.aborted && error?.name !== 'AbortError') {
        console.warn(provider.key + ' search is temporarily unavailable.');
      }
    }
  });

  await Promise.allSettled(tasks);
  if (signal.aborted || !isCurrentSearchRequest(term, sequence, scope)) return;

  applySearchBatch(term, sequence, scope, localResults, batches, totals, hasMore, false, page);
  searchCache.set(cacheKey, {
    createdAt: Date.now(),
    items: [...currentMediaList],
    total: searchState.total,
    page: searchState.page,
    canLoadMore: searchState.canLoadMore
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

  if (!normalizedTerm) {
    searchState = { term: '', loading: false, total: null, page: 1, canLoadMore: false };
    currentMediaList = [...discoveryMediaList];
    renderResources();
    return;
  }

  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < SEARCH_CACHE_TTL_MS) {
    currentMediaList = [...cached.items];
    searchState = { term: normalizedTerm, loading: false, total: cached.total, page: cached.page || 1, canLoadMore: Boolean(cached.canLoadMore) };
    renderResources();
    return;
  }

  currentMediaList = localSearchResults(term, scope);
  searchState = {
    term: normalizedTerm,
    loading: normalizedTerm.length >= 2,
    total: normalizedTerm.length < 2 ? currentMediaList.length : null,
    page: 1,
    canLoadMore: false
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
  return getSectionItems(activeCategory, activeSubcategory);
};

const categoryCount = (subcategory) => {
  const catalogTotal = catalogTotals[activeCategory]?.[subcategory];
  if (catalogTotal !== undefined) {
    if (catalogTotal === null) return '…';
    if (typeof catalogTotal === 'string') return catalogTotal;
    return formatCatalogTotal(catalogTotal);
  }
  if (activeCategory === 'Home') return currentMediaList.length;
  return getSectionItems(activeCategory, subcategory).length;
};

const categoryAvailabilityLabel = (visibleCount) => {
  const catalogTotal = catalogTotals[activeCategory]?.[activeSubcategory];
  const featuredLabel = visibleCount + ' featured ' + (visibleCount === 1 ? 'pick' : 'picks');

  if (typeof catalogTotal === 'number') {
    return 'Showing ' + featuredLabel + ' from ' + formatCatalogTotal(catalogTotal) + ' searchable items';
  }
  if (catalogTotal === 'Full') return 'Showing ' + featuredLabel + ' from the full catalog';
  if (catalogTotal === 'Live') {
    return 'Showing ' + visibleCount + ' featured live ' + (visibleCount === 1 ? 'feed' : 'feeds');
  }
  if (catalogTotal === 'Library') return 'Showing ' + featuredLabel + ' from your library';
  return 'Showing ' + featuredLabel;
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
    button.append(
      createElement('span', 'category-name', category),
      createElement('span', 'category-count', String(categoryCount(category)))
    );
    button.addEventListener('click', () => {
      activeSubcategory = category;
      if (normalizeSearchText(query)) beginSearch(query);
      else {
        renderCategories();
        renderResources();
      }
    });
    categoryList.append(button);
  });
};

const setActiveSection = (category) => {
  if (!categories.includes(category)) return;
  clearTimeout(searchTimeout);
  searchController?.abort();
  searchController = null;
  searchSequence++;
  activeCategory = category;
  activeSubcategory = 'All';
  query = '';
  searchState = { term: '', loading: false, total: null, page: 1, canLoadMore: false };
  searchInput.value = '';
  currentMediaList = [...discoveryMediaList];
  renderResources();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Fetch TV Show details (seasons) from TMDB
const fetchTvShowDetails = async (tmdbId) => {
  try {
    const res = await fetch(TMDB_BASE + '/tv/' + tmdbId + '?api_key=' + TMDB_API_KEY);
    if (!res.ok) return 1;
    const data = await res.json();
    return data.number_of_seasons || 1;
  } catch {
    return 1;
  }
};

const syncSaveButton = (button, item) => {
  if (!button) return;
  const saved = Boolean(item && isFavorite(item));
  button.textContent = saved ? '✓ In My List' : '＋ My List';
  button.setAttribute('aria-pressed', String(saved));
};

const saveActiveStreamProgress = () => {
  if (!activeMedia) return;
  const existing = userState.progress[mediaKey(activeMedia)]?.progress || 0;
  let progress = existing;
  if (!streamDirectVideo.hidden && Number.isFinite(streamDirectVideo.duration) && streamDirectVideo.duration > 0) {
    progress = streamDirectVideo.currentTime / streamDirectVideo.duration;
  } else if (streamPlaybackStartedAt) {
    const estimatedFeatureLength = 45 * 60 * 1000;
    progress = Math.max(existing, Math.min(0.9, (Date.now() - streamPlaybackStartedAt) / estimatedFeatureLength));
  }
  recordProgress(activeMedia, Math.max(0.01, progress), {
    season: activeSeason,
    episode: activeEpisode
  });
};

const showStreamStatus = (title, detail, canRetry = false) => {
  streamStatusTitle.textContent = title;
  streamStatusDetail.textContent = detail;
  streamRetryButton.hidden = !canRetry;
  streamStatusOverlay.classList.toggle('failed', canRetry);
  streamStatusOverlay.hidden = false;
};

const markStreamReady = () => {
  clearTimeout(streamLoadTimeout);
  streamLoadTimeout = null;
  streamStatusOverlay.classList.remove('failed');
  streamStatusOverlay.hidden = true;
};

const tryNextStreamRoute = () => {
  clearTimeout(streamLoadTimeout);
  streamLoadTimeout = null;
  if (!activeMedia || !inAppStreamDialog.open || activeMedia.directStream) return;
  const providerKeys = Object.keys(STREAM_PROVIDERS);
  streamProviderAttempts += 1;
  if (streamProviderAttempts >= providerKeys.length) {
    showStreamStatus('Playback is taking a break', 'No route answered. Try again in a moment.', true);
    return;
  }
  const currentIndex = Math.max(0, providerKeys.indexOf(activeProviderKey));
  activeProviderKey = providerKeys[(currentIndex + 1) % providerKeys.length];
  streamServerSelect.value = activeProviderKey;
  showStreamStatus('Trying another route…', 'Harbor is reconnecting without leaving the player.');
  setTimeout(loadStreamSource, 180);
};

// Open In-App Streaming Player
const startStreamPlayback = (item, season = 1, episode = 1) => {
  activeMedia = item;
  activeSeason = season;
  activeEpisode = episode;
  streamPlaybackStartedAt = Date.now();
  streamProviderAttempts = 0;
  recordProgress(item, Math.max(0.01, userState.progress[mediaKey(item)]?.progress || 0), { season, episode });

  const isSeries = item.type === 'tv' || item.type === 'anime';

  streamDialogTitle.textContent = item.name;
  streamEpisodeTag.hidden = !isSeries;
  streamEpisodeTag.textContent = 'S' + season + ':E' + episode;

  streamPrevBtn.hidden = !isSeries;
  streamNextBtn.hidden = !isSeries;

  streamServerSelect.value = activeProviderKey;
  loadStreamSource();

  if (mediaDetailDialog.open) mediaDetailDialog.close();
  inAppStreamDialog.showModal();
};

const loadStreamSource = () => {
  if (!activeMedia) return;
  clearTimeout(streamLoadTimeout);
  streamLoadTimeout = null;
  showStreamStatus('Starting playback…', 'Finding the best available route.');

  const isSeries = activeMedia.type === 'tv' || activeMedia.type === 'anime';

  if (activeMedia.directStream) {
    streamInAppWebview.hidden = true;
    streamDirectVideo.hidden = false;
    streamDirectVideo.src = activeMedia.directStream;
    streamDirectVideo.play().catch(() => {});
    streamLoadTimeout = setTimeout(() => {
      showStreamStatus('This feed is unavailable', 'The live source did not respond. Try again shortly.', true);
    }, 15000);
    return;
  }

  streamDirectVideo.pause();
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

// Media Detail Dialog (Episodes & Sources)
const openDetailDialog = async (item) => {
  activeMedia = item;
  activeSeason = 1;
  activeEpisode = 1;

  detailTitle.textContent = item.name;
  detailSubtitle.textContent = item.year + ' · ★ ' + item.rating + ' · ' + (item.sections || []).join(', ');
  detailOverview.textContent = item.overview;
  syncSaveButton(detailSaveBtn, item);

  const isSeries = item.type === 'tv' || item.type === 'anime';
  detailEpisodesWrap.hidden = !isSeries;

  if (isSeries) {
    detailSeasonSelect.innerHTML = '<option>Loading seasons…</option>';
    const seasonsCount = await fetchTvShowDetails(item.tmdbId);
    detailSeasonSelect.innerHTML = '';
    for (let s = 1; s <= seasonsCount; s++) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = 'Season ' + s;
      detailSeasonSelect.appendChild(opt);
    }
    detailSeasonSelect.value = activeSeason;
    renderEpisodeChips(24);

    detailSeasonSelect.onchange = (e) => {
      activeSeason = parseInt(e.target.value, 10);
      activeEpisode = 1;
      renderEpisodeChips(24);
    };
  }

  detailPlayBtn.onclick = () => {
    mediaDetailDialog.close();
    startStreamPlayback(activeMedia, activeSeason, activeEpisode);
  };

  detailSaveBtn.onclick = () => {
    const saved = toggleFavorite(item);
    syncSaveButton(detailSaveBtn, item);
    syncSaveButton(heroLibraryButton, heroMedia);
    renderResources();
    showStatusToast(saved ? 'Added to My List' : 'Removed from My List', item.name);
  };

  mediaDetailDialog.showModal();
};

const renderEpisodeChips = (count) => {
  detailEpisodesList.innerHTML = '';
  for (let ep = 1; ep <= count; ep++) {
    const btn = document.createElement('button');
    btn.className = 'ep-btn ' + (ep === activeEpisode ? 'active' : '');
    btn.textContent = 'Episode ' + ep;
    btn.onclick = () => {
      activeEpisode = ep;
      renderEpisodeChips(count);
    };
    detailEpisodesList.appendChild(btn);
  }
};

const handleMediaClick = (item) => {
  activeMedia = item;
  recordHistory(item);

  if (item._resume && item.category === 'Watch') {
    startStreamPlayback(item, item._resume.season || 1, item._resume.episode || 1);
    return;
  }

  if (item.category === 'Watch') {
    if (item.type === 'tv' || item.type === 'anime') {
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
  const openButton = createElement('button', 'media-card-open');
  openButton.type = 'button';
  openButton.setAttribute('aria-label', 'Open ' + item.name);
  openButton.addEventListener('click', () => handleMediaClick(item));

  const art = createElement('span', 'media-art');
  const fallback = createElement('span', 'art-fallback');
  fallback.append(
    createElement('span', '', (item.sections || [item.category])[0]),
    createElement('strong', '', item.name)
  );
  art.append(fallback);

  if (item.artworkUrl) {
    const image = document.createElement('img');
    image.src = item.artworkUrl;
    image.alt = '';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => image.remove(), { once: true });
    art.append(image);
  }

  if (item.type === 'live') art.append(createElement('span', 'media-badge', 'Live'));
  art.append(createElement('span', 'card-play', item.category === 'Read' ? '↗' : '▶'));

  const copy = createElement('span', 'media-card-copy');
  copy.append(
    createElement('strong', 'media-card-title', item.name),
    createElement('span', 'media-card-meta', item.year + ' · ★ ' + item.rating + ' · ' + (item.sections || []).slice(0, 2).join(' · '))
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

  card.append(openButton, saveButton);
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
  settings.append(clearActivity);
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
    button.setAttribute('aria-pressed', String(active));
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
  const searchSummary = searchState.loading
    ? (visible.length
      ? visible.length + ' promising ' + (visible.length === 1 ? 'match' : 'matches') + ' so far. Searching ' + searchLoadingTarget + '…'
      : 'Searching ' + searchLoadingTarget + '…')
    : (formattedSearchTotal && searchState.total > visible.length
      ? 'Showing the best ' + visible.length + ' from ' + formattedSearchTotal + ' matches ' + searchLocation + '.'
      : visible.length + ' ' + (visible.length === 1 ? 'match' : 'matches') + ' ' + searchLocation + '.');

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
      buildRail('Listen now', getSectionItems('Listen'), { description: 'Music, radio, and more' }),
      buildRail('Worth reading', getSectionItems('Read'), { description: 'Books, comics, manga, and light novels' }),
      buildRail('Play next', getSectionItems('Play'), { description: 'Games from your personal library' })
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
    headingCopy.append(
      createElement('h2', '', activeSubcategory),
      createElement('p', '', categoryAvailabilityLabel(visible.length))
    );
    heading.append(headingCopy);
    const grid = createElement('div', 'category-grid');
    grid.append(...visible.map(buildCard));
    resultsSection.append(heading, grid);
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
  heroSection.style.setProperty('--hero-artwork', heroMedia?.artworkUrl ? 'url("' + heroMedia.artworkUrl.replace(/"/g, '%22') + '")' : 'none');
  if (heroMedia) {
    heroFeatureTitle.textContent = heroMedia.name;
    heroFeatureMeta.textContent = heroMedia.year + ' · ' + (heroMedia.sections || []).slice(0, 2).join(' · ');
    heroFeature.setAttribute('aria-label', 'Open featured title ' + heroMedia.name);
  }
  syncSaveButton(heroLibraryButton, heroMedia);
  heroLibraryButton.hidden = !heroMedia;
  heroPrimaryButton.lastChild.textContent = ' ' + config.action;

  emptyState.hidden = visible.length > 0 || searchState.loading;
  resourceList.hidden = visible.length === 0;
  clearButton.hidden = !query;
  catalogCount.textContent = query.trim()
    ? (searchState.loading
      ? 'Searching ' + searchLoadingTarget + '…'
      : (formattedSearchTotal || visible.length) + ' ' + searchScopeName + ' ' + ((searchState.total || visible.length) === 1 ? 'match' : 'matches'))
    : 'Millions of movies, shows, songs, books, and games to explore';
  renderCategories();
};

const resetFilters = () => {
  clearTimeout(searchTimeout);
  searchController?.abort();
  searchController = null;
  searchSequence++;
  activeCategory = 'Home';
  activeSubcategory = 'All';
  query = '';
  searchState = { term: '', loading: false, total: null, page: 1, canLoadMore: false };
  searchInput.value = '';
  currentMediaList = [...discoveryMediaList];
  renderResources();
};

// Search locally on every keystroke, then merge remote results after a short debounce.
searchInput.addEventListener('input', (event) => {
  beginSearch(event.target.value);
});

clearButton.addEventListener('click', resetFilters);
showAllButton.addEventListener('click', resetFilters);

// Stream Controls
streamServerSelect.addEventListener('change', (e) => {
  activeProviderKey = e.target.value;
  streamProviderAttempts = 0;
  loadStreamSource();
});

streamInAppWebview.addEventListener('dom-ready', markStreamReady);
streamInAppWebview.addEventListener('did-fail-load', (event) => {
  if (event.errorCode === -3 || event.isMainFrame === false) return;
  tryNextStreamRoute();
});
streamInAppWebview.addEventListener('render-process-gone', tryNextStreamRoute);
streamDirectVideo.addEventListener('canplay', markStreamReady);
streamDirectVideo.addEventListener('error', () => {
  showStreamStatus('This feed is unavailable', 'The live source could not be played. Try again shortly.', true);
});
streamRetryButton.addEventListener('click', () => {
  streamProviderAttempts = 0;
  activeProviderKey = Object.keys(STREAM_PROVIDERS)[0];
  streamServerSelect.value = activeProviderKey;
  loadStreamSource();
});

streamNextBtn.onclick = () => {
  if (!activeMedia) return;
  saveActiveStreamProgress();
  activeEpisode++;
  streamProviderAttempts = 0;
  streamPlaybackStartedAt = Date.now();
  recordProgress(activeMedia, 0.01, { season: activeSeason, episode: activeEpisode });
  streamEpisodeTag.textContent = 'S' + activeSeason + ':E' + activeEpisode;
  loadStreamSource();
};

streamPrevBtn.onclick = () => {
  if (!activeMedia || activeEpisode <= 1) return;
  saveActiveStreamProgress();
  activeEpisode--;
  streamProviderAttempts = 0;
  streamPlaybackStartedAt = Date.now();
  recordProgress(activeMedia, 0.01, { season: activeSeason, episode: activeEpisode });
  streamEpisodeTag.textContent = 'S' + activeSeason + ':E' + activeEpisode;
  loadStreamSource();
};

closeStreamDialogBtn.addEventListener('click', () => {
  saveActiveStreamProgress();
  clearTimeout(streamLoadTimeout);
  streamLoadTimeout = null;
  streamDirectVideo.pause();
  streamInAppWebview.src = 'about:blank';
  inAppStreamDialog.close();
  renderResources();
});

closeDetailDialogBtn.addEventListener('click', () => mediaDetailDialog.close());

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
myHarborTabs.addEventListener('click', (event) => {
  const button = event.target.closest('[data-my-harbor-tab]');
  if (!button) return;
  activeMyHarborTab = button.dataset.myHarborTab;
  renderMyHarbor();
});
openLocalLibraryButton.addEventListener('click', () => {
  myHarborDialog.close();
  activeMedia = null;
  playerDialog.showModal();
});
closePlayerButton.addEventListener('click', () => playerDialog.close());

let lastPlaybackProgressWrite = 0;
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
  const version = await window.harbor?.getVersion?.();
  if (version) {
    appVersion.textContent = 'Harbor ' + version;
    updateStatus.textContent = 'You are using Harbor ' + version + '.';
  }
  updateDialog.showModal();
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
    if (inAppStreamDialog.open) {
      saveActiveStreamProgress();
      clearTimeout(streamLoadTimeout);
      streamLoadTimeout = null;
      streamDirectVideo.pause();
      streamInAppWebview.src = 'about:blank';
      inAppStreamDialog.close();
    } else if (mediaDetailDialog.open) {
      mediaDetailDialog.close();
    } else if (myHarborDialog.open) {
      myHarborDialog.close();
    } else if (playerDialog.open) {
      playerDialog.close();
    }
  }
});

// Render initial full collection
loadCachedCatalogTotals();
renderResources();
void window.harbor?.getVersion?.().then((version) => {
  if (version) appVersion.textContent = 'Harbor ' + version;
});
void fetchTrendingMedia();
void fetchCatalogTotals();

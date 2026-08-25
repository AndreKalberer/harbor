const assert = require('node:assert/strict');
const userState = require('../shared/user-state.js');

const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    values
  };
};

const legacyStorage = createStorage({
  'harbor:user-state:v1': JSON.stringify({
    favorites: [
      { id: 'movie-1', name: 'Harbor Movie', category: 'Watch', type: 'movie', sections: ['Movie'] },
      { id: 'movie-1', name: 'Duplicate', category: 'Watch', type: 'movie' },
      { id: 'invalid-without-name' }
    ],
    history: [{ id: 'show-1', name: 'Harbor Show', category: 'Watch', type: 'tv', lastOpenedAt: 123 }],
    progress: {
      'show-1': {
        item: { id: 'show-1', name: 'Harbor Show', category: 'Watch', type: 'tv' },
        progress: 2,
        season: 0,
        episode: '4',
        updatedAt: 456
      }
    },
    settings: { autoplayNext: false, rememberProgress: true, reduceMotion: true }
  })
});

const migrated = userState.load(legacyStorage);
assert.equal(migrated.version, 2);
assert.equal(migrated.favorites.length, 1);
assert.equal(migrated.history[0].lastOpenedAt, 123);
assert.equal(migrated.progress['show-1'].progress, 1);
assert.equal(migrated.progress['show-1'].season, 1);
assert.equal(migrated.progress['show-1'].episode, 4);
assert.equal(migrated.settings.autoplayNext, false);
assert.equal(migrated.settings.onboardingComplete, false);
assert.equal(JSON.parse(legacyStorage.values.get(userState.CURRENT_KEY)).version, 2);

const corruptStorage = createStorage({
  [userState.CURRENT_KEY]: '{broken',
  'harbor:user-state:v1': JSON.stringify({ favorites: [{ id: 'legacy', name: 'Recovered favorite' }] })
});
const recovered = userState.load(corruptStorage);
assert.equal(recovered.favorites[0].name, 'Recovered favorite');
const recoveryCopy = JSON.parse(corruptStorage.values.get(userState.RECOVERY_KEY));
assert.equal(recoveryCopy.sourceKey, userState.CURRENT_KEY);
assert.equal(recoveryCopy.raw, '{broken');

const empty = userState.load(createStorage());
assert.deepEqual(empty, userState.defaults());

const backup = userState.createBackup(migrated, '2.1.0');
assert.equal(backup.format, 'harbor-user-data');
assert.equal(backup.version, 1);
assert.equal(backup.appVersion, '2.1.0');
assert.deepEqual(userState.parseBackup(JSON.stringify(backup)), migrated);
assert.deepEqual(userState.parseBackup(JSON.stringify({ favorites: migrated.favorites })), {
  ...userState.defaults(),
  favorites: migrated.favorites
});
assert.throws(() => userState.parseBackup('{bad json'));
assert.throws(() => userState.parseBackup({ unrelated: true }), /not a Harbor data backup/);
assert.throws(() => userState.parseBackup({ format: 'harbor-user-data', version: 99, state: {} }), /not supported/);

process.stdout.write('User-state migration and recovery verified.\n');

const assert = require('node:assert/strict');
const catalog = require('../app/catalog-data.js');

assert(Array.isArray(catalog) && catalog.length >= 50, 'The embedded desktop catalog is unexpectedly small.');
assert.equal(new Set(catalog.map((item) => item.id)).size, catalog.length, 'Desktop catalog ids must be unique.');
for (const category of ['Watch', 'Listen', 'Read', 'Play']) {
  assert(catalog.some((item) => item.category === category), `Desktop catalog is missing ${category}.`);
}
for (const item of catalog) {
  assert.equal(typeof item.id, 'string');
  assert.equal(typeof item.name, 'string');
  assert.equal(typeof item.category, 'string');
}

process.stdout.write(`Desktop catalog module verified (${catalog.length} entries).\n`);

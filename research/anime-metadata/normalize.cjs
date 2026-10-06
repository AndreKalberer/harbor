// Isolated source proof. Not imported by Harbor runtime.
'use strict';
const CLASSES = { tv: 'Q63952888', movie: 'Q20650540' };
const entity = value => String(value || '').match(/\/entity\/(Q[1-9]\d*)$/)?.[1];
function normalize(bindings, sourceDate) {
  const accepted = [], rejected = [];
  for (const row of bindings) {
    const type = row.kind?.value, tmdbId = row.tmdb?.value;
    const entityId = entity(row.item?.value), classification = entity(row.class?.value);
    if (!entityId || !CLASSES[type] || classification !== CLASSES[type] || !/^[1-9]\d*$/.test(tmdbId || '') || !row.en?.value?.trim()) {
      rejected.push({ entityId, reason: 'invalid-classification-id-or-English-label' });
      continue;
    }
    accepted.push({ entityId, classification, type, tmdbId, name: row.en.value.trim(),
      japaneseLabel: row.ja?.value || null, originalTitle: row.titles?.value || null,
      languageEntityIds: (row.languages?.value || '').split('|').map(entity).filter(Boolean),
      sourceDates: (row.dates?.value || '').split('|').filter(Boolean), sourceDate,
      sourceUrl: 'https://www.wikidata.org/wiki/' + entityId });
  }
  const groups = new Map(), entityMappings = new Map();
  for (const row of accepted) {
    const entityKey = row.type + '/' + row.entityId;
    if (!entityMappings.has(entityKey)) entityMappings.set(entityKey, new Set());
    entityMappings.get(entityKey).add(row.tmdbId);
    const key = row.type + '/' + row.tmdbId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const rows = [];
  for (const [key, group] of groups) {
    if (group.length !== 1) rejected.push({ key, reason: 'ambiguous-tmdb-mapping', entityIds: group.map(r => r.entityId) });
    else if (entityMappings.get(group[0].type + '/' + group[0].entityId).size > 1) {
      rejected.push({ key, reason: 'ambiguous-entity-mapping', entityIds: [group[0].entityId] });
    } else rows.push(group[0]);
  }
  return { rows, rejected };
}
module.exports = { normalize };

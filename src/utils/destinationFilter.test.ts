import test from 'node:test';
import assert from 'node:assert/strict';
import { DESTINATIONS } from '../data/siteConfig';
import { filterDestinations } from './destinationFilter';

test('filterDestinations returns all when criteria are open', () => {
  const result = filterDestinations(DESTINATIONS, {
    region: 'All',
    season: 'All',
    mode: 'All',
    maxPricePKR: 100000,
    searchQuery: '',
  });
  assert.equal(result.length, DESTINATIONS.length);
});

test('filterDestinations filters by region, mode, price ceiling, and search query', () => {
  const gbAir = filterDestinations(DESTINATIONS, {
    region: 'Gilgit-Baltistan',
    season: 'All',
    mode: 'air',
    maxPricePKR: 60000,
    searchQuery: '',
  });
  assert.ok(gbAir.length >= 2);
  assert.ok(gbAir.every((d) => d.region === 'Gilgit-Baltistan' && d.modes.includes('air')));

  const queryMatch = filterDestinations(DESTINATIONS, {
    region: 'All',
    season: 'All',
    mode: 'All',
    maxPricePKR: 60000,
    searchQuery: 'saif-ul-mulook',
  });
  assert.equal(queryMatch.length, 1);
  assert.equal(queryMatch[0].id, 'naran-kaghan');
});

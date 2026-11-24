import test from 'node:test';
import assert from 'node:assert/strict';
import { DESTINATIONS } from '../data/siteConfig';
import {
  filterDestinationSuggestions,
  resolveDestinationByQuery,
} from './destinationAutocomplete';

test('filterDestinationSuggestions returns all destinations for blank query and ranks prefix matches first', () => {
  const all = filterDestinationSuggestions(DESTINATIONS, '   ');
  assert.equal(all.length, DESTINATIONS.length);

  const hunzaMatches = filterDestinationSuggestions(DESTINATIONS, 'hunza');
  assert.ok(hunzaMatches.length >= 1);
  assert.equal(hunzaMatches[0].id, 'hunza-valley');

  const swatMatches = filterDestinationSuggestions(DESTINATIONS, 'kalam');
  assert.equal(swatMatches[0].id, 'swat-kalam');

  const regionMatches = filterDestinationSuggestions(DESTINATIONS, 'azad kashmir');
  assert.ok(regionMatches.some((d) => d.id === 'neelum-valley'));

  const none = filterDestinationSuggestions(DESTINATIONS, 'no-such-valley-xyz');
  assert.deepEqual(none, []);
});

test('resolveDestinationByQuery resolves selected or unique matches and rejects blank or ambiguous queries', () => {
  const exact = resolveDestinationByQuery(
    DESTINATIONS,
    'Hunza Valley & Attabad Lake',
    'hunza-valley'
  );
  assert.equal(exact?.id, 'hunza-valley');

  const uniquePartial = resolveDestinationByQuery(DESTINATIONS, 'shangrila');
  assert.equal(uniquePartial?.id, 'skardu-shangrila');

  const blank = resolveDestinationByQuery(DESTINATIONS, '   ', 'naran-kaghan');
  assert.equal(blank, null);

  // Broad region query matches multiple KPK & Hazara destinations -> ambiguous until user picks one
  const ambiguous = resolveDestinationByQuery(DESTINATIONS, 'KPK');
  assert.equal(ambiguous, null);
});

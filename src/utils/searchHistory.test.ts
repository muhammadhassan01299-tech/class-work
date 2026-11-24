import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addSearchHistoryEntry,
  loadSearchHistory,
  removeSearchHistoryEntry,
  saveSearchHistory,
  SEARCH_HISTORY_STORAGE_KEY,
} from './searchHistory';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

test('addSearchHistoryEntry prepends newest, deduplicates identical searches, and caps at maxItems', () => {
  let list = addSearchHistoryEntry(
    [],
    {
      departureCity: 'Islamabad',
      destinationId: 'naran-kaghan',
      travelDate: '2026-06-15',
      travellers: 2,
      travelMode: 'road',
    },
    1000,
    3
  );
  assert.equal(list.length, 1);
  assert.equal(list[0].destinationName, 'Naran Kaghan & Saif-ul-Mulook');

  list = addSearchHistoryEntry(
    list,
    {
      departureCity: 'Lahore',
      destinationId: 'hunza-valley',
      travelDate: '2026-07-01',
      travellers: 4,
      travelMode: 'air',
    },
    2000,
    3
  );
  assert.equal(list.length, 2);
  assert.equal(list[0].destinationId, 'hunza-valley');

  // Re-adding identical Naran search moves it back to index 0 without duplicating
  list = addSearchHistoryEntry(
    list,
    {
      departureCity: 'Islamabad',
      destinationId: 'naran-kaghan',
      travelDate: '2026-06-15',
      travellers: 2,
      travelMode: 'road',
    },
    3000,
    3
  );
  assert.equal(list.length, 2);
  assert.equal(list[0].destinationId, 'naran-kaghan');
  assert.equal(list[0].searchedAt, 3000);

  // Adding 2 more enforces maxItems = 3
  list = addSearchHistoryEntry(
    list,
    {
      departureCity: 'Karachi',
      destinationId: 'skardu-shangrila',
      travelDate: '2026-08-10',
      travellers: 3,
      travelMode: 'air',
    },
    4000,
    3
  );
  list = addSearchHistoryEntry(
    list,
    {
      departureCity: 'Islamabad',
      destinationId: 'swat-kalam',
      travelDate: '2026-09-05',
      travellers: 5,
      travelMode: 'road',
    },
    5000,
    3
  );
  assert.equal(list.length, 3);
  assert.equal(list[0].destinationId, 'swat-kalam');
});

test('removeSearchHistoryEntry deletes matching entry and leaves others intact', () => {
  const list = addSearchHistoryEntry(
    addSearchHistoryEntry(
      [],
      {
        departureCity: 'Islamabad',
        destinationId: 'naran-kaghan',
        travelDate: '2026-06-15',
        travellers: 2,
        travelMode: 'road',
      },
      100
    ),
    {
      departureCity: 'Lahore',
      destinationId: 'hunza-valley',
      travelDate: '2026-07-01',
      travellers: 4,
      travelMode: 'air',
    },
    200
  );

  const filtered = removeSearchHistoryEntry(list, list[0].id);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].destinationId, 'naran-kaghan');
});

test('saveSearchHistory and loadSearchHistory round-trip and handle malformed storage safely', () => {
  const storage = createMemoryStorage();
  const list = addSearchHistoryEntry(
    [],
    {
      departureCity: 'Karachi',
      destinationId: 'fairy-meadows',
      travelDate: '2026-07-20',
      travellers: 2,
      travelMode: 'road',
    },
    900
  );

  saveSearchHistory(storage, list);
  const loaded = loadSearchHistory(storage);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].destinationId, 'fairy-meadows');

  // Empty array clears storage key
  saveSearchHistory(storage, []);
  assert.equal(storage.getItem(SEARCH_HISTORY_STORAGE_KEY), null);

  // Corrupted JSON recovers to []
  storage.setItem(SEARCH_HISTORY_STORAGE_KEY, '{not-valid-json');
  assert.deepEqual(loadSearchHistory(storage), []);
});

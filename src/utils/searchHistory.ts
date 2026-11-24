import { DESTINATIONS, type TravelMode } from '../data/siteConfig';

export const SEARCH_HISTORY_STORAGE_KEY = 'pak_tourist_search_history_v1';
export const MAX_SEARCH_HISTORY_ITEMS = 5;

export interface SearchHistoryInput {
  departureCity: string;
  destinationId: string;
  travelDate: string;
  travellers: number;
  travelMode: TravelMode;
}

export interface SearchHistoryEntry extends SearchHistoryInput {
  id: string;
  destinationName: string;
  searchedAt: number;
}

interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

function resolveDestinationName(
  destinationId: string,
  destinationsList: { id: string; name: string }[] = DESTINATIONS
): string {
  const found = destinationsList.find((d) => d.id === destinationId);
  return found ? found.name : destinationId;
}

export function buildSearchSignature(item: SearchHistoryInput): string {
  return [
    item.departureCity,
    item.destinationId,
    item.travelDate,
    String(Math.max(1, Math.floor(item.travellers || 1))),
    item.travelMode,
  ].join('|');
}

export function addSearchHistoryEntry(
  current: SearchHistoryEntry[],
  input: SearchHistoryInput,
  now: number = Date.now(),
  maxItems: number = MAX_SEARCH_HISTORY_ITEMS,
  destinationsList: { id: string; name: string }[] = DESTINATIONS
): SearchHistoryEntry[] {
  const normalizedTravellers = Math.max(1, Math.min(40, Math.floor(input.travellers || 1)));
  const normalizedInput: SearchHistoryInput = {
    ...input,
    travellers: normalizedTravellers,
  };
  const signature = buildSearchSignature(normalizedInput);

  const nextEntry: SearchHistoryEntry = {
    ...normalizedInput,
    id: `${signature}-${now}`,
    destinationName: resolveDestinationName(normalizedInput.destinationId, destinationsList),
    searchedAt: now,
  };

  const deduplicated = current.filter(
    (entry) => buildSearchSignature(entry) !== signature
  );

  return [nextEntry, ...deduplicated].slice(0, Math.max(1, maxItems));
}

export function removeSearchHistoryEntry(
  current: SearchHistoryEntry[],
  id: string
): SearchHistoryEntry[] {
  return current.filter((entry) => entry.id !== id);
}

export function loadSearchHistory(storage?: StorageLike | null): SearchHistoryEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SEARCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SearchHistoryEntry =>
          Boolean(item) &&
          typeof item.id === 'string' &&
          typeof item.departureCity === 'string' &&
          typeof item.destinationId === 'string' &&
          typeof item.travelDate === 'string' &&
          typeof item.travellers === 'number' &&
          (item.travelMode === 'road' || item.travelMode === 'air')
      )
      .slice(0, MAX_SEARCH_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

export function saveSearchHistory(
  storage: StorageLike | null | undefined,
  entries: SearchHistoryEntry[]
): void {
  if (!storage) return;
  try {
    if (entries.length === 0) {
      storage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
    } else {
      storage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(entries));
    }
  } catch {
    // Ignore quota or storage restriction errors
  }
}

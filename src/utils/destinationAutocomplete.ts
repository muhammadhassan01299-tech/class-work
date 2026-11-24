import { type DestinationItem } from '../data/siteConfig';

function getSuggestionRank(dest: DestinationItem, normalizedQuery: string): number | null {
  const name = dest.name.toLowerCase();
  if (name.startsWith(normalizedQuery)) return 0;

  const nameWords = name.split(/[\s,&/-]+/);
  if (nameWords.some((word) => word.startsWith(normalizedQuery))) return 1;

  if (name.includes(normalizedQuery)) return 2;

  const region = dest.region.toLowerCase();
  if (region.includes(normalizedQuery)) return 3;

  const extra = `${dest.tagline} ${dest.highlights.join(' ')}`.toLowerCase();
  if (extra.includes(normalizedQuery)) return 4;

  return null;
}

export function filterDestinationSuggestions(
  destinations: DestinationItem[],
  query: string
): DestinationItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return destinations;
  }

  const ranked: { item: DestinationItem; rank: number; index: number }[] = [];
  destinations.forEach((item, index) => {
    const rank = getSuggestionRank(item, normalized);
    if (rank !== null) {
      ranked.push({ item, rank, index });
    }
  });

  ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return ranked.map((entry) => entry.item);
}

export function resolveDestinationByQuery(
  destinations: DestinationItem[],
  query: string,
  selectedId?: string
): DestinationItem | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (selectedId) {
    const selected = destinations.find((d) => d.id === selectedId);
    if (selected && selected.name.toLowerCase() === normalized) {
      return selected;
    }
  }

  const exactMatch = destinations.find((d) => d.name.toLowerCase() === normalized);
  if (exactMatch) {
    return exactMatch;
  }

  const matches = filterDestinationSuggestions(destinations, normalized);
  if (matches.length === 1) {
    return matches[0];
  }

  return null;
}

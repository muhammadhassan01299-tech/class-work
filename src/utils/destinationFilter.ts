import {
  type DestinationItem,
  type DestinationRegion,
  type TravelMode,
  type TravelSeason,
} from '../data/siteConfig';

export interface DestinationFilterCriteria {
  region: 'All' | DestinationRegion;
  season: 'All' | TravelSeason;
  mode: 'All' | TravelMode;
  maxPricePKR: number;
  searchQuery: string;
}

export function filterDestinations(
  destinations: DestinationItem[],
  criteria: DestinationFilterCriteria
): DestinationItem[] {
  const q = criteria.searchQuery.trim().toLowerCase();

  return destinations.filter((dest) => {
    if (criteria.region !== 'All' && dest.region !== criteria.region) {
      return false;
    }
    if (criteria.season !== 'All' && !dest.season.includes(criteria.season)) {
      return false;
    }
    if (criteria.mode !== 'All' && !dest.modes.includes(criteria.mode)) {
      return false;
    }
    if (dest.basePricePKR > criteria.maxPricePKR) {
      return false;
    }
    if (q.length > 0) {
      const searchable = `${dest.name} ${dest.tagline} ${dest.region} ${dest.highlights.join(' ')}`.toLowerCase();
      if (!searchable.includes(q)) {
        return false;
      }
    }
    return true;
  });
}

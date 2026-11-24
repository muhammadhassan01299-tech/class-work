import { RotateCcw, Search } from 'lucide-react';
import { useState } from 'react';
import { ResilientImage } from '../components/ResilientImage';
import { useMedia } from '../context/MediaContext';
import { useSiteData } from '../context/SiteDataContext';
import {
  type DestinationItem,
  type DestinationRegion,
  type TravelMode,
  type TravelSeason,
} from '../data/siteConfig';
import { formatPKR } from '../utils/bookingMath';
import { filterDestinations } from '../utils/destinationFilter';

interface DestinationsPageProps {
  onOpenDestination: (dest: DestinationItem) => void;
  onBookDestination: (destinationId: string, mode?: TravelMode) => void;
}

const REGIONS: ('All' | DestinationRegion)[] = [
  'All',
  'KPK & Hazara',
  'Gilgit-Baltistan',
  'Azad Kashmir',
];

const SEASONS: ('All' | TravelSeason)[] = ['All', 'Spring', 'Summer', 'Autumn', 'Winter'];

export function DestinationsPage({
  onOpenDestination,
  onBookDestination,
}: DestinationsPageProps) {
  const { resolveImage } = useMedia();
  const { destinations } = useSiteData();
  const maxCatalogPrice = Math.max(
    60000,
    ...destinations.map((d) => Math.ceil(d.basePricePKR / 2500) * 2500)
  );
  const [region, setRegion] = useState<'All' | DestinationRegion>('All');
  const [season, setSeason] = useState<'All' | TravelSeason>('All');
  const [mode, setMode] = useState<'All' | TravelMode>('All');
  const [priceOverridePKR, setPriceOverridePKR] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const maxPricePKR =
    priceOverridePKR === null ? maxCatalogPrice : Math.min(priceOverridePKR, maxCatalogPrice);

  const filtered = filterDestinations(destinations, {
    region,
    season,
    mode,
    maxPricePKR,
    searchQuery,
  });

  const resetFilters = () => {
    setRegion('All');
    setSeason('All');
    setMode('All');
    setPriceOverridePKR(null);
    setSearchQuery('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <div className="max-w-3xl mb-10">
        <p className="text-sm font-semibold text-[#0077B6] mb-2">Explore Pakistan</p>
        <h1 className="text-3xl sm:text-5xl font-bold text-[#03045E] mb-3">
          Destinations Across the North &amp; Kashmir
        </h1>
        <p className="text-base sm:text-lg text-[#03045E]/80 leading-relaxed">
          Filter by region, season, PKR budget, or travel mode (By Road or By Air), then inspect
          full day-by-day itineraries or book immediately.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 bg-white/90 mb-10 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="dest-search" className="block text-xs font-bold text-[#023E8A] mb-1.5">
              Search Valley or Landmark
            </label>
            <div className="relative">
              <Search
                className="w-4 h-4 text-[#0077B6] absolute left-3.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                id="dest-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hunza, Lake, Naran..."
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="dest-region" className="block text-xs font-bold text-[#023E8A] mb-1.5">
              Region
            </label>
            <select
              id="dest-region"
              value={region}
              onChange={(e) => setRegion(e.target.value as 'All' | DestinationRegion)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r === 'All' ? 'All Regions' : r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dest-season" className="block text-xs font-bold text-[#023E8A] mb-1.5">
              Season
            </label>
            <select
              id="dest-season"
              value={season}
              onChange={(e) => setSeason(e.target.value as 'All' | TravelSeason)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
            >
              {SEASONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Seasons' : s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dest-price" className="block text-xs font-bold text-[#023E8A] mb-1.5">
              Max Base Budget:{' '}
              <span className="tabular-nums text-[#0077B6]">{formatPKR(maxPricePKR)}</span>
            </label>
            <input
              id="dest-price"
              type="range"
              min={15000}
              max={maxCatalogPrice}
              step={2500}
              value={maxPricePKR}
              onChange={(e) => setPriceOverridePKR(Number(e.target.value))}
              className="w-full accent-[#023E8A] mt-2"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#CAF0F8]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#023E8A] mr-1">Travel Mode:</span>
            {(
              [
                ['All', 'All Modes'],
                ['road', 'By Road'],
                ['air', 'By Air'],
              ] as ['All' | TravelMode, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setMode(val)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  mode === val
                    ? 'bg-[#023E8A] text-white'
                    : 'bg-[#CAF0F8] text-[#03045E] hover:bg-[#ADE8F4]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-[#0077B6] tabular-nums">
              Showing {filtered.length} of {destinations.length} destinations
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#023E8A] hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center bg-white/85">
          <h2 className="text-2xl font-bold text-[#03045E] mb-2">
            No destinations match your current filters
          </h2>
          <p className="text-base text-[#03045E]/80 mb-6">
            Try raising your PKR budget slider or switching back to all regions and travel modes.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-6 py-2.5 rounded-2xl bg-[#023E8A] text-white text-sm font-bold glossy-btn"
          >
            Show All Destinations
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((dest) => (
            <article
              key={dest.id}
              className="glass-card rounded-3xl overflow-hidden glossy-card-hover bg-white/90 flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[4/3] overflow-hidden">
                  <ResilientImage
                    src={resolveImage(dest.imageKey, dest.defaultImage)}
                    alt={dest.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold text-[#0077B6] mb-1.5">
                    {dest.region} · {dest.durationLabel} ·{' '}
                    {dest.modes.map((m) => (m === 'air' ? 'By Air' : 'By Road')).join(' / ')}
                  </p>
                  <h2 className="text-xl font-bold text-[#03045E] mb-2">{dest.name}</h2>
                  <p className="text-sm text-[#03045E]/80 leading-relaxed mb-3">{dest.tagline}</p>
                  <p className="text-xs text-[#0077B6] tabular-nums">
                    {dest.reviewCount > 0
                      ? `Rating ${dest.rating.toFixed(1)} (${dest.reviewCount} reviews)`
                      : 'New destination'}{' '}
                    · Best:{' '}
                    {dest.bestTimeToVisit}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-3 border-t border-[#CAF0F8] flex items-center justify-between gap-3">
                <div>
                  <span className="block text-xs text-[#0077B6]">From</span>
                  <span className="text-lg font-bold text-[#023E8A] tabular-nums">
                    {formatPKR(dest.basePricePKR)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDestination(dest)}
                    className="px-3.5 py-2 rounded-xl border border-[#90E0EF] text-xs font-bold text-[#03045E] hover:bg-[#CAF0F8] transition-colors"
                  >
                    View Itinerary
                  </button>
                  <button
                    type="button"
                    onClick={() => onBookDestination(dest.id, dest.modes[0])}
                    className="px-4 py-2 rounded-xl bg-[#023E8A] text-white text-xs font-bold glossy-btn"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

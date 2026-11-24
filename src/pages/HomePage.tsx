import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Headphones,
  History,
  MapPin,
  Plane,
  ShieldCheck,
  Star,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { AnimatedCounter } from '../components/AnimatedCounter';
import type { PageId } from '../components/Navbar';
import { DestinationAutocomplete } from '../components/DestinationAutocomplete';
import { ResilientImage } from '../components/ResilientImage';
import { StorytellingSection } from '../components/StorytellingSection';
import { useMedia } from '../context/MediaContext';
import { useSiteData } from '../context/SiteDataContext';
import {
  COMPANY_STATS,
  DEFAULT_IMAGES,
  TESTIMONIALS,
  type DestinationItem,
  type TravelMode,
} from '../data/siteConfig';
import { formatPKR } from '../utils/bookingMath';
import { resolveDestinationByQuery } from '../utils/destinationAutocomplete';
import {
  addSearchHistoryEntry,
  loadSearchHistory,
  removeSearchHistoryEntry,
  saveSearchHistory,
  type SearchHistoryEntry,
} from '../utils/searchHistory';

export interface QuickSearchDraft {
  departureCity: string;
  destinationId: string;
  travelDate: string;
  travellers: number;
  travelMode: TravelMode;
  applyOffer?: boolean;
}

interface HomePageProps {
  onNavigate: (page: PageId) => void;
  onStartBooking: (draft: Partial<QuickSearchDraft>) => void;
  onOpenDestination: (dest: DestinationItem) => void;
}

function defaultTravelDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function HomePage({
  onNavigate,
  onStartBooking,
  onOpenDestination,
}: HomePageProps) {
  const { resolveImage } = useMedia();
  const {
    destinations,
    featuredPackages,
    specialOffer,
    brandConfig,
    addInquiry,
    pricing,
  } = useSiteData();
  const DEPARTURE_CITIES = pricing.departureCities;
  const [scrollY, setScrollY] = useState(0);

  // Quick search bar state
  const [departureCity, setDepartureCity] = useState(DEPARTURE_CITIES[0]);
  const [destinationId, setDestinationId] = useState(destinations[0]?.id || '');
  const [destinationQuery, setDestinationQuery] = useState(destinations[0]?.name || '');
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [travelDate, setTravelDate] = useState(defaultTravelDate);
  const [travellers, setTravellers] = useState(2);
  const [travelMode, setTravelMode] = useState<TravelMode>('road');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>(() =>
    loadSearchHistory(typeof window !== 'undefined' ? window.localStorage : null)
  );
  const [restoredSearchId, setRestoredSearchId] = useState<string | null>(null);

  // Testimonial slider state
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<string | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const onScroll = () => {
      setScrollY(Math.min(500, window.scrollY));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedDest = resolveDestinationByQuery(
      destinations,
      destinationQuery,
      destinationId
    );
    if (!resolvedDest) {
      setDestinationError('Please choose a destination from the suggestions.');
      return;
    }

    setDestinationError(null);
    setDestinationId(resolvedDest.id);
    setDestinationQuery(resolvedDest.name);

    const updated = addSearchHistoryEntry(
      searchHistory,
      {
        departureCity,
        destinationId: resolvedDest.id,
        travelDate,
        travellers,
        travelMode,
      },
      Date.now(),
      5,
      destinations
    );
    setSearchHistory(updated);
    saveSearchHistory(window.localStorage, updated);

    onStartBooking({
      departureCity,
      destinationId: resolvedDest.id,
      travelDate,
      travellers,
      travelMode,
    });
  };

  const handleApplyHistoryEntry = (entry: SearchHistoryEntry) => {
    const matched = destinations.find((d) => d.id === entry.destinationId);
    setDepartureCity(entry.departureCity);
    setDestinationId(entry.destinationId);
    setDestinationQuery(matched ? matched.name : entry.destinationName);
    setDestinationError(null);
    setTravelDate(entry.travelDate);
    setTravellers(entry.travellers);
    setTravelMode(entry.travelMode);
    setRestoredSearchId(entry.id);
  };

  const handleRemoveHistoryEntry = (id: string) => {
    const updated = removeSearchHistoryEntry(searchHistory, id);
    setSearchHistory(updated);
    saveSearchHistory(window.localStorage, updated);
    if (restoredSearchId === id) {
      setRestoredSearchId(null);
    }
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    saveSearchHistory(window.localStorage, []);
    setRestoredSearchId(null);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newsletterEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setNewsletterStatus('Please enter a valid email address.');
      return;
    }
    try {
      await addInquiry({
        type: 'newsletter',
        name: 'Newsletter Subscriber',
        email: cleanEmail,
        phone: 'Not provided',
        message: `Subscribed to ${brandConfig.companyName} seasonal road & flight departure alerts.`,
      });
      setNewsletterStatus(`Thank you! You are subscribed to ${brandConfig.companyName} seasonal alerts.`);
      setNewsletterEmail('');
    } catch {
      setNewsletterStatus('Could not subscribe right now. Please try again in a moment.');
    }
  };

  const activeTestimonial = TESTIMONIALS[testimonialIdx];
  const heroBg = resolveImage('heroNaran', DEFAULT_IMAGES.heroNaran);

  return (
    <div>
      {/* 1. FULL-SCREEN HERO WITH PARALLAX & FLOATING CLOUDS */}
      <section className="relative min-h-[88vh] flex flex-col justify-center overflow-hidden">
        {/* Parallax Backdrop Image */}
        <div
          aria-hidden="true"
          className="absolute inset-0 will-change-transform"
          style={{ transform: `translate3d(0, ${scrollY * 0.16}px, 0) scale(1.06)` }}
        >
          <ResilientImage
            src={heroBg}
            alt="Naran Kaghan Lake Saif-ul-Mulook and lush valley peaks"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Measured Palette Contrast Scrim */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#03045E]/72 via-[#03045E]/45 to-[#03045E]/75"
        />

        {/* Floating Soft Cloud Wisps (Parallax) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-14 left-6 w-72 h-24 rounded-full bg-white/15 blur-2xl animate-cloud-slow"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-28 right-10 w-96 h-28 rounded-full bg-[#CAF0F8]/20 blur-3xl animate-cloud-reverse"
        />

        {/* Distant Mountain Silhouette SVG Parallax Ridge */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 160"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-12 left-0 right-0 w-full h-24 sm:h-32 opacity-20"
          style={{ transform: `translate3d(0, ${scrollY * 0.08}px, 0)` }}
        >
          <path
            d="M0 160 L0 110 L180 62 L340 105 L560 36 L760 98 L980 42 L1180 88 L1340 52 L1440 84 L1440 160 Z"
            fill="#CAF0F8"
          />
        </svg>

        {/* Hero Copy */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-28 sm:pb-32">
          <div className="max-w-3xl">
            <p className="text-sm sm:text-base font-semibold text-[#ADE8F4] mb-3">
              Pakistan’s Premier By-Road &amp; By-Air Travel Desk · Curated by{' '}
              {brandConfig.ownerName}
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.12] tracking-tight mb-5">
              Explore the Beauty of Pakistan with {brandConfig.companyName}
            </h1>
            <p className="text-lg sm:text-xl text-[#CAF0F8] leading-relaxed max-w-2xl mb-8">
              Travel in comfort from Islamabad, Lahore, or Karachi to Naran Kaghan, Hunza, Skardu,
              Swat, Fairy Meadows, and Neelum Valley—with private vehicles and scenic flight
              packages.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  onStartBooking({ destinationId: destinations[0]?.id || 'naran-kaghan' })
                }
                className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] hover:from-[#0077B6] hover:to-[#0096C7] text-white text-base font-bold glossy-btn shadow-xl border border-[#90E0EF]/40"
              >
                Book Your Trip
              </button>
              <button
                type="button"
                onClick={() => onNavigate('destinations')}
                className="px-7 py-3.5 rounded-2xl bg-white/85 hover:bg-white text-[#03045E] text-base font-bold glossy-btn border border-[#90E0EF]"
              >
                View Destinations
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. QUICK BOOKING SEARCH BAR */}
      <section aria-label="Quick Trip Search" className="relative z-20 -mt-16 px-4 sm:px-6 lg:px-8">
        <form
          onSubmit={handleQuickSearchSubmit}
          className="max-w-6xl mx-auto glass-card rounded-3xl p-5 sm:p-6 bg-white/95 shadow-2xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div>
              <label
                htmlFor="quick-from"
                className="block text-xs font-bold text-[#023E8A] mb-1.5"
              >
                Departure City
              </label>
              <select
                id="quick-from"
                value={departureCity}
                onChange={(e) => setDepartureCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
              >
                {DEPARTURE_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <DestinationAutocomplete
              id="quick-dest"
              destinations={destinations}
              selectedDestinationId={destinationId}
              query={destinationQuery}
              invalid={Boolean(destinationError)}
              onQueryChange={(nextQuery) => {
                setDestinationQuery(nextQuery);
                setDestinationId('');
                setDestinationError(null);
                setRestoredSearchId(null);
              }}
              onSelectDestination={(dest) => {
                setDestinationId(dest.id);
                setDestinationQuery(dest.name);
                setDestinationError(null);
                setRestoredSearchId(null);
              }}
              onClear={() => {
                setDestinationQuery('');
                setDestinationId('');
                setDestinationError(null);
                setRestoredSearchId(null);
              }}
            />

            <div>
              <label
                htmlFor="quick-date"
                className="block text-xs font-bold text-[#023E8A] mb-1.5"
              >
                Preferred Date
              </label>
              <input
                id="quick-date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
              />
            </div>

            <div>
              <label
                htmlFor="quick-travellers"
                className="block text-xs font-bold text-[#023E8A] mb-1.5"
              >
                Travellers
              </label>
              <input
                id="quick-travellers"
                type="number"
                min={1}
                max={40}
                value={travellers}
                onChange={(e) => setTravellers(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] tabular-nums focus:outline-none focus:border-[#0077B6]"
              />
            </div>

            <div>
              <span className="block text-xs font-bold text-[#023E8A] mb-1.5">Travel Mode</span>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#CAF0F8] border border-[#90E0EF]">
                <button
                  type="button"
                  onClick={() => setTravelMode('road')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    travelMode === 'road'
                      ? 'bg-[#023E8A] text-white'
                      : 'text-[#03045E] hover:bg-white/60'
                  }`}
                >
                  By Road
                </button>
                <button
                  type="button"
                  onClick={() => setTravelMode('air')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    travelMode === 'air'
                      ? 'bg-[#023E8A] text-white'
                      : 'text-[#03045E] hover:bg-white/60'
                  }`}
                >
                  By Air
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn whitespace-nowrap"
            >
              Calculate &amp; Book
            </button>
          </div>

          {destinationError && (
            <p role="alert" className="mt-2.5 text-xs font-bold text-[#023E8A]">
              {destinationError}
            </p>
          )}

          {searchHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#CAF0F8]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0077B6]">
                  <History className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Recent Searches</span>
                  {restoredSearchId && (
                    <span className="text-[#023E8A] font-semibold">
                      · Loaded into search bar
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-xs font-bold text-[#0077B6] hover:text-[#03045E] underline"
                >
                  Clear History
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {searchHistory.map((entry) => {
                  const isRestored = restoredSearchId === entry.id;
                  return (
                    <div
                      key={entry.id}
                      className={`inline-flex items-center rounded-xl border transition-colors ${
                        isRestored
                          ? 'border-[#023E8A] bg-[#ADE8F4]/70'
                          : 'border-[#90E0EF] bg-[#CAF0F8]/55 hover:bg-[#ADE8F4]/55'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleApplyHistoryEntry(entry)}
                        className="px-3 py-1.5 text-left text-xs text-[#03045E] flex items-center gap-1.5"
                      >
                        <span className="font-bold">{entry.destinationName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#0077B6] tabular-nums">
                          {entry.departureCity} · {entry.travelDate} · {entry.travellers}{' '}
                          {entry.travellers === 1 ? 'Guest' : 'Guests'} ·{' '}
                          {entry.travelMode === 'air' ? 'By Air' : 'By Road'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveHistoryEntry(entry.id)}
                        aria-label={`Remove search for ${entry.destinationName}`}
                        className="pr-2.5 pl-1 py-1.5 text-[#0077B6] hover:text-[#03045E] transition-colors"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </section>

      {/* 3. SERVICES SECTION: BY ROAD & BY AIR */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-2xl mb-10">
          <p className="text-sm font-semibold text-[#0077B6] mb-1.5">Two Seamless Ways to Travel</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#03045E]">
            Travel By Road or By Air Across Pakistan
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card rounded-3xl p-7 sm:p-8 glossy-card-hover flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#CAF0F8] border border-[#90E0EF] flex items-center justify-center text-[#023E8A] mb-5">
                <Car className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-2xl font-bold text-[#03045E] mb-2">
                01. By Road Fleet Packages
              </h3>
              <p className="text-base text-[#03045E]/80 leading-relaxed mb-5">
                Doorstep pickups in inspected executive sedans, Toyota Hiace Grand Cabins, Saloon
                Coasters, and 40-seat luxury buses with experienced northern highway drivers.
              </p>
              <p className="text-sm font-semibold text-[#0077B6] mb-6">
                Sedan Car · Hiace Van · Toyota Coaster · Luxury Bus
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartBooking({ travelMode: 'road' })}
              className="inline-flex items-center gap-2 self-start px-5 py-2.5 rounded-2xl bg-[#023E8A] text-white text-sm font-bold glossy-btn"
            >
              <span>Book By Road</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="glass-card rounded-3xl p-7 sm:p-8 glossy-card-hover flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#CAF0F8] border border-[#90E0EF] flex items-center justify-center text-[#0077B6] mb-5">
                <Plane className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-2xl font-bold text-[#03045E] mb-2">
                02. By Air Mountain Escapes
              </h3>
              <p className="text-base text-[#03045E]/80 leading-relaxed mb-5">
                Skip multi-day highway drives with direct Islamabad flights into Skardu, Gilgit, or
                Chitral paired with private 4x4 airport transfers and verified valley hotels.
              </p>
              <p className="text-sm font-semibold text-[#0077B6] mb-6">
                Economy Flight Packages · Executive VIP Packages
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onStartBooking({ destinationId: 'hunza-valley', travelMode: 'air' })
              }
              className="inline-flex items-center gap-2 self-start px-5 py-2.5 rounded-2xl bg-[#0077B6] text-white text-sm font-bold glossy-btn"
            >
              <span>Book By Air</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. POPULAR DESTINATIONS */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-sm font-semibold text-[#0077B6] mb-1.5">Handpicked Valleys</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#03045E]">
              Popular Destinations in Pakistan
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('destinations')}
            className="inline-flex items-center gap-2 text-base font-bold text-[#023E8A] hover:text-[#0077B6] transition-colors self-start sm:self-auto"
          >
            <span>Explore All Destinations</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.slice(0, 6).map((dest) => (
            <article
              key={dest.id}
              className="glass-card rounded-3xl overflow-hidden glossy-card-hover flex flex-col justify-between bg-white/85"
            >
              <div>
                <div className="aspect-[4/3] overflow-hidden">
                  <ResilientImage
                    src={resolveImage(dest.imageKey, dest.defaultImage)}
                    alt={dest.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    fallbackLabel={dest.name}
                  />
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold text-[#0077B6] mb-1.5">
                    {dest.region} · {dest.durationLabel} · {dest.reviewCount > 0 ? (
                      <>
                        Rating <span className="tabular-nums">{dest.rating.toFixed(1)}</span>
                      </>
                    ) : (
                      'New'
                    )}
                  </p>
                  <h3 className="text-xl font-bold text-[#03045E] mb-2">{dest.name}</h3>
                  <p className="text-sm text-[#03045E]/80 leading-relaxed">{dest.tagline}</p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-3 border-t border-[#CAF0F8] flex items-center justify-between gap-3">
                <div>
                  <span className="block text-xs text-[#0077B6]">Starting from</span>
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
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartBooking({ destinationId: dest.id })}
                    className="px-4 py-2 rounded-xl bg-[#023E8A] text-white text-xs font-bold glossy-btn"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 5. FEATURED TOUR PACKAGES */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#ADE8F4]/35 border-y border-[#90E0EF]/60">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-semibold text-[#0077B6] mb-1.5">Ready-to-Go Departures</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#03045E]">
              Featured Tour Packages
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="glass-card rounded-3xl overflow-hidden glossy-card-hover bg-white/90 flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] overflow-hidden">
                    <ResilientImage
                      src={resolveImage(pkg.imageKey, pkg.defaultImage)}
                      alt={pkg.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-semibold text-[#0077B6] mb-1">
                      {pkg.durationLabel}
                    </p>
                    <h3 className="text-lg font-bold text-[#03045E] mb-2">{pkg.title}</h3>
                    <p className="text-sm text-[#03045E]/80 leading-relaxed">{pkg.summary}</p>
                  </div>
                </div>
                <div className="px-5 pb-5 pt-2 flex items-center justify-between">
                  <span className="text-base font-bold text-[#023E8A] tabular-nums">
                    {formatPKR(pkg.pricePKR)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onStartBooking({
                        destinationId: pkg.destinationId,
                        travelMode: pkg.mode,
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-[#0077B6] text-white text-xs font-bold glossy-btn"
                  >
                    Reserve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. WHY CHOOSE PAK TOURIST & ANIMATED COUNTERS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <p className="text-sm font-semibold text-[#0077B6] mb-2">Trusted Hospitality</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#03045E] mb-4">
              Why Travellers Choose Pak Tourist
            </h2>
            <p className="text-base text-[#03045E]/80 leading-relaxed mb-8">
              Every route is personally vetted by {brandConfig.ownerName}’s operations desk—balancing mountain safety,
              transparent PKR pricing, and genuine local hospitality.
            </p>

            {/* Animated Counters */}
            <div className="grid grid-cols-2 gap-4">
              {COMPANY_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="glass-card rounded-2xl p-4 bg-white/85 border border-[#90E0EF]"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-[#023E8A]">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-xs sm:text-sm text-[#03045E]/80 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                icon: ShieldCheck,
                title: 'Safe Mountain Travel',
                desc: 'Well-maintained vehicles, mountain-certified drivers, and real-time weather routing across Karakoram and Hazara passes.',
              },
              {
                icon: Wallet,
                title: 'Honest PKR Pricing',
                desc: 'Clear per-person and family group breakdowns in Pakistani Rupees with zero unexpected roadside tolls or hidden commissions.',
              },
              {
                icon: Headphones,
                title: '24/7 WhatsApp Desk',
                desc: `Direct access to ${brandConfig.ownerName} and our operations team on ${brandConfig.whatsappDisplay} throughout your entire journey.`,
              },
              {
                icon: MapPin,
                title: 'Verified Local Guides',
                desc: 'Stay at trusted valley resorts and explore hidden waterfalls, trails, and heritage forts with knowledgeable locals.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="glass-card rounded-3xl p-6 glossy-card-hover bg-white/85"
                >
                  <div className="w-11 h-11 rounded-2xl bg-[#CAF0F8] border border-[#90E0EF] flex items-center justify-center text-[#023E8A] mb-4">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold text-[#03045E] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#03045E]/80 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. STORYTELLING SCROLL SECTION */}
      <div className="bg-gradient-to-b from-[#CAF0F8]/50 via-white/70 to-[#CAF0F8]/50 border-y border-[#90E0EF]/50">
        <StorytellingSection onBookNow={() => onNavigate('booking')} />
      </div>

      {/* 8. TESTIMONIALS SLIDER */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-sm font-semibold text-[#0077B6] mb-1.5">Verified Stories</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#03045E]">
            Words from Our Travellers
          </h2>
        </div>

        <div className="glass-card rounded-3xl p-7 sm:p-10 bg-white/90 text-center relative">
          <div className="flex justify-center gap-1 text-[#0077B6] mb-4" aria-label="5 out of 5 stars">
            {Array.from({ length: activeTestimonial.rating }).map((_, idx) => (
              <Star key={idx} className="w-5 h-5 fill-[#00B4D8] text-[#00B4D8]" aria-hidden="true" />
            ))}
          </div>
          <blockquote className="text-lg sm:text-2xl text-[#03045E] leading-relaxed max-w-3xl mx-auto mb-6">
            “{activeTestimonial.quote}”
          </blockquote>
          <p className="text-base font-bold text-[#023E8A]">{activeTestimonial.name}</p>
          <p className="text-sm text-[#0077B6]">
            {activeTestimonial.city} · {activeTestimonial.trip}
          </p>

          <div className="flex items-center justify-center gap-4 mt-7">
            <button
              type="button"
              onClick={() =>
                setTestimonialIdx((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
              }
              aria-label="Previous testimonial"
              className="p-2.5 rounded-xl border border-[#90E0EF] bg-white hover:bg-[#CAF0F8] text-[#03045E] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {TESTIMONIALS.map((t, idx) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTestimonialIdx(idx)}
                  aria-label={`Show testimonial from ${t.name}`}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === testimonialIdx ? 'w-8 bg-[#023E8A]' : 'w-2.5 bg-[#90E0EF]'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setTestimonialIdx((prev) => (prev + 1) % TESTIMONIALS.length)}
              aria-label="Next testimonial"
              className="p-2.5 rounded-xl border border-[#90E0EF] bg-white hover:bg-[#CAF0F8] text-[#03045E] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* 9. SPECIAL OFFERS BANNER */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-16">
        <div className="rounded-3xl bg-gradient-to-r from-[#03045E] via-[#023E8A] to-[#0077B6] text-white p-8 sm:p-12 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-[#48CAE4]/50">
          <div className="max-w-2xl space-y-2">
            <p className="text-sm font-semibold text-[#90E0EF]">{specialOffer.badge}</p>
            <h2 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
              {specialOffer.title}
            </h2>
            <p className="text-base text-[#CAF0F8]/90">{specialOffer.description}</p>
          </div>
          <button
            type="button"
            onClick={() => onStartBooking({ applyOffer: true })}
            className="px-7 py-4 rounded-2xl bg-white text-[#03045E] hover:bg-[#CAF0F8] text-base font-bold glossy-btn whitespace-nowrap self-start lg:self-auto"
          >
            Claim Offer ({specialOffer.promoCode})
          </button>
        </div>
      </section>

      {/* 10. NEWSLETTER & FINAL CTA BOX */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto pb-24">
        <div className="glass-card rounded-3xl p-8 sm:p-10 bg-white/90 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#03045E] mb-2">
            Get Seasonal Road &amp; Flight Departures in Your Inbox
          </h2>
          <p className="text-base text-[#03045E]/80 max-w-xl mx-auto mb-6">
            Receive early-bird PKR package updates when Babusar Top, Fairy Meadows, and autumn
            Hunza blossom departures open.
          </p>

          <form
            onSubmit={handleNewsletterSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 px-4 py-3 rounded-2xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white font-bold glossy-btn whitespace-nowrap"
            >
              Subscribe
            </button>
          </form>

          {newsletterStatus && (
            <p className="mt-4 text-sm font-semibold text-[#0077B6]">{newsletterStatus}</p>
          )}
        </div>
      </section>
    </div>
  );
}

import {
  BRAND_CONFIG,
  DEFAULT_IMAGES,
  DESTINATIONS,
  FEATURED_PACKAGES,
  SPECIAL_OFFER,
  DEFAULT_PRICING,
  type DestinationItem,
  type DestinationRegion,
  type PricingConfig,
  type TourPackage,
  type TravelMode,
} from '../data/siteConfig';

export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
export type InquiryStatus = 'New' | 'Reviewed' | 'Resolved';
export type InquiryType = 'contact' | 'newsletter';

export interface AdminBookingRecord {
  id: string;
  referenceCode: string;
  customerName: string;
  phone: string;
  email: string;
  departureCity: string;
  destinationId: string;
  destinationName: string;
  travelDate: string;
  travellers: number;
  travelMode: TravelMode;
  modeLabel: string;
  estimatedTotalPKR: number;
  notes?: string;
  status: BookingStatus;
  createdAt: string;
  userId?: string;
}

export interface AdminInquiryRecord {
  id: string;
  type: InquiryType;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface EditableBrandConfig {
  companyName: string;
  ownerName: string;
  tagline: string;
  /** Read-only on the website: comes from OWNER_WHATSAPP in the server's .env file. */
  whatsappDisplay: string;
  whatsappLink: string;
  email: string;
  headquarters: string;
  officeHours: string;
}

export interface EditableSpecialOffer {
  badge: string;
  title: string;
  description: string;
  discountPerPersonPKR: number;
  promoCode: string;
}

export interface AdminCustomerRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface AdminStoreState {
  destinations: DestinationItem[];
  featuredPackages: TourPackage[];
  specialOffer: EditableSpecialOffer;
  brandConfig: EditableBrandConfig;
  pricing: PricingConfig;
  bookings: AdminBookingRecord[];
  inquiries: AdminInquiryRecord[];
  customers: AdminCustomerRecord[];
}

export function getDefaultAdminState(): AdminStoreState {
  return {
    destinations: DESTINATIONS.map((d) => ({ ...d })),
    featuredPackages: FEATURED_PACKAGES.map((p) => ({ ...p })),
    specialOffer: { ...SPECIAL_OFFER },
    brandConfig: {
      companyName: BRAND_CONFIG.companyName,
      ownerName: BRAND_CONFIG.ownerName,
      tagline: BRAND_CONFIG.tagline,
      whatsappDisplay: BRAND_CONFIG.whatsappDisplay,
      whatsappLink: BRAND_CONFIG.whatsappLink,
      email: BRAND_CONFIG.email,
      headquarters: BRAND_CONFIG.headquarters,
      officeHours: BRAND_CONFIG.officeHours,
    },
    pricing: {
      roadVehicles: DEFAULT_PRICING.roadVehicles.map((v) => ({ ...v })),
      airClasses: DEFAULT_PRICING.airClasses.map((a) => ({ ...a })),
      departureCities: [...DEFAULT_PRICING.departureCities],
    },
    bookings: [],
    inquiries: [],
    customers: [],
  };
}

export function slugifyDestinationId(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `destination-${Date.now()}`;
}

export interface DestinationUpsertInput {
  id?: string;
  name: string;
  tagline: string;
  region: DestinationRegion;
  durationDays: number;
  durationLabel: string;
  basePricePKR: number;
  modes: TravelMode[];
  bestTimeToVisit: string;
  imageKey: keyof typeof DEFAULT_IMAGES;
  highlightsText: string;
  /** Uploaded photo URL (e.g. /uploads/abc.jpg). When set it replaces the preset photo. */
  customImageUrl?: string;
  /** One line per day, formatted "Title | Details" (optional). */
  itineraryText?: string;
  /** Comma separated (optional). */
  includedText?: string;
  excludedText?: string;
  /** Optional explicit per-person prices for each travel mode. */
  roadPricePKR?: number;
  airPricePKR?: number;
}

function splitList(text: string | undefined, separator: RegExp): string[] {
  return (text ?? '')
    .split(separator)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseItinerary(text: string | undefined): DestinationItem['itinerary'] {
  return splitList(text, /\r?\n/).map((line, idx) => {
    const [title, ...rest] = line.split('|');
    return {
      day: `Day ${String(idx + 1).padStart(2, '0')}`,
      title: (title ?? '').trim() || `Day ${idx + 1} Highlights`,
      details: rest.join('|').trim() || 'Guided sightseeing with your Pak Tourist coordinator.',
    };
  });
}

export function itineraryToText(itinerary: DestinationItem['itinerary']): string {
  return itinerary.map((i) => `${i.title} | ${i.details}`).join('\n');
}

function resolveDestinationImage(input: DestinationUpsertInput, id: string) {
  const custom = (input.customImageUrl ?? '').trim();
  if (custom) {
    // Unique key so the photo is never swapped by a preset-slot override.
    return { imageKey: `dest-${id}`, defaultImage: custom };
  }
  return {
    imageKey: input.imageKey as string,
    defaultImage: DEFAULT_IMAGES[input.imageKey] ?? DEFAULT_IMAGES.heroNaran,
  };
}

function buildPriceTiers(
  modes: TravelMode[],
  roadPrice: number,
  airPrice: number
): DestinationItem['priceTiers'] {
  return modes.map((mode) => ({
    label: mode === 'air' ? 'By Air Package (Per Person)' : 'By Road Comfort (Per Person)',
    mode,
    pricePKR: mode === 'air' ? airPrice : roadPrice,
  }));
}

export function upsertDestinationRecord(
  current: DestinationItem[],
  input: DestinationUpsertInput
): DestinationItem[] {
  const safeDays = Math.max(1, Math.min(30, Math.floor(input.durationDays || 3)));
  const safePrice = Math.max(1000, Math.round(input.basePricePKR || 15000));
  const safeModes: TravelMode[] = input.modes.length > 0 ? input.modes : ['road'];
  const parsedHighlights = splitList(input.highlightsText, /,/);
  const highlights =
    parsedHighlights.length > 0
      ? parsedHighlights
      : ['Private guided valley transfers', 'Verified scenic hotel stays', '24/7 Pak Tourist support'];
  const itinerary = parseItinerary(input.itineraryText);
  const included = splitList(input.includedText, /,/);
  const excluded = splitList(input.excludedText, /,/);
  const roadPrice = Math.max(1000, Math.round(input.roadPricePKR || safePrice));
  const airPrice = Math.max(1000, Math.round(input.airPricePKR || safePrice + 32000));

  if (input.id) {
    const existingIndex = current.findIndex((d) => d.id === input.id);
    if (existingIndex >= 0) {
      const existing = current[existingIndex];
      const image = resolveDestinationImage(input, existing.id);
      const priceChanged = existing.basePricePKR !== safePrice;
      const modesChanged =
        existing.modes.length !== safeModes.length || safeModes.some((m) => !existing.modes.includes(m));

      // Keep price tiers in sync with the new base price instead of leaving stale numbers behind.
      let priceTiers = existing.priceTiers;
      if (input.roadPricePKR || input.airPricePKR) {
        priceTiers = buildPriceTiers(safeModes, roadPrice, airPrice);
      } else if (priceChanged || modesChanged) {
        const ratio = existing.basePricePKR > 0 ? safePrice / existing.basePricePKR : 1;
        const scaled = existing.priceTiers
          .filter((t) => safeModes.includes(t.mode))
          .map((t) => ({ ...t, pricePKR: Math.round((t.pricePKR * ratio) / 500) * 500 }));
        const missing = safeModes.filter((m) => !scaled.some((t) => t.mode === m));
        priceTiers = [...scaled, ...buildPriceTiers(missing, safePrice, safePrice + 32000)];
      }

      const updated: DestinationItem = {
        ...existing,
        name: input.name.trim(),
        tagline: input.tagline.trim(),
        region: input.region,
        durationDays: safeDays,
        durationLabel: input.durationLabel.trim() || `${safeDays} Days / ${Math.max(1, safeDays - 1)} Nights`,
        basePricePKR: safePrice,
        modes: safeModes,
        bestTimeToVisit: input.bestTimeToVisit.trim() || 'May to October',
        imageKey: image.imageKey,
        defaultImage: image.defaultImage,
        galleryImages: [
          image.defaultImage,
          ...existing.galleryImages.filter((g) => g !== image.defaultImage && g !== existing.defaultImage),
        ],
        highlights,
        itinerary: itinerary.length > 0 ? itinerary : existing.itinerary,
        included: included.length > 0 ? included : existing.included,
        excluded: excluded.length > 0 ? excluded : existing.excluded,
        priceTiers,
      };
      return current.map((d, idx) => (idx === existingIndex ? updated : d));
    }
  }

  let newId = slugifyDestinationId(input.name);
  if (current.some((d) => d.id === newId)) {
    newId = `${newId}-${Date.now().toString().slice(-4)}`;
  }
  const image = resolveDestinationImage(input, newId);

  const created: DestinationItem = {
    id: newId,
    name: input.name.trim(),
    tagline: input.tagline.trim() || 'Guided northern valley escape curated by Pak Tourist',
    region: input.region,
    season: ['Spring', 'Summer', 'Autumn'],
    durationDays: safeDays,
    durationLabel: input.durationLabel.trim() || `${safeDays} Days / ${Math.max(1, safeDays - 1)} Nights`,
    basePricePKR: safePrice,
    // A brand-new spot has no reviews yet; do not invent a rating.
    rating: 0,
    reviewCount: 0,
    modes: safeModes,
    bestTimeToVisit: input.bestTimeToVisit.trim() || 'May to October',
    imageKey: image.imageKey,
    defaultImage: image.defaultImage,
    galleryImages: [image.defaultImage],
    highlights,
    itinerary:
      itinerary.length > 0
        ? itinerary
        : [
            {
              day: 'Day 01',
              title: `Arrival & Valley Check-in at ${input.name.trim()}`,
              details: 'Comfortable departure transfer, scenic stops en route, and hotel check-in.',
            },
            {
              day: 'Day 02',
              title: 'Guided Sightseeing & Excursion',
              details: 'Full-day local highlights exploration with Pak Tourist coordinator.',
            },
          ],
    included:
      included.length > 0
        ? included
        : [
            'Private AC transport with fuel & mountain driver',
            'Verified hotel accommodation & daily breakfast',
            '24/7 WhatsApp assistance from our travel desk',
          ],
    excluded: excluded.length > 0 ? excluded : ['Lunch, dinner & personal snacks', 'Personal adventure tickets'],
    priceTiers: buildPriceTiers(safeModes, roadPrice, airPrice),
  };

  return [created, ...current];
}

export function deleteDestinationRecord(
  current: DestinationItem[],
  id: string
): DestinationItem[] {
  if (current.length <= 1) return current;
  return current.filter((d) => d.id !== id);
}

export function filterBookingRecords(
  bookings: AdminBookingRecord[],
  criteria: { searchQuery: string; status: 'All' | BookingStatus }
): AdminBookingRecord[] {
  const q = criteria.searchQuery.trim().toLowerCase();
  return bookings.filter((b) => {
    if (criteria.status !== 'All' && b.status !== criteria.status) {
      return false;
    }
    if (!q) return true;
    const haystack = `${b.referenceCode} ${b.customerName} ${b.destinationName} ${b.departureCity} ${b.phone} ${b.email}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function computeAdminMetrics(state: Pick<AdminStoreState, 'bookings' | 'inquiries' | 'destinations'> & Partial<AdminStoreState>) {
  const totalBookings = state.bookings.length;
  const pendingBookings = state.bookings.filter((b) => b.status === 'Pending').length;
  const confirmedBookings = state.bookings.filter((b) => b.status === 'Confirmed').length;
  const activePipelinePKR = state.bookings
    .filter((b) => b.status !== 'Cancelled')
    .reduce((sum, b) => sum + b.estimatedTotalPKR, 0);
  const unreadInquiries = state.inquiries.filter((i) => i.status === 'New').length;
  const activeDestinations = state.destinations.length;

  return {
    totalBookings,
    pendingBookings,
    confirmedBookings,
    activePipelinePKR,
    unreadInquiries,
    activeDestinations,
  };
}

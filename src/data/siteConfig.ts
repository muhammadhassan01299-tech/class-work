export type TravelMode = 'road' | 'air';
export type DestinationRegion = 'KPK & Hazara' | 'Gilgit-Baltistan' | 'Azad Kashmir';
export type TravelSeason = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

export interface ItineraryDay { day: string; title: string; details: string }
export interface PriceTier { label: string; mode: TravelMode; pricePKR: number }
export interface DestinationItem {
  id: string; name: string; tagline: string; region: DestinationRegion; season: TravelSeason[];
  durationDays: number; durationLabel: string; basePricePKR: number; rating: number; reviewCount: number;
  modes: TravelMode[]; bestTimeToVisit: string; imageKey: string; defaultImage: string; galleryImages: string[];
  highlights: string[]; itinerary: ItineraryDay[]; included: string[]; excluded: string[]; priceTiers: PriceTier[];
}
export interface TourPackage { id: string; destinationId: string; title: string; description: string; summary?: string; durationLabel: string; pricePKR: number; imageKey: string; defaultImage: string; badge?: string; mode: TravelMode }
export interface RoadVehicleOption { id: string; name: string; capacityPassengers: number; capacity?: number | string; multiplier?: number; dailySurchargePKR: number; description?: string }
export interface AirClassOption { id: string; name: string; perPersonSurchargePKR: number; multiplier?: number; description?: string }
export interface PricingConfig { roadVehicles: RoadVehicleOption[]; airClasses: AirClassOption[]; departureCities: string[] }
export interface GalleryItem { id: string; title: string; location: string; category: 'Mountains' | 'Lakes' | 'Valleys' | 'Culture' | 'Adventure'; image: string; defaultImage: string; imageKey: string; description?: string }

export const DEFAULT_IMAGES = {
  heroNaran: '/src/assets/images/naran_kaghan_hero_1795085596389.jpg',
  hunza: '/src/assets/images/hunza_valley_peaks_1795085595345.jpg',
  skardu: '/src/assets/images/skardu_shangrila_lake_1795085596875.jpg',
  swat: '/src/assets/images/swat_kalam_river_1795085595660.jpg',
  fairyMeadows: '/src/assets/images/fairy_meadows_nanga_1795085596008.jpg',
  neelum: '/src/assets/images/neelum_valley_kashmir_1795085596477.jpg',
} as const;

const makeDestination = (d: Omit<DestinationItem, 'galleryImages' | 'priceTiers'>): DestinationItem => ({
  ...d, galleryImages: [d.defaultImage], priceTiers: d.modes.map((mode) => ({
    mode, label: mode === 'air' ? 'By Air Package (Per Person)' : 'By Road Comfort (Per Person)', pricePKR: mode === 'air' ? d.basePricePKR + 32000 : d.basePricePKR,
  })),
});

export const DESTINATIONS: DestinationItem[] = [
  makeDestination({ id: 'hunza-valley', name: 'Hunza Valley & Attabad Lake', tagline: 'Turquoise lakes, forts and unforgettable mountain light.', region: 'Gilgit-Baltistan', season: ['Spring', 'Summer', 'Autumn'], durationDays: 5, durationLabel: '5 Days / 4 Nights', basePricePKR: 48000, rating: 4.9, reviewCount: 124, modes: ['road', 'air'], bestTimeToVisit: 'April to October', imageKey: 'hunza', defaultImage: DEFAULT_IMAGES.hunza, highlights: ['Attabad Lake cruise', 'Baltit Fort visit', 'Local food and culture'], itinerary: [{ day: 'Day 01', title: 'Arrival in Hunza', details: 'Scenic transfer and hotel check-in.' }, { day: 'Day 02', title: 'Central Hunza', details: 'Explore forts, villages and viewpoints.' }], included: ['Private transport', 'Hotel stay and breakfast', 'Travel desk support'], excluded: ['Lunch and dinner', 'Personal expenses'] }),
  makeDestination({ id: 'skardu-shangrila', name: 'Skardu & Shangrila', tagline: 'High-altitude lakes, deserts and dramatic peaks.', region: 'Gilgit-Baltistan', season: ['Summer', 'Autumn'], durationDays: 6, durationLabel: '6 Days / 5 Nights', basePricePKR: 36000, rating: 4.8, reviewCount: 98, modes: ['road', 'air'], bestTimeToVisit: 'May to October', imageKey: 'skardu', defaultImage: DEFAULT_IMAGES.skardu, highlights: ['Shangrila Lake', 'Deosai plains', 'Mansehra to Skardu road'], itinerary: [{ day: 'Day 01', title: 'Welcome to Skardu', details: 'Airport or road arrival and check-in.' }], included: ['Private transport', 'Breakfast', 'Local coordinator'], excluded: ['Adventure tickets', 'Personal shopping'] }),
  makeDestination({ id: 'swat-kalam', name: 'Swat & Kalam', tagline: 'River valleys, pine forests and cool mountain air.', region: 'KPK & Hazara', season: ['Spring', 'Summer', 'Autumn'], durationDays: 4, durationLabel: '4 Days / 3 Nights', basePricePKR: 22000, rating: 4.7, reviewCount: 87, modes: ['road'], bestTimeToVisit: 'April to October', imageKey: 'swat', defaultImage: DEFAULT_IMAGES.swat, highlights: ['Kalam Valley', 'Malam Jabba', 'Swat River'], itinerary: [{ day: 'Day 01', title: 'Drive to Swat', details: 'Comfortable transfer with scenic stops.' }], included: ['AC transport', 'Hotel and breakfast'], excluded: ['Lunch and dinner'] }),
  makeDestination({ id: 'naran-kaghan', name: 'Naran Kaghan & Saif-ul-Mulook', tagline: 'Lakes, waterfalls and classic northern escapes.', region: 'KPK & Hazara', season: ['Summer'], durationDays: 4, durationLabel: '4 Days / 3 Nights', basePricePKR: 28500, rating: 4.8, reviewCount: 113, modes: ['road'], bestTimeToVisit: 'May to September', imageKey: 'heroNaran', defaultImage: DEFAULT_IMAGES.heroNaran, highlights: ['Lake Saif-ul-Mulook', 'Lulusar Lake', 'Babusar Pass'], itinerary: [{ day: 'Day 01', title: 'Naran arrival', details: 'Mountain drive and check-in.' }], included: ['Transport', 'Hotel and breakfast'], excluded: ['Jeep tickets and meals'] }),
  makeDestination({ id: 'neelum-valley', name: 'Neelum Valley', tagline: 'Emerald rivers and peaceful Kashmir villages.', region: 'Azad Kashmir', season: ['Spring', 'Summer', 'Autumn'], durationDays: 5, durationLabel: '5 Days / 4 Nights', basePricePKR: 26000, rating: 4.8, reviewCount: 76, modes: ['road'], bestTimeToVisit: 'April to October', imageKey: 'neelum', defaultImage: DEFAULT_IMAGES.neelum, highlights: ['Keran', 'Sharda', 'Kel and Arang Kel'], itinerary: [{ day: 'Day 01', title: 'Into Neelum', details: 'Valley road transfer and check-in.' }], included: ['Transport', 'Hotel and breakfast'], excluded: ['Chairlift tickets and meals'] }),
  makeDestination({ id: 'fairy-meadows', name: 'Fairy Meadows', tagline: 'A legendary alpine meadow beneath Nanga Parbat.', region: 'Gilgit-Baltistan', season: ['Summer', 'Autumn'], durationDays: 5, durationLabel: '5 Days / 4 Nights', basePricePKR: 34000, rating: 4.9, reviewCount: 64, modes: ['road'], bestTimeToVisit: 'June to October', imageKey: 'fairyMeadows', defaultImage: DEFAULT_IMAGES.fairyMeadows, highlights: ['Nanga Parbat views', 'Jeep track adventure', 'Alpine meadow stay'], itinerary: [{ day: 'Day 01', title: 'Raikot arrival', details: 'Transfer to the mountain trail.' }], included: ['Transport', 'Hotel and breakfast'], excluded: ['Jeep and trek charges'] }),
];

export const BRAND_CONFIG = { companyName: 'Pak Tourist', ownerName: 'Wali Hassan', tagline: 'Curated journeys across Pakistan', whatsappDisplay: '+92 313 1498344', whatsappLink: 'https://wa.me/923131498344', email: 'hello@paktourist.pk', headquarters: 'Islamabad, Pakistan', officeHours: 'Daily · 9:00 AM – 9:00 PM', logoUrl: null as string | null };
export const SPECIAL_OFFER = { badge: 'Seasonal offer', title: 'Save on your next northern escape', description: 'Book early and unlock a special per-person discount.', discountPerPersonPKR: 5000, promoCode: 'NORTH25' };
export const ROAD_VEHICLES: RoadVehicleOption[] = [{ id: 'car', name: 'Comfort SUV', capacityPassengers: 6, capacity: 6, dailySurchargePKR: 6500 }, { id: 'hiace', name: 'Private Hiace', capacityPassengers: 12, capacity: 12, dailySurchargePKR: 11000 }, { id: 'coaster', name: 'Executive Coaster', capacityPassengers: 20, capacity: 20, dailySurchargePKR: 12000 }];
export const AIR_CLASSES: AirClassOption[] = [{ id: 'economy', name: 'Economy', perPersonSurchargePKR: 32000, multiplier: 1 }, { id: 'business', name: 'Business', perPersonSurchargePKR: 65000, multiplier: 2 }];
export const DEFAULT_PRICING: PricingConfig = { roadVehicles: ROAD_VEHICLES, airClasses: AIR_CLASSES, departureCities: ['Islamabad', 'Lahore', 'Karachi', 'Peshawar'] };
export const FEATURED_PACKAGES: TourPackage[] = DESTINATIONS.slice(0, 3).map((d) => ({ id: `${d.id}-package`, destinationId: d.id, title: `${d.name} Escape`, description: d.tagline, summary: d.tagline, durationLabel: d.durationLabel, pricePKR: d.basePricePKR, imageKey: d.imageKey, defaultImage: d.defaultImage, badge: 'Featured', mode: d.modes[0] }));
export const COMPANY_STATS = [{ label: 'Happy travellers', value: 1200, suffix: '+' }, { label: 'Destinations', value: DESTINATIONS.length, suffix: '' }, { label: 'Years of care', value: 8, suffix: '+' }];
export const TEAM_MEMBERS = [{ id: 'wali-hassan', name: 'Wali Hassan', role: 'Founder & Travel Director', image: DEFAULT_IMAGES.heroNaran, bio: 'A careful travel desk built around safety, clear pricing and local hospitality.', experience: '8+ years in northern travel' }];
export const TESTIMONIALS = [{ id: 'ayesha', rating: 5, quote: 'The whole journey felt safe, warm and beautifully organised.', name: 'Ayesha Khan', city: 'Lahore', trip: 'Hunza Valley' }, { id: 'hamza', rating: 5, quote: 'Our family trip was smooth from the first WhatsApp message.', name: 'Hamza Ali', city: 'Islamabad', trip: 'Skardu' }];
export const STORY_STEPS = [{ id: 'choose', stepNumber: 1, keyword: 'Discover', title: 'Choose your escape', description: 'Browse verified northern destinations.', imageKey: 'hunza', defaultImage: DEFAULT_IMAGES.hunza }, { id: 'plan', stepNumber: 2, keyword: 'Plan', title: 'Plan with confidence', description: 'Get a clear estimate for road or air travel.', imageKey: 'swat', defaultImage: DEFAULT_IMAGES.swat }, { id: 'travel', stepNumber: 3, keyword: 'Travel', title: 'Travel with care', description: 'Our desk stays with you throughout the journey.', imageKey: 'fairyMeadows', defaultImage: DEFAULT_IMAGES.fairyMeadows }];
export const FAQS = [{ id: 'booking', question: 'How do I book?', answer: 'Choose a destination, complete the booking form, and our travel desk will confirm the details.' }, { id: 'price', question: 'Are prices final?', answer: 'Displayed prices are estimates; the final quote is confirmed after dates and availability.' }, { id: 'support', question: 'Do you provide support during travel?', answer: 'Yes, our WhatsApp travel desk remains available during your trip.' }];
export const GALLERY_ITEMS: GalleryItem[] = DESTINATIONS.map((d) => ({ id: d.id, title: d.name, location: d.region, category: d.region === 'Gilgit-Baltistan' ? 'Mountains' : 'Valleys', image: d.defaultImage, defaultImage: d.defaultImage, imageKey: d.imageKey, description: d.tagline }));

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarCheck,
  Compass,
  Edit3,
  Image as ImageIcon,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Tag,
  Trash2,
  Users,
  Wallet,
  FileSpreadsheet,
  LogOut,
  X,
} from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { useMedia } from '../context/MediaContext';
import { useSiteData } from '../context/SiteDataContext';
import {
  DEFAULT_IMAGES,
  type DestinationItem,
  type DestinationRegion,
  type TourPackage,
  type TravelMode,
} from '../data/siteConfig';
import {
  computeAdminMetrics,
  filterBookingRecords,
  itineraryToText,
  type BookingStatus,
  type DestinationUpsertInput,
  type InquiryStatus,
  type InquiryType,
} from '../utils/adminStore';
import { formatPKR } from '../utils/bookingMath';
import { CustomersTab, PricingTab, SettingsTab } from './AdminExtraTabs';
import { errorMessage, uploadImageFile } from '../utils/api';

type AdminTab =
  | 'overview'
  | 'bookings'
  | 'destinations'
  | 'offers'
  | 'inquiries'
  | 'customers'
  | 'pricing'
  | 'settings'
  | 'brand';

interface AdminPageProps {
  onExit: () => void;
  onLogout: () => void;
}

const IMAGE_PRESET_OPTIONS: { key: keyof typeof DEFAULT_IMAGES; label: string }[] = [
  { key: 'heroNaran', label: 'Naran Kaghan & Lake Saif-ul-Mulook' },
  { key: 'hunza', label: 'Hunza Valley Peaks' },
  { key: 'skardu', label: 'Skardu & Shangrila Lake' },
  { key: 'swat', label: 'Swat & Kalam River' },
  { key: 'fairyMeadows', label: 'Fairy Meadows & Nanga Parbat' },
  { key: 'neelum', label: 'Neelum Valley Kashmir' },
];

const REGIONS: DestinationRegion[] = [
  'KPK & Hazara',
  'Gilgit-Baltistan',
  'Azad Kashmir',
];

const BOOKING_STATUSES: BookingStatus[] = [
  'Pending',
  'Confirmed',
  'Completed',
  'Cancelled',
];

const INQUIRY_STATUSES: InquiryStatus[] = ['New', 'Reviewed', 'Resolved'];

function createEmptyDestinationDraft(): DestinationUpsertInput {
  return {
    name: '',
    tagline: '',
    region: 'KPK & Hazara',
    durationDays: 4,
    durationLabel: '4 Days / 3 Nights',
    basePricePKR: 32000,
    modes: ['road'],
    bestTimeToVisit: 'May to October',
    imageKey: 'heroNaran',
    highlightsText: '',
    customImageUrl: '',
    itineraryText: '',
    includedText: '',
    excludedText: '',
    roadPricePKR: undefined,
    airPricePKR: undefined,
  };
}

function customerWhatsAppDigits(phone: string): string {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = `92${d.slice(1)}`;
  return d;
}

export function AdminPage({ onExit, onLogout }: AdminPageProps) {
  const {
    destinations,
    featuredPackages,
    specialOffer,
    brandConfig,
    bookings,
    inquiries,
    updateBookingStatus,
    deleteBooking,
    upsertDestination,
    deleteDestination,
    updateFeaturedPackage,
    updateSpecialOffer,
    updateBrandConfig,
    updateInquiryStatus,
    deleteInquiry,
    customers,
    pricing,
    updatePricing,
    deleteCustomer,
    saveOwnerWhatsapp,
    exportRecordsNow,
    ownerSettings,
    exportInfo,
  } = useSiteData();

  const { logoUrl, imageOverrides, openUploader, resolveImage } = useMedia();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Bookings filter state
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'All' | BookingStatus>('All');

  // Destinations filter & modal editor state
  const [destSearch, setDestSearch] = useState('');
  const [destRegionFilter, setDestRegionFilter] = useState<'All' | DestinationRegion>('All');
  const [isDestEditorOpen, setIsDestEditorOpen] = useState(false);
  const [destDraft, setDestDraft] = useState<DestinationUpsertInput>(createEmptyDestinationDraft);
  const [destFormError, setDestFormError] = useState<string | null>(null);

  // Inquiries filter state
  const [inquiryTypeFilter, setInquiryTypeFilter] = useState<'All' | InquiryType>('All');

  // Offers & Packages editable forms
  const [offerDraft, setOfferDraft] = useState(specialOffer);
  const [offerSavedNotice, setOfferSavedNotice] = useState<string | null>(null);
  const [editingPkg, setEditingPkg] = useState<TourPackage | null>(null);

  // Brand editable form
  const [brandDraft, setBrandDraft] = useState(brandConfig);
  const [brandSavedNotice, setBrandSavedNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  /** Runs a server action and shows a clear success / error message. */
  const run = async (action: () => Promise<unknown>, successText?: string): Promise<boolean> => {
    try {
      await action();
      if (successText) setToast({ kind: 'ok', text: successText });
      return true;
    } catch (err) {
      setToast({ kind: 'error', text: errorMessage(err) });
      return false;
    }
  };

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setOfferDraft(specialOffer);
  }, [specialOffer]);

  useEffect(() => {
    setBrandDraft(brandConfig);
  }, [brandConfig]);

  const metrics = useMemo(
    () =>
      computeAdminMetrics({
        destinations,
        featuredPackages,
        specialOffer,
        brandConfig,
        bookings,
        inquiries,
      }),
    [destinations, featuredPackages, specialOffer, brandConfig, bookings, inquiries]
  );

  const filteredBookings = useMemo(
    () =>
      filterBookingRecords(bookings, {
        searchQuery: bookingSearch,
        status: bookingStatusFilter,
      }),
    [bookings, bookingSearch, bookingStatusFilter]
  );

  const filteredDestinations = useMemo(() => {
    const q = destSearch.trim().toLowerCase();
    return destinations.filter((d) => {
      if (destRegionFilter !== 'All' && d.region !== destRegionFilter) return false;
      if (!q) return true;
      return `${d.name} ${d.region} ${d.tagline}`.toLowerCase().includes(q);
    });
  }, [destinations, destSearch, destRegionFilter]);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((i) =>
      inquiryTypeFilter === 'All' ? true : i.type === inquiryTypeFilter
    );
  }, [inquiries, inquiryTypeFilter]);

  const openAddDestination = () => {
    setDestDraft(createEmptyDestinationDraft());
    setDestFormError(null);
    setIsDestEditorOpen(true);
  };

  const openEditDestination = (dest: DestinationItem) => {
    const validKey = (Object.keys(DEFAULT_IMAGES).includes(dest.imageKey)
      ? dest.imageKey
      : 'heroNaran') as keyof typeof DEFAULT_IMAGES;
    setDestDraft({
      id: dest.id,
      name: dest.name,
      tagline: dest.tagline,
      region: dest.region,
      durationDays: dest.durationDays,
      durationLabel: dest.durationLabel,
      basePricePKR: dest.basePricePKR,
      modes: [...dest.modes],
      bestTimeToVisit: dest.bestTimeToVisit,
      imageKey: validKey,
      highlightsText: dest.highlights.join(', '),
      customImageUrl: dest.imageKey.startsWith('dest-') ? dest.defaultImage : '',
      itineraryText: itineraryToText(dest.itinerary),
      includedText: dest.included.join(', '),
      excludedText: dest.excluded.join(', '),
    });
    setDestFormError(null);
    setIsDestEditorOpen(true);
  };

  const handleSaveDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (destDraft.name.trim().length < 3) {
      setDestFormError('Please enter a destination name (at least 3 characters).');
      return;
    }
    if (!Number.isFinite(destDraft.basePricePKR) || destDraft.basePricePKR < 1000) {
      setDestFormError('Base price must be at least PKR 1,000.');
      return;
    }
    if (destDraft.modes.length === 0) {
      setDestFormError('Select at least one travel mode (By Road or By Air).');
      return;
    }
    setDestFormError(null);
    const ok = await run(
      () => upsertDestination(destDraft),
      `“${destDraft.name.trim()}” saved. It is now live on the website.`
    );
    if (ok) {
      setIsDestEditorOpen(false);
      setActiveTab('destinations');
    } else {
      setDestFormError('Could not save. See the message at the top of the page.');
    }
  };

  const handleDestImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadImageFile(file);
      setDestDraft((prev) => ({ ...prev, customImageUrl: url }));
    } catch (err) {
      setDestFormError(errorMessage(err, 'Image upload failed.'));
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleDraftMode = (mode: TravelMode) => {
    setDestDraft((prev) => {
      const exists = prev.modes.includes(mode);
      const nextModes = exists
        ? prev.modes.filter((m) => m !== mode)
        : [...prev.modes, mode];
      return { ...prev, modes: nextModes };
    });
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() => updateSpecialOffer({
      ...offerDraft,
      promoCode: offerDraft.promoCode.trim().toUpperCase() || 'PAKPEAKS',
      discountPerPersonPKR: Math.max(0, Math.round(offerDraft.discountPerPersonPKR || 0)),
    }));
    if (ok) setOfferSavedNotice('Seasonal offer updated live on Home & Booking calculator.');
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() => updateBrandConfig(brandDraft));
    if (ok) setBrandSavedNotice('Brand & contact details updated across the website.');
  };

  const NAV_TABS: {
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    countText?: string;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'bookings',
      label: 'Bookings',
      icon: CalendarCheck,
      countText: String(metrics.pendingBookings),
    },
    {
      id: 'destinations',
      label: 'Destinations',
      icon: Compass,
      countText: String(metrics.activeDestinations),
    },
    { id: 'offers', label: 'Offers & Packages', icon: Tag },
    {
      id: 'inquiries',
      label: 'Inquiries',
      icon: Mail,
      countText: String(metrics.unreadInquiries),
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      countText: String(customers.length),
    },
    { id: 'pricing', label: 'Vehicle & Flight Prices', icon: Wallet },
    { id: 'settings', label: 'WhatsApp & Excel', icon: FileSpreadsheet },
    { id: 'brand', label: 'Brand & Media', icon: Settings },
  ];

  const activeTabTitle: Record<AdminTab, string> = {
    overview: 'Operations Overview',
    bookings: 'Customer Bookings',
    destinations: 'Destinations & PKR Pricing',
    offers: 'Seasonal Offers & Featured Packages',
    inquiries: 'Customer Inquiries & Newsletter',
    customers: 'Registered Customers',
    pricing: 'Vehicle & Flight Prices',
    settings: 'Owner WhatsApp & Excel Records',
    brand: 'Brand Desk & Media Assets',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      {/* Top Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-[#90E0EF]">
        <div>
          <p className="text-xs font-bold text-[#0077B6] mb-1">
            {brandConfig.companyName} / Admin Desk · Managed by {brandConfig.ownerName}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#03045E]">
            {activeTabTitle[activeTab]}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#90E0EF] bg-white hover:bg-[#CAF0F8]/70 text-sm font-bold text-[#03045E] transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>View Website</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#90E0EF] bg-white hover:bg-[#CAF0F8]/70 text-sm font-bold text-[#03045E] transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Log Out</span>
          </button>
          <button
            type="button"
            onClick={openAddDestination}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Destination</span>
          </button>
        </div>
      </div>

      {/* Workspace Grid: 240px Sidebar + Main Panel */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <aside className="w-full lg:w-64 shrink-0 glass-card rounded-3xl p-4 bg-white/90">
          <nav
            aria-label="Admin sections"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5"
          >
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center justify-between gap-1.5 px-2.5 sm:px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors text-left whitespace-nowrap ${
                    isActive
                      ? 'bg-[#023E8A] text-white'
                      : 'text-[#03045E] hover:bg-[#CAF0F8]/80'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{tab.label}</span>
                  </span>
                  {tab.countText !== undefined && (
                    <span
                      className={`text-xs tabular-nums ${
                        isActive ? 'text-[#CAF0F8]' : 'text-[#0077B6]'
                      }`}
                    >
                      {tab.countText}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-5 pt-4 border-t border-[#CAF0F8] space-y-2.5 px-1">
            <p className="text-xs font-semibold text-[#0077B6]">
              Every change is saved on the server and appears on the public website for all visitors.
            </p>
            <button
              type="button"
              onClick={openUploader}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-[#90E0EF] bg-[#CAF0F8]/55 hover:bg-[#ADE8F4] text-xs font-bold text-[#023E8A] transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Upload Logo &amp; Photos</span>
            </button>
          </div>
        </aside>

        {/* Main Panel */}
        <section className="flex-1 min-w-0 w-full space-y-6">
          {toast && (
            <p
              role={toast.kind === 'error' ? 'alert' : 'status'}
              className={`p-3.5 rounded-xl border text-sm font-bold ${
                toast.kind === 'error'
                  ? 'bg-red-50 border-red-300 text-red-800'
                  : 'bg-[#CAF0F8] border-[#00B4D8] text-[#023E8A]'
              }`}
            >
              {toast.text}
            </p>
          )}
          {/* ==================== TAB 1: OVERVIEW ==================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4 KPI Summary Cells */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="glass-card rounded-2xl p-5 bg-white/90">
                  <p className="text-xs font-bold text-[#0077B6]">Total Bookings</p>
                  <p className="text-3xl font-bold text-[#03045E] tabular-nums mt-1">
                    {metrics.totalBookings}
                  </p>
                  <p className="text-xs text-[#03045E]/75 mt-1 tabular-nums">
                    {metrics.confirmedBookings} confirmed · {metrics.pendingBookings} pending
                  </p>
                </div>

                <div className="glass-card rounded-2xl p-5 bg-white/90">
                  <p className="text-xs font-bold text-[#0077B6]">Pipeline Revenue</p>
                  <p className="text-xl sm:text-2xl font-bold text-[#023E8A] tabular-nums whitespace-nowrap mt-1.5">
                    {formatPKR(metrics.activePipelinePKR)}
                  </p>
                  <p className="text-xs text-[#03045E]/75 mt-1">
                    Active estimated trip value
                  </p>
                </div>

                <div className="glass-card rounded-2xl p-5 bg-white/90">
                  <p className="text-xs font-bold text-[#0077B6]">Listed Destinations</p>
                  <p className="text-3xl font-bold text-[#03045E] tabular-nums mt-1">
                    {metrics.activeDestinations}
                  </p>
                  <p className="text-xs text-[#03045E]/75 mt-1">
                    Live in Quick Search &amp; Booking
                  </p>
                </div>

                <div className="glass-card rounded-2xl p-5 bg-white/90">
                  <p className="text-xs font-bold text-[#0077B6]">New Inquiries</p>
                  <p className="text-3xl font-bold text-[#03045E] tabular-nums mt-1">
                    {metrics.unreadInquiries}
                  </p>
                  <p className="text-xs text-[#03045E]/75 mt-1 tabular-nums">
                    Promo active: {specialOffer.promoCode}
                  </p>
                </div>
              </div>

              {/* Recent Bookings Snapshot */}
              <div className="glass-card rounded-3xl bg-white/95 overflow-hidden">
                <div className="px-6 py-4 border-b border-[#CAF0F8] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#03045E]">Recent Bookings</h2>
                    <p className="text-xs text-[#0077B6]">
                      Confirm requests directly or jump to full Bookings queue
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bookings')}
                    className="text-xs font-bold text-[#023E8A] hover:underline"
                  >
                    Manage All Bookings
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#CAF0F8] text-xs font-bold text-[#0077B6] bg-[#CAF0F8]/35">
                        <th className="py-3 px-4">Ref</th>
                        <th className="py-3 px-4">Traveller</th>
                        <th className="py-3 px-4">Destination</th>
                        <th className="py-3 px-4">Date &amp; Guests</th>
                        <th className="py-3 px-4 text-right">Total</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.slice(0, 5).map((b) => (
                        <tr
                          key={b.id}
                          className="border-b border-[#CAF0F8]/70 last:border-b-0 hover:bg-[#CAF0F8]/25 transition-colors"
                        >
                          <td className="py-3 px-4 font-bold text-[#023E8A] tabular-nums whitespace-nowrap">
                            {b.referenceCode}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-[#03045E] block">
                              {b.customerName}
                            </span>
                            <span className="text-xs text-[#0077B6] tabular-nums">{b.phone}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-[#03045E] block">
                              {b.destinationName}
                            </span>
                            <span className="text-xs text-[#0077B6]">{b.modeLabel}</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-[#03045E] tabular-nums whitespace-nowrap">
                            {b.travelDate} · {b.travellers} guests
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#023E8A] tabular-nums whitespace-nowrap">
                            {formatPKR(b.estimatedTotalPKR)}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              aria-label={`Status for ${b.referenceCode}`}
                              value={b.status}
                              onChange={(e) =>
                                void run(() => updateBookingStatus(b.id, e.target.value as BookingStatus))
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-[#90E0EF] bg-white text-xs font-bold text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                            >
                              {BOOKING_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Actions Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={openAddDestination}
                  className="glass-card rounded-2xl p-5 bg-white/90 hover:border-[#0077B6] text-left transition-colors"
                >
                  <p className="text-sm font-bold text-[#03045E] mb-1">
                    Add New Tour Destination
                  </p>
                  <p className="text-xs text-[#0077B6]">
                    Publish another northern valley with custom PKR pricing and modes.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOfferDraft(specialOffer);
                    setActiveTab('offers');
                  }}
                  className="glass-card rounded-2xl p-5 bg-white/90 hover:border-[#0077B6] text-left transition-colors"
                >
                  <p className="text-sm font-bold text-[#03045E] mb-1">
                    Update Seasonal Promo ({specialOffer.promoCode})
                  </p>
                  <p className="text-xs text-[#0077B6]">
                    Discount currently {formatPKR(specialOffer.discountPerPersonPKR)} per person.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('inquiries')}
                  className="glass-card rounded-2xl p-5 bg-white/90 hover:border-[#0077B6] text-left transition-colors"
                >
                  <p className="text-sm font-bold text-[#03045E] mb-1">
                    Review Customer Inquiries ({metrics.unreadInquiries} new)
                  </p>
                  <p className="text-xs text-[#0077B6]">
                    Includes contact page messages and seasonal newsletter signups.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: BOOKINGS ==================== */}
          {activeTab === 'bookings' && (
            <div className="glass-card rounded-3xl bg-white/95 overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-[#CAF0F8] space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search
                      className="w-4 h-4 text-[#0077B6] absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      aria-label="Search bookings"
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      placeholder="Search by ref code, name, destination, city..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['All', ...BOOKING_STATUSES] as ('All' | BookingStatus)[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setBookingStatusFilter(status)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                          bookingStatusFilter === status
                            ? 'bg-[#023E8A] text-white'
                            : 'bg-[#CAF0F8] text-[#03045E] hover:bg-[#ADE8F4]'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <p className="text-lg font-bold text-[#03045E]">
                    No bookings match your search
                  </p>
                  <p className="text-sm text-[#0077B6]">
                    New reservations confirmed on the Booking page appear here automatically.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingSearch('');
                      setBookingStatusFilter('All');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#023E8A] text-white text-xs font-bold glossy-btn"
                  >
                    Show All Bookings
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#CAF0F8] text-xs font-bold text-[#0077B6] bg-[#CAF0F8]/35">
                        <th className="py-3 px-4">Reference</th>
                        <th className="py-3 px-4">Traveller</th>
                        <th className="py-3 px-4">Destination &amp; Mode</th>
                        <th className="py-3 px-4">Schedule</th>
                        <th className="py-3 px-4 text-right">Estimate</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((b) => (
                        <tr
                          key={b.id}
                          className="border-b border-[#CAF0F8]/70 last:border-b-0 hover:bg-[#CAF0F8]/25 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-bold text-[#023E8A] tabular-nums whitespace-nowrap">
                            {b.referenceCode}
                            <span className="block text-[11px] font-normal text-[#0077B6]">
                              {b.createdAt}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-[#03045E] block">
                              {b.customerName}
                            </span>
                            <span className="text-xs text-[#0077B6] tabular-nums block">
                              {b.phone} · {b.email}
                            </span>
                            {b.notes && (
                              <span className="text-xs text-[#03045E]/75 block mt-0.5">
                                Note: {b.notes}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-[#03045E] block">
                              {b.destinationName}
                            </span>
                            <span className="text-xs text-[#0077B6]">
                              From {b.departureCity} · {b.modeLabel}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#03045E] tabular-nums whitespace-nowrap">
                            {b.travelDate}
                            <span className="block text-[#0077B6]">
                              {b.travellers} {b.travellers === 1 ? 'Person' : 'Persons'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#023E8A] tabular-nums whitespace-nowrap">
                            {formatPKR(b.estimatedTotalPKR)}
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              aria-label={`Update status for ${b.referenceCode}`}
                              value={b.status}
                              onChange={(e) =>
                                updateBookingStatus(b.id, e.target.value as BookingStatus)
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-[#90E0EF] bg-white text-xs font-bold text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                            >
                              {BOOKING_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <a
                                href={`https://wa.me/${customerWhatsAppDigits(b.phone)}?text=${encodeURIComponent(
                                  `Assalam-o-Alaikum ${b.customerName}, regarding your Pak Tourist booking ${b.referenceCode} (${b.destinationName} on ${b.travelDate}).`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Message ${b.customerName} on WhatsApp`}
                                className="p-2 rounded-lg border border-[#90E0EF] text-[#0077B6] hover:bg-[#CAF0F8] transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete booking ${b.referenceCode}?`)) void run(() => deleteBooking(b.id));
                                }}
                                aria-label={`Delete booking ${b.referenceCode}`}
                                className="p-2 rounded-lg border border-[#90E0EF] text-[#023E8A] hover:bg-[#ADE8F4]/60 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 3: DESTINATIONS ==================== */}
          {activeTab === 'destinations' && (
            <div className="glass-card rounded-3xl bg-white/95 overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-[#CAF0F8] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search
                      className="w-4 h-4 text-[#0077B6] absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      aria-label="Search destinations catalog"
                      value={destSearch}
                      onChange={(e) => setDestSearch(e.target.value)}
                      placeholder="Filter destinations..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                    />
                  </div>
                  <select
                    aria-label="Filter destinations by region"
                    value={destRegionFilter}
                    onChange={(e) =>
                      setDestRegionFilter(e.target.value as 'All' | DestinationRegion)
                    }
                    className="px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  >
                    <option value="All">All Regions</option>
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={openAddDestination}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#023E8A] text-white text-xs font-bold glossy-btn whitespace-nowrap self-start md:self-auto"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>New Destination</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#CAF0F8] text-xs font-bold text-[#0077B6] bg-[#CAF0F8]/35">
                      <th className="py-3 px-3.5">Destination</th>
                      <th className="py-3 px-3">Region</th>
                      <th className="py-3 px-3">Duration</th>
                      <th className="py-3 px-3">Modes</th>
                      <th className="py-3 px-3 text-right">Base Price</th>
                      <th className="py-3 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDestinations.map((dest) => (
                      <tr
                        key={dest.id}
                        className="border-b border-[#CAF0F8]/70 last:border-b-0 hover:bg-[#CAF0F8]/25 transition-colors"
                      >
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-11 h-8 rounded-lg overflow-hidden shrink-0 border border-[#90E0EF]">
                              <ResilientImage
                                src={resolveImage(dest.imageKey, dest.defaultImage)}
                                alt={dest.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-[#03045E] block truncate max-w-[180px] xl:max-w-[230px]">
                                {dest.name}
                              </span>
                              <span className="text-xs text-[#0077B6] block truncate max-w-[180px] xl:max-w-[230px]">
                                {dest.tagline}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs font-semibold text-[#03045E] whitespace-nowrap">
                          {dest.region}
                        </td>
                        <td className="py-3 px-3 text-xs text-[#0077B6] tabular-nums whitespace-nowrap">
                          {dest.durationLabel}
                        </td>
                        <td className="py-3 px-3 text-xs font-semibold text-[#03045E] whitespace-nowrap">
                          {dest.modes
                            .map((m) => (m === 'air' ? 'By Air' : 'By Road'))
                            .join(' · ')}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#023E8A] tabular-nums whitespace-nowrap">
                          {formatPKR(dest.basePricePKR)}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditDestination(dest)}
                              aria-label={`Edit ${dest.name}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#90E0EF] text-xs font-bold text-[#023E8A] hover:bg-[#CAF0F8] transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              disabled={destinations.length <= 1}
                              onClick={() => {
                                if (window.confirm(`Delete “${dest.name}”?`)) void run(() => deleteDestination(dest.id));
                              }}
                              aria-label={`Delete ${dest.name}`}
                              className="p-1.5 rounded-lg border border-[#90E0EF] text-[#023E8A] hover:bg-[#ADE8F4]/60 disabled:opacity-40 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== TAB 4: OFFERS & PACKAGES ==================== */}
          {activeTab === 'offers' && (
            <div className="space-y-6">
              {/* Seasonal Offer Form */}
              <form
                onSubmit={handleSaveOffer}
                className="glass-card rounded-3xl p-6 sm:p-8 bg-white/95 space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-[#03045E]">
                      Seasonal Offer &amp; Promo Code
                    </h2>
                    <p className="text-xs text-[#0077B6]">
                      Controls the Home page promo banner and automatic per-person discount in the PKR Booking Calculator.
                    </p>
                  </div>
                </div>

                {offerSavedNotice && (
                  <p
                    role="status"
                    className="p-3 rounded-xl bg-[#CAF0F8]/70 border border-[#00B4D8] text-xs font-bold text-[#023E8A]"
                  >
                    {offerSavedNotice}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="offer-badge" className="block text-xs font-bold text-[#023E8A] mb-1">
                      Offer Kicker
                    </label>
                    <input
                      id="offer-badge"
                      type="text"
                      value={offerDraft.badge}
                      onChange={(e) => setOfferDraft({ ...offerDraft, badge: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                    />
                  </div>
                  <div>
                    <label htmlFor="offer-code" className="block text-xs font-bold text-[#023E8A] mb-1">
                      Promo Code
                    </label>
                    <input
                      id="offer-code"
                      type="text"
                      value={offerDraft.promoCode}
                      onChange={(e) =>
                        setOfferDraft({ ...offerDraft, promoCode: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm font-bold text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="offer-discount"
                      className="block text-xs font-bold text-[#023E8A] mb-1"
                    >
                      Discount / Person (PKR)
                    </label>
                    <input
                      id="offer-discount"
                      type="number"
                      min={0}
                      step={500}
                      value={offerDraft.discountPerPersonPKR}
                      onChange={(e) =>
                        setOfferDraft({
                          ...offerDraft,
                          discountPerPersonPKR: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] tabular-nums focus:outline-none focus:border-[#0077B6]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="offer-title" className="block text-xs font-bold text-[#023E8A] mb-1">
                    Banner Headline
                  </label>
                  <input
                    id="offer-title"
                    type="text"
                    value={offerDraft.title}
                    onChange={(e) => setOfferDraft({ ...offerDraft, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  />
                </div>

                <div>
                  <label htmlFor="offer-desc" className="block text-xs font-bold text-[#023E8A] mb-1">
                    Offer Description
                  </label>
                  <textarea
                    id="offer-desc"
                    rows={2}
                    value={offerDraft.description}
                    onChange={(e) =>
                      setOfferDraft({ ...offerDraft, description: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn"
                >
                  Save Seasonal Offer
                </button>
              </form>

              {/* Featured Tour Packages */}
              <div className="glass-card rounded-3xl p-6 sm:p-8 bg-white/95 space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[#03045E]">Featured Home Tour Packages</h2>
                  <p className="text-xs text-[#0077B6]">
                    Update prices or summaries displayed in the Featured Tour Packages section.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {featuredPackages.map((pkg) => {
                    const isEditing = editingPkg?.id === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        className="rounded-2xl border border-[#90E0EF] bg-[#CAF0F8]/25 p-4 space-y-3"
                      >
                        {isEditing && editingPkg ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              aria-label="Package title"
                              value={editingPkg.title}
                              onChange={(e) =>
                                setEditingPkg({ ...editingPkg, title: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-[#90E0EF] bg-white text-sm font-bold text-[#03045E]"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                aria-label="Package duration label"
                                value={editingPkg.durationLabel}
                                onChange={(e) =>
                                  setEditingPkg({ ...editingPkg, durationLabel: e.target.value })
                                }
                                className="px-3 py-2 rounded-xl border border-[#90E0EF] bg-white text-xs text-[#03045E]"
                              />
                              <input
                                type="number"
                                aria-label="Package price PKR"
                                min={1000}
                                step={500}
                                value={editingPkg.pricePKR}
                                onChange={(e) =>
                                  setEditingPkg({
                                    ...editingPkg,
                                    pricePKR: Number(e.target.value) || 1000,
                                  })
                                }
                                className="px-3 py-2 rounded-xl border border-[#90E0EF] bg-white text-xs text-[#03045E] tabular-nums"
                              />
                            </div>
                            <textarea
                              rows={2}
                              aria-label="Package summary"
                              value={editingPkg.summary}
                              onChange={(e) =>
                                setEditingPkg({ ...editingPkg, summary: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-[#90E0EF] bg-white text-xs text-[#03045E]"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  void run(() => updateFeaturedPackage(editingPkg), 'Package saved.').then((ok) => {
                                    if (ok) setEditingPkg(null);
                                  });
                                }}
                                className="px-4 py-1.5 rounded-xl bg-[#023E8A] text-white text-xs font-bold"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPkg(null)}
                                className="px-4 py-1.5 rounded-xl border border-[#90E0EF] bg-white text-xs font-bold text-[#03045E]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold text-[#0077B6]">
                                  {pkg.durationLabel}
                                </p>
                                <h3 className="text-base font-bold text-[#03045E]">{pkg.title}</h3>
                              </div>
                              <span className="text-sm font-bold text-[#023E8A] tabular-nums whitespace-nowrap">
                                {formatPKR(pkg.pricePKR)}
                              </span>
                            </div>
                            <p className="text-xs text-[#03045E]/80 mt-1.5 leading-relaxed">
                              {pkg.summary}
                            </p>
                            <button
                              type="button"
                              onClick={() => setEditingPkg({ ...pkg })}
                              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#90E0EF] bg-white hover:bg-[#CAF0F8] text-xs font-bold text-[#023E8A]"
                            >
                              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Edit Package</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 5: INQUIRIES ==================== */}
          {activeTab === 'inquiries' && (
            <div className="glass-card rounded-3xl bg-white/95 overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-[#CAF0F8] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#03045E]">
                    Customer Inquiries &amp; Newsletter Leads
                  </h2>
                  <p className="text-xs text-[#0077B6]">
                    Submissions from the Contact form and Home newsletter box appear here live.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {(
                    [
                      ['All', 'All Leads'],
                      ['contact', 'Contact Form'],
                      ['newsletter', 'Newsletter'],
                    ] as ['All' | InquiryType, string][]
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setInquiryTypeFilter(val)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        inquiryTypeFilter === val
                          ? 'bg-[#023E8A] text-white'
                          : 'bg-[#CAF0F8] text-[#03045E] hover:bg-[#ADE8F4]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredInquiries.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-lg font-bold text-[#03045E]">No inquiries in this view</p>
                  <p className="text-xs text-[#0077B6] mt-1">
                    Contact submissions and newsletter signups will be listed here automatically.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#CAF0F8]">
                  {filteredInquiries.map((inq) => (
                    <div
                      key={inq.id}
                      className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#CAF0F8]/20 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0077B6] tabular-nums">
                          {inq.type === 'newsletter' ? 'Newsletter Subscription' : 'Contact Inquiry'} ·{' '}
                          {inq.createdAt} · Status: {inq.status}
                        </p>
                        <h3 className="text-base font-bold text-[#03045E]">
                          {inq.name}{' '}
                          <span className="font-normal text-sm text-[#0077B6]">
                            ({inq.email}
                            {inq.phone !== 'Not provided' ? ` · ${inq.phone}` : ''})
                          </span>
                        </h3>
                        <p className="text-sm text-[#03045E]/85 leading-relaxed">{inq.message}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          aria-label={`Status for inquiry from ${inq.name}`}
                          value={inq.status}
                          onChange={(e) =>
                            void run(() => updateInquiryStatus(inq.id, e.target.value as InquiryStatus))
                          }
                          className="px-3 py-1.5 rounded-lg border border-[#90E0EF] bg-white text-xs font-bold text-[#03045E]"
                        >
                          {INQUIRY_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this inquiry?')) void run(() => deleteInquiry(inq.id));
                          }}
                          aria-label={`Delete inquiry from ${inq.name}`}
                          className="p-2 rounded-lg border border-[#90E0EF] text-[#023E8A] hover:bg-[#ADE8F4]/60"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 6: BRAND & MEDIA ==================== */}
          {activeTab === 'customers' && (
            <CustomersTab
              customers={customers}
              onDelete={(id) => run(() => deleteCustomer(id), 'Customer removed.')}
            />
          )}

          {activeTab === 'pricing' && (
            <PricingTab
              pricing={pricing}
              onSave={(next) => run(() => updatePricing(next), 'Prices saved. The booking calculator now uses them.')}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              ownerSettings={ownerSettings}
              exportInfo={exportInfo}
              onSaveWhatsapp={async (value) => {
                try {
                  const r = await saveOwnerWhatsapp(value);
                  setToast({
                    kind: r.envSaved && r.exportOk ? 'ok' : 'error',
                    text: r.envSaved
                      ? r.exportOk
                        ? 'Saved! WhatsApp number written to .env and all records exported to Excel.'
                        : 'WhatsApp number saved to .env, but the Excel file could not be written (close it if it is open in Excel).'
                      : `Number is active now but could not be written to .env (${r.envError ?? 'unknown error'}). Edit OWNER_WHATSAPP in .env manually.`,
                  });
                } catch (err) {
                  setToast({ kind: 'error', text: errorMessage(err) });
                }
              }}
              onExportNow={() =>
                run(async () => {
                  const r = await exportRecordsNow();
                  setToast({ kind: 'ok', text: `Excel file updated in the “${r.folder}” folder.` });
                })
              }
            />
          )}

          {activeTab === 'brand' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveBrand}
                className="glass-card rounded-3xl p-6 sm:p-8 bg-white/95 space-y-5"
              >
                <div>
                  <h2 className="text-xl font-bold text-[#03045E]">Brand &amp; Contact Settings</h2>
                  <p className="text-xs text-[#0077B6]">
                    Updates Navbar, Footer, WhatsApp button, About, and Contact pages across the app.
                  </p>
                </div>

                {brandSavedNotice && (
                  <p
                    role="status"
                    className="p-3 rounded-xl bg-[#CAF0F8]/70 border border-[#00B4D8] text-xs font-bold text-[#023E8A]"
                  >
                    {brandSavedNotice}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand-company" className="block text-xs font-bold text-[#023E8A] mb-1">
                      Company Name
                    </label>
                    <input
                      id="brand-company"
                      type="text"
                      value={brandDraft.companyName}
                      onChange={(e) =>
                        setBrandDraft({ ...brandDraft, companyName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]"
                    />
                  </div>
                  <div>
                    <label htmlFor="brand-owner" className="block text-xs font-bold text-[#023E8A] mb-1">
                      Owner / Operations Lead
                    </label>
                    <input
                      id="brand-owner"
                      type="text"
                      value={brandDraft.ownerName}
                      onChange={(e) =>
                        setBrandDraft({ ...brandDraft, ownerName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]"
                    />
                  </div>
                  <div>
                    <label htmlFor="brand-wa" className="block text-xs font-bold text-[#023E8A] mb-1">
                      Owner WhatsApp Number
                    </label>
                    <input
                      id="brand-wa"
                      type="text"
                      readOnly
                      value={brandDraft.whatsappDisplay}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-[#CAF0F8]/40 text-sm text-[#03045E] tabular-nums"
                    />
                    <p className="text-[11px] text-[#0077B6] mt-1">
                      Change it in the “WhatsApp &amp; Excel” tab (saved to the .env file).
                    </p>
                  </div>
                  <div>
                    <label htmlFor="brand-email" className="block text-xs font-bold text-[#023E8A] mb-1">
                      Contact Email
                    </label>
                    <input
                      id="brand-email"
                      type="email"
                      value={brandDraft.email}
                      onChange={(e) => setBrandDraft({ ...brandDraft, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]"
                    />
                  </div>
                  <div>
                    <label htmlFor="brand-hq" className="block text-xs font-bold text-[#023E8A] mb-1">
                      Office Headquarters
                    </label>
                    <input
                      id="brand-hq"
                      type="text"
                      value={brandDraft.headquarters}
                      onChange={(e) =>
                        setBrandDraft({ ...brandDraft, headquarters: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]"
                    />
                  </div>
                  <div>
                    <label htmlFor="brand-hours" className="block text-xs font-bold text-[#023E8A] mb-1">
                      Office Hours
                    </label>
                    <input
                      id="brand-hours"
                      type="text"
                      value={brandDraft.officeHours}
                      onChange={(e) =>
                        setBrandDraft({ ...brandDraft, officeHours: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn"
                >
                  Save Brand Settings
                </button>
              </form>

              {/* Media & Reset Controls */}
              <div className="glass-card rounded-3xl p-6 sm:p-8 bg-white/95 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[#03045E]">
                    Logo &amp; Custom Photography
                  </h3>
                  <p className="text-xs text-[#0077B6] mt-1 tabular-nums">
                    Logo: {logoUrl ? 'Custom logo uploaded' : 'Placeholder slot active'} · Custom
                    photo overrides: {Object.keys(imageOverrides).length}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={openUploader}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#023E8A] text-white text-xs font-bold glossy-btn"
                  >
                    <ImageIcon className="w-4 h-4" aria-hidden="true" />
                    <span>Open Media Uploader</span>
                  </button>

                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Destination Add / Edit Modal */}
      {isDestEditorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dest-editor-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#03045E]/55 backdrop-blur-sm overflow-y-auto"
        >
          <div className="w-full max-w-2xl glass-card rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#CAF0F8] pb-3">
              <h2 id="dest-editor-title" className="text-2xl font-bold text-[#03045E]">
                {destDraft.id ? 'Edit Destination' : 'Add New Destination'}
              </h2>
              <button
                type="button"
                onClick={() => setIsDestEditorOpen(false)}
                aria-label="Close destination editor"
                className="p-2 rounded-xl border border-[#90E0EF] text-[#03045E] hover:bg-[#CAF0F8]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {destFormError && (
              <p
                role="alert"
                className="p-3 rounded-xl bg-[#CAF0F8] border border-[#023E8A] text-xs font-bold text-[#03045E]"
              >
                {destFormError}
              </p>
            )}

            <form onSubmit={handleSaveDestination} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="edit-dest-name" className="block text-xs font-bold text-[#023E8A] mb-1">
                    Destination Name
                  </label>
                  <input
                    id="edit-dest-name"
                    type="text"
                    value={destDraft.name}
                    onChange={(e) => setDestDraft({ ...destDraft, name: e.target.value })}
                    placeholder="e.g. Kumrat Valley & Jahaz Banda"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="edit-dest-tagline" className="block text-xs font-bold text-[#023E8A] mb-1">
                    Short Tagline
                  </label>
                  <input
                    id="edit-dest-tagline"
                    type="text"
                    value={destDraft.tagline}
                    onChange={(e) => setDestDraft({ ...destDraft, tagline: e.target.value })}
                    placeholder="Alpine meadows, cedar forests, and glacial lakes"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  />
                </div>

                <div>
                  <label htmlFor="edit-dest-region" className="block text-xs font-bold text-[#023E8A] mb-1">
                    Region
                  </label>
                  <select
                    id="edit-dest-region"
                    value={destDraft.region}
                    onChange={(e) =>
                      setDestDraft({ ...destDraft, region: e.target.value as DestinationRegion })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]"
                  >
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-dest-price" className="block text-xs font-bold text-[#023E8A] mb-1">
                    Base Price / Person (PKR)
                  </label>
                  <input
                    id="edit-dest-price"
                    type="number"
                    min={1000}
                    step={500}
                    value={destDraft.basePricePKR}
                    onChange={(e) =>
                      setDestDraft({
                        ...destDraft,
                        basePricePKR: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] tabular-nums"
                  />
                </div>

                <div>
                  <label htmlFor="edit-dest-days" className="block text-xs font-bold text-[#023E8A] mb-1">
                    Duration Days
                  </label>
                  <input
                    id="edit-dest-days"
                    type="number"
                    min={1}
                    max={30}
                    value={destDraft.durationDays}
                    onChange={(e) => {
                      const days = Math.max(1, Number(e.target.value) || 1);
                      setDestDraft({
                        ...destDraft,
                        durationDays: days,
                        durationLabel: `${days} Days / ${Math.max(1, days - 1)} Nights`,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] tabular-nums"
                  />
                </div>

                <div>
                  <label htmlFor="edit-dest-durlabel" className="block text-xs font-bold text-[#023E8A] mb-1">
                    Duration Display Label
                  </label>
                  <input
                    id="edit-dest-durlabel"
                    type="text"
                    value={destDraft.durationLabel}
                    onChange={(e) =>
                      setDestDraft({ ...destDraft, durationLabel: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]"
                  />
                </div>

                <div>
                  <label htmlFor="edit-dest-img" className="block text-xs font-bold text-[#023E8A] mb-1">
                    Nature Image Preset
                  </label>
                  <select
                    id="edit-dest-img"
                    value={destDraft.imageKey}
                    onChange={(e) =>
                      setDestDraft({
                        ...destDraft,
                        imageKey: e.target.value as keyof typeof DEFAULT_IMAGES,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]"
                  >
                    {IMAGE_PRESET_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <span className="block text-xs font-bold text-[#023E8A]">Upload Your Own Photo (optional)</span>
                  <div className="flex items-center gap-3">
                    {destDraft.customImageUrl && (
                      <img src={destDraft.customImageUrl} alt="Destination preview" className="h-16 w-24 object-cover rounded-xl border border-[#90E0EF]" />
                    )}
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#0077B6] text-[#023E8A] hover:bg-[#CAF0F8] text-xs font-bold cursor-pointer">
                      <ImageIcon className="w-4 h-4" aria-hidden="true" />
                      <span>{uploadingImage ? 'Uploading…' : 'Choose Photo'}</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={handleDestImageUpload} disabled={uploadingImage} />
                    </label>
                    {destDraft.customImageUrl && (
                      <button type="button" onClick={() => setDestDraft({ ...destDraft, customImageUrl: '' })} className="text-xs text-[#0077B6] underline">
                        Use preset instead
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-dest-best" className="block text-xs font-bold text-[#023E8A] mb-1">
                    Best Time to Visit
                  </label>
                  <input
                    id="edit-dest-best"
                    type="text"
                    value={destDraft.bestTimeToVisit}
                    onChange={(e) =>
                      setDestDraft({ ...destDraft, bestTimeToVisit: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <span className="block text-xs font-bold text-[#023E8A] mb-1.5">
                    Available Travel Modes
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-[#03045E] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={destDraft.modes.includes('road')}
                        onChange={() => toggleDraftMode('road')}
                        className="accent-[#023E8A]"
                      />
                      <span>By Road</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-[#03045E] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={destDraft.modes.includes('air')}
                        onChange={() => toggleDraftMode('air')}
                        className="accent-[#023E8A]"
                      />
                      <span>By Air</span>
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="edit-dest-highlights" className="block text-xs font-bold text-[#023E8A] mb-1">
                    Highlights (comma-separated)
                  </label>
                  <input
                    id="edit-dest-highlights"
                    type="text"
                    value={destDraft.highlightsText}
                    onChange={(e) =>
                      setDestDraft({ ...destDraft, highlightsText: e.target.value })
                    }
                    placeholder="Kala Chashma, Dojanga Waterfall, Jahaz Banda"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]"
                  />
                </div>

                {!destDraft.id && (
                  <>
                    <div>
                      <label htmlFor="edit-dest-road" className="block text-xs font-bold text-[#023E8A] mb-1">By Road price / person (PKR)</label>
                      <input id="edit-dest-road" type="number" min={1000} value={destDraft.roadPricePKR ?? ''} placeholder="same as base price"
                        onChange={(e) => setDestDraft({ ...destDraft, roadPricePKR: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]" />
                    </div>
                    <div>
                      <label htmlFor="edit-dest-air" className="block text-xs font-bold text-[#023E8A] mb-1">By Air price / person (PKR)</label>
                      <input id="edit-dest-air" type="number" min={1000} value={destDraft.airPricePKR ?? ''} placeholder="base price + 32,000"
                        onChange={(e) => setDestDraft({ ...destDraft, airPricePKR: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]" />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label htmlFor="edit-dest-itin" className="block text-xs font-bold text-[#023E8A] mb-1">
                    Day-by-day Itinerary (one day per line: Title | Details)
                  </label>
                  <textarea id="edit-dest-itin" rows={4} value={destDraft.itineraryText ?? ''}
                    onChange={(e) => setDestDraft({ ...destDraft, itineraryText: e.target.value })}
                    placeholder={'Arrival in Naran | Pickup, lunch stop at Balakot, hotel check-in\nLake Saif-ul-Mulook | Jeep safari and picnic'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]" />
                </div>
                <div>
                  <label htmlFor="edit-dest-inc" className="block text-xs font-bold text-[#023E8A] mb-1">Included (comma-separated)</label>
                  <input id="edit-dest-inc" type="text" value={destDraft.includedText ?? ''}
                    onChange={(e) => setDestDraft({ ...destDraft, includedText: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]" />
                </div>
                <div>
                  <label htmlFor="edit-dest-exc" className="block text-xs font-bold text-[#023E8A] mb-1">Not included (comma-separated)</label>
                  <input id="edit-dest-exc" type="text" value={destDraft.excludedText ?? ''}
                    onChange={(e) => setDestDraft({ ...destDraft, excludedText: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E]" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDestEditorOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-[#90E0EF] text-sm font-bold text-[#03045E] hover:bg-[#CAF0F8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn"
                >
                  Save Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

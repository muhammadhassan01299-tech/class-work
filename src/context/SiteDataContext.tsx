import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { PricingConfig, TourPackage } from '../data/siteConfig';
import { api } from '../utils/api';
import {
  deleteDestinationRecord,
  getDefaultAdminState,
  upsertDestinationRecord,
  type AdminBookingRecord,
  type AdminCustomerRecord,
  type AdminInquiryRecord,
  type AdminStoreState,
  type BookingStatus,
  type DestinationUpsertInput,
  type EditableBrandConfig,
  type EditableSpecialOffer,
  type InquiryStatus,
  type InquiryType,
} from '../utils/adminStore';

export interface NewBookingInput {
  customerName: string;
  phone: string;
  email: string;
  departureCity: string;
  destinationId: string;
  destinationName: string;
  travelDate: string;
  travellers: number;
  travelMode: 'road' | 'air';
  modeLabel: string;
  estimatedTotalPKR: number;
  notes?: string;
}

export interface NewInquiryInput {
  type: InquiryType;
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface ExportInfo {
  lastExportAt: string | null;
  lastError: string | null;
  folder: string;
}

export interface OwnerSettings {
  ownerWhatsapp: string;
  ownerWhatsappDigits: string;
}

export interface PublicPayload {
  destinations: AdminStoreState['destinations'] | null;
  featuredPackages: AdminStoreState['featuredPackages'] | null;
  specialOffer: EditableSpecialOffer | null;
  brand: Omit<EditableBrandConfig, 'whatsappDisplay' | 'whatsappLink'> | null;
  pricing: PricingConfig | null;
  media: { logoUrl: string | null; ownerPhotoUrl: string | null; imageOverrides: Record<string, string> };
  whatsapp: { digits: string; display: string; link: string } | null;
}

interface AdminDataPayload {
  bookings: AdminBookingRecord[];
  inquiries: AdminInquiryRecord[];
  customers: AdminCustomerRecord[];
  settings: OwnerSettings;
  export: ExportInfo;
}

interface SiteDataContextValue extends AdminStoreState {
  isLoading: boolean;
  loadError: string | null;
  ownerSettings: OwnerSettings;
  exportInfo: ExportInfo | null;
  reloadPublicData: () => Promise<void>;
  loadAdminData: () => Promise<void>;
  addBooking: (input: NewBookingInput) => Promise<AdminBookingRecord>;
  addInquiry: (input: NewInquiryInput) => Promise<void>;
  updateBookingStatus: (id: string, status: BookingStatus) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  upsertDestination: (input: DestinationUpsertInput) => Promise<void>;
  deleteDestination: (id: string) => Promise<void>;
  updateFeaturedPackage: (pkg: TourPackage) => Promise<void>;
  updateSpecialOffer: (offer: EditableSpecialOffer) => Promise<void>;
  updateBrandConfig: (brand: EditableBrandConfig) => Promise<void>;
  updatePricing: (pricing: PricingConfig) => Promise<void>;
  updateInquiryStatus: (id: string, status: InquiryStatus) => Promise<void>;
  deleteInquiry: (id: string) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  saveOwnerWhatsapp: (value: string) => Promise<{ envSaved: boolean; envError: string | null; exportOk: boolean }>;
  exportRecordsNow: () => Promise<{ folder: string }>;
}

const SiteDataContext = createContext<SiteDataContextValue | null>(null);

// One shared in-flight request so SiteDataProvider and MediaProvider do not double-fetch.
let publicRequest: Promise<PublicPayload> | null = null;
export function fetchPublicPayload(force = false): Promise<PublicPayload> {
  if (!publicRequest || force) {
    publicRequest = api<PublicPayload>('GET', '/api/public').catch((err) => {
      publicRequest = null;
      throw err;
    });
  }
  return publicRequest;
}

function mergePublic(base: AdminStoreState, p: PublicPayload): AdminStoreState {
  const defaults = getDefaultAdminState();
  return {
    ...base,
    destinations: p.destinations && p.destinations.length > 0 ? p.destinations : defaults.destinations,
    featuredPackages: p.featuredPackages ?? defaults.featuredPackages,
    specialOffer: p.specialOffer ?? defaults.specialOffer,
    pricing: p.pricing ?? defaults.pricing,
    brandConfig: {
      ...defaults.brandConfig,
      ...(p.brand ?? {}),
      // The WhatsApp number always comes from the server's .env (OWNER_WHATSAPP).
      whatsappDisplay: p.whatsapp?.display ?? defaults.brandConfig.whatsappDisplay,
      whatsappLink: p.whatsapp?.link ?? defaults.brandConfig.whatsappLink,
    },
  };
}

export function SiteDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminStoreState>(getDefaultAdminState);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ownerSettings, setOwnerSettings] = useState<OwnerSettings>({ ownerWhatsapp: '', ownerWhatsappDigits: '' });
  const [exportInfo, setExportInfo] = useState<ExportInfo | null>(null);
  const serverIsSeeded = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  const reloadPublicData = useCallback(async () => {
    try {
      const payload = await fetchPublicPayload(true);
      serverIsSeeded.current = payload.destinations !== null && payload.pricing !== null;
      setState((prev) => mergePublic(prev, payload));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load site data.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPublicPayload()
      .then((payload) => {
        if (cancelled) return;
        serverIsSeeded.current = payload.destinations !== null && payload.pricing !== null;
        setState((prev) => mergePublic(prev, payload));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load site data.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** First admin session: copy the built-in defaults to the server so Excel/prices are complete. */
  const seedServerDefaults = useCallback(async (current: AdminStoreState) => {
    if (serverIsSeeded.current) return;
    await api('PUT', '/api/admin/destinations', { destinations: current.destinations });
    await api('PUT', '/api/admin/pricing', { pricing: current.pricing });
    await api('PUT', '/api/admin/packages', { featuredPackages: current.featuredPackages });
    await api('PUT', '/api/admin/offer', { specialOffer: current.specialOffer });
    const { whatsappDisplay: _d, whatsappLink: _l, ...brand } = current.brandConfig;
    void _d;
    void _l;
    await api('PUT', '/api/admin/brand', { brand });
    serverIsSeeded.current = true;
  }, []);

  const loadAdminData = useCallback(async () => {
    const data = await api<AdminDataPayload>('GET', '/api/admin/data');
    setState((prev) => ({ ...prev, bookings: data.bookings, inquiries: data.inquiries, customers: data.customers }));
    setOwnerSettings(data.settings);
    setExportInfo(data.export);
    // Copy built-in defaults to the server once (so Excel exports and prices are complete).
    void seedServerDefaults(stateRef.current).catch(() => undefined);
  }, [seedServerDefaults]);

  const addBooking = useCallback(async (input: NewBookingInput) => {
    const { booking } = await api<{ booking: AdminBookingRecord }>('POST', '/api/bookings', input);
    return booking;
  }, []);

  const addInquiry = useCallback(async (input: NewInquiryInput) => {
    await api('POST', '/api/inquiries', input);
  }, []);

  const updateBookingStatus = useCallback(async (id: string, status: BookingStatus) => {
    await api('PATCH', `/api/admin/bookings/${encodeURIComponent(id)}`, { status });
    setState((prev) => ({ ...prev, bookings: prev.bookings.map((b) => (b.id === id ? { ...b, status } : b)) }));
  }, []);

  const deleteBooking = useCallback(async (id: string) => {
    await api('DELETE', `/api/admin/bookings/${encodeURIComponent(id)}`);
    setState((prev) => ({ ...prev, bookings: prev.bookings.filter((b) => b.id !== id) }));
  }, []);

  const upsertDestination = useCallback(
    async (input: DestinationUpsertInput) => {
      const next = upsertDestinationRecord(state.destinations, input);
      await api('PUT', '/api/admin/destinations', { destinations: next });
      serverIsSeeded.current = true;
      setState((prev) => ({ ...prev, destinations: next }));
    },
    [state.destinations]
  );

  const deleteDestination = useCallback(
    async (id: string) => {
      const next = deleteDestinationRecord(state.destinations, id);
      if (next.length === state.destinations.length) return;
      await api('PUT', '/api/admin/destinations', { destinations: next });
      const packages = state.featuredPackages.filter((p) => p.destinationId !== id);
      if (packages.length !== state.featuredPackages.length) {
        await api('PUT', '/api/admin/packages', { featuredPackages: packages });
      }
      setState((prev) => ({ ...prev, destinations: next, featuredPackages: packages }));
    },
    [state.destinations, state.featuredPackages]
  );

  const updateFeaturedPackage = useCallback(
    async (pkg: TourPackage) => {
      const next = state.featuredPackages.map((item) => (item.id === pkg.id ? pkg : item));
      await api('PUT', '/api/admin/packages', { featuredPackages: next });
      setState((prev) => ({ ...prev, featuredPackages: next }));
    },
    [state.featuredPackages]
  );

  const updateSpecialOffer = useCallback(async (offer: EditableSpecialOffer) => {
    await api('PUT', '/api/admin/offer', { specialOffer: offer });
    setState((prev) => ({ ...prev, specialOffer: offer }));
  }, []);

  const updateBrandConfig = useCallback(async (brand: EditableBrandConfig) => {
    const { whatsappDisplay: _d, whatsappLink: _l, ...editable } = brand;
    void _d;
    void _l;
    await api('PUT', '/api/admin/brand', { brand: editable });
    setState((prev) => ({
      ...prev,
      brandConfig: { ...prev.brandConfig, ...editable },
    }));
  }, []);

  const updatePricing = useCallback(async (pricing: PricingConfig) => {
    await api('PUT', '/api/admin/pricing', { pricing });
    setState((prev) => ({ ...prev, pricing }));
  }, []);

  const updateInquiryStatus = useCallback(async (id: string, status: InquiryStatus) => {
    await api('PATCH', `/api/admin/inquiries/${encodeURIComponent(id)}`, { status });
    setState((prev) => ({ ...prev, inquiries: prev.inquiries.map((i) => (i.id === id ? { ...i, status } : i)) }));
  }, []);

  const deleteInquiry = useCallback(async (id: string) => {
    await api('DELETE', `/api/admin/inquiries/${encodeURIComponent(id)}`);
    setState((prev) => ({ ...prev, inquiries: prev.inquiries.filter((i) => i.id !== id) }));
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    await api('DELETE', `/api/admin/customers/${encodeURIComponent(id)}`);
    setState((prev) => ({ ...prev, customers: prev.customers.filter((c) => c.id !== id) }));
  }, []);

  const saveOwnerWhatsapp = useCallback(async (value: string) => {
    const result = await api<{
      envSaved: boolean;
      envError: string | null;
      ownerWhatsapp: string;
      ownerWhatsappDigits: string;
      export: { ok: boolean; at?: string; error?: string };
    }>('POST', '/api/admin/settings', { ownerWhatsapp: value });
    setOwnerSettings({ ownerWhatsapp: result.ownerWhatsapp, ownerWhatsappDigits: result.ownerWhatsappDigits });
    setExportInfo((prev) => ({
      folder: prev?.folder ?? 'data/exports',
      lastExportAt: result.export.ok ? (result.export.at ?? new Date().toISOString()) : (prev?.lastExportAt ?? null),
      lastError: result.export.ok ? null : (result.export.error ?? 'Export failed'),
    }));
    setState((prev) => ({
      ...prev,
      brandConfig: {
        ...prev.brandConfig,
        whatsappDisplay: result.ownerWhatsapp,
        whatsappLink: `https://wa.me/${result.ownerWhatsappDigits}`,
      },
    }));
    return { envSaved: result.envSaved, envError: result.envError, exportOk: result.export.ok };
  }, []);

  const exportRecordsNow = useCallback(async () => {
    const result = await api<{ folder: string; at: string }>('POST', '/api/admin/export');
    setExportInfo((prev) => ({ folder: result.folder, lastExportAt: result.at, lastError: prev ? null : null }));
    return { folder: result.folder };
  }, []);

  const value = useMemo<SiteDataContextValue>(
    () => ({
      ...state,
      isLoading,
      loadError,
      ownerSettings,
      exportInfo,
      reloadPublicData,
      loadAdminData,
      addBooking,
      addInquiry,
      updateBookingStatus,
      deleteBooking,
      upsertDestination,
      deleteDestination,
      updateFeaturedPackage,
      updateSpecialOffer,
      updateBrandConfig,
      updatePricing,
      updateInquiryStatus,
      deleteInquiry,
      deleteCustomer,
      saveOwnerWhatsapp,
      exportRecordsNow,
    }),
    [
      state, isLoading, loadError, ownerSettings, exportInfo, reloadPublicData, loadAdminData, addBooking, addInquiry,
      updateBookingStatus, deleteBooking, upsertDestination, deleteDestination, updateFeaturedPackage,
      updateSpecialOffer, updateBrandConfig, updatePricing, updateInquiryStatus, deleteInquiry, deleteCustomer,
      saveOwnerWhatsapp, exportRecordsNow,
    ]
  );

  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteDataContextValue {
  const ctx = useContext(SiteDataContext);
  if (!ctx) {
    throw new Error('useSiteData must be used within SiteDataProvider');
  }
  return ctx;
}

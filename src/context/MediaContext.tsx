import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BRAND_CONFIG } from '../data/siteConfig';
import { api, uploadImageFile } from '../utils/api';
import { fetchPublicPayload } from './SiteDataContext';

interface StoredMedia {
  logoUrl: string | null;
  ownerPhotoUrl: string | null;
  imageOverrides: Record<string, string>;
}

interface MediaContextValue {
  logoUrl: string | null;
  ownerPhotoUrl: string | null;
  imageOverrides: Record<string, string>;
  /** True only inside the signed-in /admin area. Public visitors can never edit media. */
  canEdit: boolean;
  setCanEdit: (value: boolean) => void;
  isUploaderOpen: boolean;
  openUploader: () => void;
  closeUploader: () => void;
  /** Upload a file and set it as the logo (null removes the logo). */
  setLogoFile: (file: File | null) => Promise<void>;
  setOwnerPhotoFile: (file: File | null) => Promise<void>;
  setImageOverride: (key: string, file: File | null) => Promise<void>;
  resetAllMedia: () => Promise<void>;
  resolveImage: (key: string, fallbackUrl: string) => string;
}

const defaultMedia: StoredMedia = {
  logoUrl: BRAND_CONFIG.logoUrl,
  ownerPhotoUrl: null,
  imageOverrides: {},
};

const MediaContext = createContext<MediaContextValue | null>(null);

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const [media, setMedia] = useState<StoredMedia>(defaultMedia);
  const [canEdit, setCanEdit] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublicPayload()
      .then((payload) => {
        if (cancelled || !payload.media) return;
        setMedia({
          logoUrl: payload.media.logoUrl ?? BRAND_CONFIG.logoUrl,
          ownerPhotoUrl: payload.media.ownerPhotoUrl ?? null,
          imageOverrides: payload.media.imageOverrides ?? {},
        });
      })
      .catch(() => undefined); // The site still renders with built-in images.
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: StoredMedia) => {
    await api('PUT', '/api/admin/media', { media: next });
    setMedia(next);
  }, []);

  const setLogoFile = useCallback(
    async (file: File | null) => {
      const url = file ? await uploadImageFile(file) : null;
      await persist({ ...media, logoUrl: url });
    },
    [media, persist]
  );

  const setOwnerPhotoFile = useCallback(
    async (file: File | null) => {
      const url = file ? await uploadImageFile(file) : null;
      await persist({ ...media, ownerPhotoUrl: url });
    },
    [media, persist]
  );

  const setImageOverride = useCallback(
    async (key: string, file: File | null) => {
      const overrides = { ...media.imageOverrides };
      if (file) {
        overrides[key] = await uploadImageFile(file);
      } else {
        delete overrides[key];
      }
      await persist({ ...media, imageOverrides: overrides });
    },
    [media, persist]
  );

  const resetAllMedia = useCallback(async () => {
    await persist({ logoUrl: null, ownerPhotoUrl: null, imageOverrides: {} });
  }, [persist]);

  const resolveImage = (key: string, fallbackUrl: string) => media.imageOverrides[key] || fallbackUrl;

  return (
    <MediaContext.Provider
      value={{
        logoUrl: media.logoUrl,
        ownerPhotoUrl: media.ownerPhotoUrl,
        imageOverrides: media.imageOverrides,
        canEdit,
        setCanEdit,
        isUploaderOpen,
        openUploader: () => setIsUploaderOpen(true),
        closeUploader: () => setIsUploaderOpen(false),
        setLogoFile,
        setOwnerPhotoFile,
        setImageOverride,
        resetAllMedia,
        resolveImage,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
}

export function useMedia(): MediaContextValue {
  const ctx = useContext(MediaContext);
  if (!ctx) {
    throw new Error('useMedia must be used within MediaProvider');
  }
  return ctx;
}

import React, { useState } from 'react';
import { RotateCcw, Upload, X } from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { errorMessage } from '../utils/api';
import { DEFAULT_IMAGES } from '../data/siteConfig';

const IMAGE_SLOTS: { key: string; label: string; defaultUrl: string }[] = [
  { key: 'heroNaran', label: 'Hero & Naran Kaghan', defaultUrl: DEFAULT_IMAGES.heroNaran },
  { key: 'hunza', label: 'Hunza Valley', defaultUrl: DEFAULT_IMAGES.hunza },
  { key: 'skardu', label: 'Skardu & Shangrila', defaultUrl: DEFAULT_IMAGES.skardu },
  { key: 'swat', label: 'Swat & Kalam', defaultUrl: DEFAULT_IMAGES.swat },
  { key: 'fairyMeadows', label: 'Fairy Meadows', defaultUrl: DEFAULT_IMAGES.fairyMeadows },
  { key: 'neelum', label: 'Neelum Valley', defaultUrl: DEFAULT_IMAGES.neelum },
];

export function MediaUploaderModal() {
  const {
    isUploaderOpen,
    closeUploader,
    logoUrl,
    ownerPhotoUrl,
    imageOverrides,
    setLogoFile,
    setOwnerPhotoFile,
    setImageOverride,
    resetAllMedia,
    canEdit,
  } = useMedia();
  const [notice, setNotice] = useState<string | null>(null);

  if (!canEdit || !isUploaderOpen) return null;

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    save: (file: File) => Promise<void>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setNotice('Uploading…');
    try {
      await save(file);
      setNotice('Saved! Visible to every visitor of the website.');
    } catch (err) {
      setNotice(errorMessage(err, 'Upload failed.'));
    }
  };

  const runAction = async (action: () => Promise<void>, doneMessage: string) => {
    try {
      await action();
      setNotice(doneMessage);
    } catch (err) {
      setNotice(errorMessage(err, 'Could not save the change.'));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#03045E]/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-uploader-title"
    >
      <div className="glass-card bg-white/95 rounded-3xl max-w-3xl w-full max-h-[88vh] overflow-y-auto p-6 sm:p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#90E0EF]">
          <div>
            <h2 id="media-uploader-title" className="text-2xl font-bold text-[#03045E]">
              Upload Your Logo &amp; Pakistan Photos
            </h2>
            <p className="text-sm text-[#0077B6] mt-1">
              Upload your Pak Tourist logo, owner portrait, or replace any destination photo right
              here in the browser.
            </p>
          </div>
          <button
            type="button"
            onClick={closeUploader}
            aria-label="Close media uploader"
            className="p-2 rounded-xl border border-[#90E0EF] text-[#03045E] hover:bg-[#CAF0F8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {notice && (
          <div className="mt-4 px-4 py-2.5 rounded-xl bg-[#ADE8F4]/60 border border-[#00B4D8] text-sm text-[#03045E]">
            {notice}
          </div>
        )}

        {/* Brand Logo & Owner Portrait */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded-2xl border border-[#90E0EF] bg-[#CAF0F8]/35 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#03045E]">Company Logo</span>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => runAction(() => setLogoFile(null), 'Logo removed.')}
                  className="text-xs text-[#0077B6] underline"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="h-20 rounded-xl bg-white border border-[#90E0EF] flex items-center justify-center p-2">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Uploaded Pak Tourist logo"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-[#0077B6]">No logo uploaded yet</span>
              )}
            </div>
            <label className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-[#023E8A] hover:bg-[#0077B6] text-white text-sm font-semibold cursor-pointer transition-colors">
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Choose Logo File</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => handleFileChange(e, setLogoFile)}
              />
            </label>
          </div>

          <div className="p-4 rounded-2xl border border-[#90E0EF] bg-[#CAF0F8]/35 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#03045E]">Owner Photo</span>
              {ownerPhotoUrl && (
                <button
                  type="button"
                  onClick={() => runAction(() => setOwnerPhotoFile(null), 'Owner photo removed.')}
                  className="text-xs text-[#0077B6] underline"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="h-20 rounded-xl bg-white border border-[#90E0EF] flex items-center justify-center p-2">
              {ownerPhotoUrl ? (
                <img
                  src={ownerPhotoUrl}
                  alt="Owner portrait"
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <span className="text-xs text-[#0077B6]">Using monogram spot on About page</span>
              )}
            </div>
            <label className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-[#023E8A] hover:bg-[#0077B6] text-white text-sm font-semibold cursor-pointer transition-colors">
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Choose Owner Photo</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => handleFileChange(e, setOwnerPhotoFile)}
              />
            </label>
          </div>
        </div>

        {/* Destination / Hero Images */}
        <h3 className="text-lg font-bold text-[#03045E] mt-7 mb-3">
          Destination &amp; Gallery Images
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {IMAGE_SLOTS.map((slot) => {
            const activeSrc = imageOverrides[slot.key] || slot.defaultUrl;
            const isCustom = Boolean(imageOverrides[slot.key]);
            return (
              <div
                key={slot.key}
                className="p-3 rounded-2xl border border-[#90E0EF] bg-white space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#03045E] truncate">{slot.label}</span>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={() => runAction(() => setImageOverride(slot.key, null), 'Photo reverted to default.')}
                      className="text-xs text-[#0077B6] underline shrink-0"
                    >
                      Revert
                    </button>
                  )}
                </div>
                <img
                  src={activeSrc}
                  alt={slot.label}
                  className="w-full h-24 object-cover rounded-xl border border-[#CAF0F8]"
                />
                <label className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-xl border border-[#0077B6] text-[#023E8A] hover:bg-[#CAF0F8] text-xs font-semibold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Replace Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) =>
                      handleFileChange(e, (file) => setImageOverride(slot.key, file))
                    }
                  />
                </label>
              </div>
            );
          })}
        </div>

        <div className="mt-7 pt-4 border-t border-[#90E0EF] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (!window.confirm('Reset the logo, owner photo and all replaced photos to the defaults?')) return;
              void runAction(resetAllMedia, 'Reset to default nature imagery and empty logo slot.');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#90E0EF] text-[#03045E] hover:bg-[#CAF0F8] text-sm font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Reset All</span>
          </button>

          <button
            type="button"
            onClick={closeUploader}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-semibold glossy-btn"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

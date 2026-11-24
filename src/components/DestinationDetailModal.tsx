import { Calendar, CheckCircle2, MapPin, Star, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useMedia } from '../context/MediaContext';
import type { DestinationItem, TravelMode } from '../data/siteConfig';
import { formatPKR } from '../utils/bookingMath';
import { ResilientImage } from './ResilientImage';

interface DestinationDetailModalProps {
  destination: DestinationItem | null;
  onClose: () => void;
  onBookDestination: (destinationId: string, mode?: TravelMode) => void;
}

export function DestinationDetailModal({
  destination,
  onClose,
  onBookDestination,
}: DestinationDetailModalProps) {
  const { resolveImage } = useMedia();
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  if (!destination) return null;

  const primarySrc = resolveImage(destination.imageKey, destination.defaultImage);
  const allGallery = [primarySrc, ...destination.galleryImages.filter((u) => u !== destination.defaultImage)];
  const activeSrc = allGallery[selectedImageIdx] || primarySrc;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#03045E]/65 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dest-detail-title"
    >
      <div className="glass-card bg-white/95 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Top Hero Photo */}
        <div className="relative h-64 sm:h-80 overflow-hidden rounded-t-3xl">
          <ResilientImage
            src={activeSrc}
            alt={destination.name}
            className="w-full h-full object-cover"
            fallbackLabel={destination.name}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#03045E]/85 via-[#03045E]/30 to-transparent"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close destination details"
            className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/90 text-[#03045E] hover:bg-[#CAF0F8] transition-colors shadow"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-5 left-6 right-6 text-white">
            <p className="text-sm text-[#90E0EF] font-semibold mb-1">
              {destination.region} · {destination.durationLabel} · {destination.reviewCount > 0 ? (
                <>
                  Rating <span className="tabular-nums">{destination.rating.toFixed(1)}</span>
                </>
              ) : (
                'New'
              )}
            </p>
            <h2 id="dest-detail-title" className="text-2xl sm:text-4xl font-bold text-white">
              {destination.name}
            </h2>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Gallery Switcher */}
          {allGallery.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {allGallery.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  aria-label={`View gallery photo ${idx + 1}`}
                  className={`w-24 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    selectedImageIdx === idx
                      ? 'border-[#023E8A] scale-105'
                      : 'border-[#90E0EF] opacity-80 hover:opacity-100'
                  }`}
                >
                  <ResilientImage
                    src={imgUrl}
                    alt={`${destination.name} view ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Quick Facts Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#CAF0F8]/55 border border-[#90E0EF]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0077B6] mb-1">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <span>Best Time to Visit</span>
              </div>
              <p className="text-base font-bold text-[#03045E]">{destination.bestTimeToVisit}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#CAF0F8]/55 border border-[#90E0EF]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0077B6] mb-1">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                <span>Available Services</span>
              </div>
              <p className="text-base font-bold text-[#03045E]">
                {destination.modes.map((m) => (m === 'air' ? 'By Air' : 'By Road')).join(' & ')}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#CAF0F8]/55 border border-[#90E0EF]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0077B6] mb-1">
                <Star className="w-4 h-4" aria-hidden="true" />
                <span>Starting Rate</span>
              </div>
              <p className="text-base font-bold text-[#03045E] tabular-nums">
                {formatPKR(destination.basePricePKR)} / person
              </p>
            </div>
          </div>

          {/* Itinerary */}
          <div>
            <h3 className="text-2xl font-bold text-[#03045E] mb-4">Day-by-Day Itinerary</h3>
            <div className="space-y-3">
              {destination.itinerary.map((item) => (
                <div
                  key={item.day}
                  className="p-4 rounded-2xl border border-[#90E0EF] bg-white flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-5"
                >
                  <span className="text-sm font-bold text-[#0077B6] shrink-0 tabular-nums">
                    {item.day}
                  </span>
                  <div>
                    <h4 className="text-lg font-bold text-[#03045E]">{item.title}</h4>
                    <p className="text-sm text-[#03045E]/80 mt-0.5 leading-relaxed">
                      {item.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Included / Excluded */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl border border-[#90E0EF] bg-[#CAF0F8]/35">
              <h3 className="text-lg font-bold text-[#03045E] mb-3">What Is Included</h3>
              <ul className="space-y-2">
                {destination.included.map((inc) => (
                  <li key={inc} className="flex items-start gap-2 text-sm text-[#03045E]">
                    <CheckCircle2
                      className="w-4 h-4 text-[#0077B6] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-2xl border border-[#90E0EF] bg-white">
              <h3 className="text-lg font-bold text-[#03045E] mb-3">Not Included</h3>
              <ul className="space-y-2">
                {destination.excluded.map((exc) => (
                  <li key={exc} className="flex items-start gap-2 text-sm text-[#03045E]/80">
                    <XCircle
                      className="w-4 h-4 text-[#0096C7] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{exc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* PKR Price Table */}
          <div>
            <h3 className="text-xl font-bold text-[#03045E] mb-3">Package Price Table (PKR)</h3>
            <div className="overflow-x-auto rounded-2xl border border-[#90E0EF]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#ADE8F4]/60 text-[#03045E] text-sm">
                    <th className="py-3 px-4 font-bold">Package Option</th>
                    <th className="py-3 px-4 font-bold">Travel Mode</th>
                    <th className="py-3 px-4 font-bold text-right">Per Person Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CAF0F8] bg-white text-sm">
                  {destination.priceTiers.map((tier) => (
                    <tr key={tier.label}>
                      <td className="py-3 px-4 font-semibold text-[#03045E]">{tier.label}</td>
                      <td className="py-3 px-4 text-[#0077B6]">
                        {tier.mode === 'air' ? 'By Air' : 'By Road'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#023E8A] tabular-nums">
                        {formatPKR(tier.pricePKR)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Footer CTA */}
          <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-[#90E0EF] text-[#03045E] hover:bg-[#CAF0F8] text-sm font-semibold transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onBookDestination(destination.id, destination.modes[0]);
                onClose();
              }}
              className="px-7 py-3 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn"
            >
              Book This Trip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ResilientImage } from '../components/ResilientImage';
import { useMedia } from '../context/MediaContext';
import { GALLERY_ITEMS, type GalleryItem } from '../data/siteConfig';

const CATEGORIES: ('All' | GalleryItem['category'])[] = [
  'All',
  'Mountains',
  'Lakes',
  'Valleys',
  'Culture',
  'Adventure',
];

export function GalleryPage() {
  const { resolveImage } = useMedia();
  const [category, setCategory] = useState<'All' | GalleryItem['category']>('All');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const visibleItems =
    category === 'All'
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === category);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight') {
        setLightboxIdx((prev) => (prev === null ? null : (prev + 1) % visibleItems.length));
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIdx((prev) =>
          prev === null ? null : (prev - 1 + visibleItems.length) % visibleItems.length
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIdx, visibleItems.length]);

  const activeLightbox = lightboxIdx !== null ? visibleItems[lightboxIdx] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-[#0077B6] mb-2">Scenic Landscapes</p>
          <h1 className="text-3xl sm:text-5xl font-bold text-[#03045E] mb-3">
            Pakistan Nature Gallery
          </h1>
          <p className="text-base text-[#03045E]/80">
            Browse curated moments across lakes, high peaks, valleys, and heritage crossings.
          </p>
        </div>

      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setCategory(cat);
              setLightboxIdx(null);
            }}
            className={`px-4 py-2 rounded-2xl text-sm font-bold transition-colors ${
              category === cat
                ? 'bg-[#023E8A] text-white shadow'
                : 'bg-white/85 border border-[#90E0EF] text-[#03045E] hover:bg-[#ADE8F4]/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Masonry-Style Grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
        {visibleItems.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setLightboxIdx(idx)}
            className="break-inside-avoid w-full text-left group glass-card rounded-3xl overflow-hidden glossy-card-hover bg-white/90 block"
          >
            <div className={`overflow-hidden ${idx % 2 === 0 ? 'aspect-[4/3]' : 'aspect-[4/5]'}`}>
              <ResilientImage
                src={resolveImage(item.imageKey, item.defaultImage)}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold text-[#0077B6] mb-1">
                {item.category} · {item.location}
              </p>
              <h2 className="text-lg font-bold text-[#03045E]">{item.title}</h2>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Viewer */}
      {activeLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#03045E]/85 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activeLightbox.title}
        >
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            aria-label="Close lightbox"
            className="absolute top-5 right-5 p-3 rounded-2xl bg-white/90 text-[#03045E] hover:bg-[#CAF0F8] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() =>
              setLightboxIdx((prev) =>
                prev === null ? 0 : (prev - 1 + visibleItems.length) % visibleItems.length
              )
            }
            aria-label="Previous image"
            className="hidden sm:flex p-3 rounded-2xl bg-white/90 text-[#03045E] hover:bg-[#CAF0F8] mr-4"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="max-w-4xl w-full glass-card bg-white/95 rounded-3xl overflow-hidden shadow-2xl">
            <div className="max-h-[72vh] overflow-hidden bg-[#03045E]">
              <ResilientImage
                src={resolveImage(activeLightbox.imageKey, activeLightbox.defaultImage)}
                alt={activeLightbox.title}
                className="w-full h-full max-h-[72vh] object-contain mx-auto"
              />
            </div>
            <div className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#0077B6]">
                  {activeLightbox.category} · {activeLightbox.location}
                </p>
                <h3 className="text-xl font-bold text-[#03045E]">{activeLightbox.title}</h3>
              </div>
              <div className="flex sm:hidden items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIdx((prev) =>
                      prev === null ? 0 : (prev - 1 + visibleItems.length) % visibleItems.length
                    )
                  }
                  aria-label="Previous image"
                  className="p-2.5 rounded-xl border border-[#90E0EF] text-[#03045E]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIdx((prev) =>
                      prev === null ? 0 : (prev + 1) % visibleItems.length
                    )
                  }
                  aria-label="Next image"
                  className="p-2.5 rounded-xl border border-[#90E0EF] text-[#03045E]"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setLightboxIdx((prev) =>
                prev === null ? 0 : (prev + 1) % visibleItems.length
              )
            }
            aria-label="Next image"
            className="hidden sm:flex p-3 rounded-2xl bg-white/90 text-[#03045E] hover:bg-[#CAF0F8] ml-4"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}

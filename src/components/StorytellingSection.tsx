import { useEffect, useRef, useState } from 'react';
import { Car, Plane } from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { STORY_STEPS } from '../data/siteConfig';
import { ResilientImage } from './ResilientImage';

export function StorytellingSection({ onBookNow }: { onBookNow: () => void }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollRatio, setScrollRatio] = useState(0);
  const { resolveImage } = useMedia();

  useEffect(() => {
    const handleScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalTravel = Math.max(1, el.offsetHeight - window.innerHeight * 0.6);
      const passed = Math.min(totalTravel, Math.max(0, window.innerHeight * 0.4 - rect.top));
      const ratio = passed / totalTravel;
      setScrollRatio(ratio);
      const stepIdx = Math.min(
        STORY_STEPS.length - 1,
        Math.max(0, Math.floor(ratio * STORY_STEPS.length))
      );
      setActiveIndex(stepIdx);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeStep = STORY_STEPS[activeIndex];
  const pathDashOffset = Math.max(0, 320 - scrollRatio * 320);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="storytelling-heading"
      className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-[#0077B6] mb-2">
            Dream · Plan · Journey · Memories
          </p>
          <h2
            id="storytelling-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#03045E] leading-tight"
          >
            Your Journey, Step by Step
          </h2>
        </div>

        {/* Scroll-Drawn Road & Flight Path Graphic */}
        <div className="glass-card rounded-2xl px-5 py-3 flex items-center gap-4 self-start lg:self-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#023E8A]">
            <Car className="w-4 h-4 text-[#0077B6]" aria-hidden="true" />
            <span>Road</span>
          </div>
          <svg
            width="150"
            height="34"
            viewBox="0 0 150 34"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            {/* Base track */}
            <path
              d="M6 26 C 36 26, 48 8, 76 14 C 102 20, 118 6, 144 8"
              stroke="#90E0EF"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
            {/* Animated scroll-drawn route */}
            <path
              d="M6 26 C 36 26, 48 8, 76 14 C 102 20, 118 6, 144 8"
              stroke="#023E8A"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="320"
              strokeDashoffset={pathDashOffset}
            />
          </svg>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#023E8A]">
            <Plane className="w-4 h-4 text-[#00B4D8]" aria-hidden="true" />
            <span>Air</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Interactive Chapter Steps */}
        <div className="lg:col-span-6 space-y-4">
          {STORY_STEPS.map((step, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`w-full text-left p-6 rounded-3xl transition-all duration-300 border ${
                  isActive
                    ? 'glass-card bg-white/95 border-[#00B4D8] shadow-xl scale-[1.01]'
                    : 'bg-white/55 border-[#90E0EF]/70 hover:bg-white/80'
                }`}
              >
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-sm font-bold text-[#0077B6] tabular-nums">
                    {step.stepNumber}.
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-[#03045E]">
                    {step.keyword} — {step.title}
                  </span>
                </div>
                <p className="text-base text-[#03045E]/80 leading-relaxed pl-8">
                  {step.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right: Sticky Visual Showcase with Smooth Zoom */}
        <div className="lg:col-span-6 lg:sticky lg:top-24">
          <div className="glass-card rounded-3xl overflow-hidden p-3 sm:p-4 bg-white/85">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
              <ResilientImage
                src={resolveImage(activeStep.imageKey, activeStep.defaultImage)}
                alt={activeStep.title}
                className="w-full h-full object-cover transition-transform duration-700 ease-out"
                fallbackLabel={activeStep.keyword}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#03045E]/85 via-[#03045E]/25 to-transparent"
              />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <p className="text-sm text-[#90E0EF] font-semibold mb-1 tabular-nums">
                  Chapter {activeStep.stepNumber} · {activeStep.keyword}
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  {activeStep.title}
                </h3>
                <button
                  type="button"
                  onClick={onBookNow}
                  className="mt-2 px-5 py-2.5 rounded-2xl bg-white text-[#03045E] hover:bg-[#CAF0F8] text-sm font-bold glossy-btn"
                >
                  Start Planning This Trip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

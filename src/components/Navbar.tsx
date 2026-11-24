import { Lock, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useMedia } from '../context/MediaContext';
import { useSiteData } from '../context/SiteDataContext';
import type { AuthSession } from '../utils/authStore';

export type PageId =
  | 'home'
  | 'destinations'
  | 'booking'
  | 'gallery'
  | 'about'
  | 'contact'
  | 'auth';

interface NavbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  session: AuthSession;
  onLockSite: () => void;
}

const NAV_ITEMS: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'destinations', label: 'Destinations' },
  { id: 'booking', label: 'Booking' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
];

export function Navbar({ currentPage, onNavigate, session, onLockSite }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logoUrl } = useMedia();
  const { brandConfig } = useSiteData();

  const handleNav = (page: PageId) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Zone: Uploaded Logo or Clean Upload Spot + Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          {logoUrl ? (
            <button
              type="button"
              onClick={() => handleNav('home')}
              className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6] rounded-lg"
              aria-label="Pak Tourist Home"
            >
              <img
                src={logoUrl}
                alt={`${brandConfig.companyName} logo`}
                className="h-10 w-auto max-w-[120px] object-contain rounded-lg"
              />
              <span className="text-xl font-bold tracking-tight text-[#03045E] whitespace-nowrap shrink-0">
                {brandConfig.companyName}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNav('home')}
              className="text-xl font-bold tracking-tight text-[#03045E] hover:text-[#023E8A] transition-colors whitespace-nowrap shrink-0"
            >
              {brandConfig.companyName}
            </button>
          )}
        </div>

        {/* Center Nav Links */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-3 lg:gap-5"
        >
          {NAV_ITEMS.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`relative py-1.5 text-sm lg:text-base font-medium whitespace-nowrap shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6] rounded ${
                  active
                    ? 'text-[#023E8A] font-bold'
                    : 'text-[#03045E]/85 hover:text-[#0077B6]'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full bg-[#0077B6]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Account + Lock Control & Mobile Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('auth')}
            className="hidden sm:inline-flex items-center justify-center max-w-[150px] px-3.5 py-2 rounded-2xl text-xs lg:text-sm font-semibold text-[#03045E] border border-[#90E0EF] bg-white/90 hover:bg-[#CAF0F8] transition-colors whitespace-nowrap shrink-0 truncate"
            title={session.displayName}
          >
            <span className="truncate">{session.displayName}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onLockSite();
            }}
            aria-label="Lock website and sign out"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs lg:text-sm font-semibold text-white bg-gradient-to-r from-[#023E8A] to-[#0077B6] hover:from-[#0077B6] hover:to-[#0096C7] glossy-btn whitespace-nowrap shrink-0"
          >
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Lock</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="md:hidden p-2.5 rounded-xl border border-[#90E0EF] bg-white/80 text-[#03045E] hover:bg-[#ADE8F4]/50 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#90E0EF] bg-white/95 backdrop-blur-lg px-4 py-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-base font-medium transition-colors ${
                  active
                    ? 'bg-[#ADE8F4]/70 text-[#03045E] font-bold'
                    : 'text-[#03045E] hover:bg-[#CAF0F8]/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleNav('auth')}
              className="px-4 py-2.5 rounded-2xl border border-[#90E0EF] bg-white text-sm font-bold text-[#03045E] truncate"
            >
              {session.displayName}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onLockSite();
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-[#023E8A] to-[#0077B6] glossy-btn"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Lock Site</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}


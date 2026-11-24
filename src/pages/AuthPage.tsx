import { CheckCircle2, Lock } from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { useMedia } from '../context/MediaContext';
import { useSiteData } from '../context/SiteDataContext';
import { DEFAULT_IMAGES } from '../data/siteConfig';
import type { AuthSession } from '../utils/authStore';
import type { PageId } from '../components/Navbar';

interface AuthPageProps {
  session: AuthSession;
  onNavigate: (page: PageId) => void;
  onLockWebsite: () => void;
}

export function AuthPage({ session, onNavigate, onLockWebsite }: AuthPageProps) {
  const { resolveImage } = useMedia();
  const { brandConfig } = useSiteData();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="glass-card rounded-3xl overflow-hidden bg-white/90 grid grid-cols-1 lg:grid-cols-12 shadow-2xl">
        {/* Left Scenic Nature Image Side */}
        <div className="lg:col-span-6 relative min-h-[260px] lg:min-h-[480px]">
          <ResilientImage
            src={resolveImage('fairyMeadows', DEFAULT_IMAGES.fairyMeadows)}
            alt="Fairy Meadows and Nanga Parbat peak"
            className="w-full h-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#03045E]/85 via-[#03045E]/35 to-transparent"
          />
          <div className="absolute bottom-8 left-7 right-7 text-white">
            <p className="text-xs font-semibold text-[#90E0EF] mb-1">
              {brandConfig.companyName} Account &amp; Security
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
              Save your favourite valleys and manage upcoming By-Road &amp; By-Air bookings.
            </h2>
          </div>
        </div>

        {/* Right Signed-In Account Controls */}
        <div className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-center">
          <div className="text-center space-y-4 py-6">
            <div className="w-16 h-16 rounded-full bg-[#CAF0F8] border border-[#00B4D8] flex items-center justify-center mx-auto text-[#023E8A]">
              <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
            </div>
            <p className="text-xs font-bold text-[#0077B6]">
              Traveller Account Active
            </p>
            <h1 className="text-3xl font-bold text-[#03045E]">
              Welcome, {session.displayName}
            </h1>
            {session.email && (
              <p className="text-sm font-semibold text-[#0077B6]">{session.email}</p>
            )}
            <p className="text-sm text-[#03045E]/80 max-w-sm mx-auto leading-relaxed">
              You are signed in. You can sign out anytime or start planning your next trip.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => onNavigate('booking')}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn"
              >
                Book a Trip
              </button>
              <button
                type="button"
                onClick={onLockWebsite}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-[#023E8A] bg-[#CAF0F8]/70 text-[#03045E] hover:bg-[#ADE8F4] text-sm font-bold transition-colors"
              >
                <Lock className="w-4 h-4" aria-hidden="true" />
                <span>Lock Website &amp; Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

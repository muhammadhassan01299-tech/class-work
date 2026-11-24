import { lazy, Suspense, useEffect, useState } from 'react';
import { WebsiteLockScreen } from './components/AuthGate';
import { DestinationDetailModal } from './components/DestinationDetailModal';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { Footer } from './components/Footer';
import { MouseStarTrail } from './components/MouseStarTrail';
import { Navbar, type PageId } from './components/Navbar';
import { ScrollProgressBar } from './components/ScrollProgressBar';
import { MediaProvider } from './context/MediaContext';
import { SiteDataProvider } from './context/SiteDataContext';
import type { DestinationItem, TravelMode } from './data/siteConfig';
import { AboutPage } from './pages/AboutPage';
import { AuthPage } from './pages/AuthPage';
import { BookingPage } from './pages/BookingPage';
import { ContactPage } from './pages/ContactPage';
import { DestinationsPage } from './pages/DestinationsPage';
import { GalleryPage } from './pages/GalleryPage';
import { HomePage, type QuickSearchDraft } from './pages/HomePage';
import { fetchCurrentSession, signOut, type AuthSession } from './utils/authStore';

// The admin panel is a separate chunk that is only downloaded when someone opens /admin.
// There is no link to it anywhere on the public website.
const AdminApp = lazy(() => import('./pages/AdminApp'));

function isAdminPath(): boolean {
  return /^\/admin(\/|$)/i.test(window.location.pathname);
}

function PakTouristShell() {
  // undefined = still checking the server session, null = signed out
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [bookingDraft, setBookingDraft] = useState<Partial<QuickSearchDraft> | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<DestinationItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentSession().then((s) => {
      if (!cancelled) setSession(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, session]);

  const handleUnlock = (nextSession: AuthSession) => {
    setSession(nextSession);
    setCurrentPage('home');
  };

  const handleLockWebsite = () => {
    void signOut();
    setSession(null);
    setSelectedDestination(null);
    setCurrentPage('home');
  };

  const handleStartBooking = (draft: Partial<QuickSearchDraft>) => {
    setBookingDraft(draft);
    setCurrentPage('booking');
  };

  const handleBookDestination = (destinationId: string, mode?: TravelMode) => {
    setBookingDraft({ destinationId, travelMode: mode || 'road' });
    setCurrentPage('booking');
  };

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#023E8A] font-semibold" role="status">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen relative">
        <ScrollProgressBar />
        <MouseStarTrail />
        <WebsiteLockScreen onUnlock={handleUnlock} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <ScrollProgressBar />
      <MouseStarTrail />

      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        session={session}
        onLockSite={handleLockWebsite}
      />

      <main className="flex-1">
        <div key={currentPage} className="page-enter">
          {currentPage === 'home' && (
            <HomePage
              onNavigate={setCurrentPage}
              onStartBooking={handleStartBooking}
              onOpenDestination={setSelectedDestination}
            />
          )}
          {currentPage === 'destinations' && (
            <DestinationsPage
              onOpenDestination={setSelectedDestination}
              onBookDestination={handleBookDestination}
            />
          )}
          {currentPage === 'booking' && <BookingPage initialDraft={bookingDraft} session={session} />}
          {currentPage === 'gallery' && <GalleryPage />}
          {currentPage === 'about' && <AboutPage onNavigate={setCurrentPage} />}
          {currentPage === 'contact' && <ContactPage session={session} />}
          {currentPage === 'auth' && (
            <AuthPage session={session} onNavigate={setCurrentPage} onLockWebsite={handleLockWebsite} />
          )}
        </div>
      </main>

      <Footer onNavigate={setCurrentPage} />
      <FloatingWhatsApp />
      <DestinationDetailModal
        destination={selectedDestination}
        onClose={() => setSelectedDestination(null)}
        onBookDestination={handleBookDestination}
      />
    </div>
  );
}

export default function App() {
  const adminRoute = isAdminPath();

  useEffect(() => {
    if (adminRoute) {
      document.title = 'Admin';
      const meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex, nofollow';
      document.head.appendChild(meta);
      return () => {
        meta.remove();
      };
    }
    return undefined;
  }, [adminRoute]);

  return (
    <SiteDataProvider>
      <MediaProvider>
        {adminRoute ? (
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center text-[#023E8A] font-semibold" role="status">
                Loading…
              </div>
            }
          >
            <AdminApp />
          </Suspense>
        ) : (
          <PakTouristShell />
        )}
      </MediaProvider>
    </SiteDataProvider>
  );
}

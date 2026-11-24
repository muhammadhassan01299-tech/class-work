import { MessageCircle } from 'lucide-react';
import { useSiteData } from '../context/SiteDataContext';

export function FloatingWhatsApp() {
  const { brandConfig } = useSiteData();

  return (
    <a
      href={brandConfig.whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat on WhatsApp ${brandConfig.whatsappDisplay}`}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] hover:from-[#0077B6] hover:to-[#0096C7] text-white shadow-xl border border-[#90E0EF]/70 glossy-btn"
    >
      <MessageCircle className="w-5 h-5 text-[#90E0EF] shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline text-sm font-semibold whitespace-nowrap">
        WhatsApp {brandConfig.whatsappDisplay}
      </span>
    </a>
  );
}

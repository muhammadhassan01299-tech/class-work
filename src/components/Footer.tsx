import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { useSiteData } from '../context/SiteDataContext';
import type { PageId } from './Navbar';

interface FooterProps {
  onNavigate: (page: PageId) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const { logoUrl } = useMedia();
  const { brandConfig } = useSiteData();

  return (
    <footer className="bg-[#03045E] text-white border-t border-[#0077B6]/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Brand & Owner */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={brandConfig.companyName}
                  className="h-10 w-auto max-w-[130px] object-contain rounded-lg bg-white/95 p-1"
                />
              )}
              <span className="text-2xl font-bold tracking-tight text-white">
                {brandConfig.companyName}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#CAF0F8]/90">
              Owned and led by {brandConfig.ownerName}. Curated By-Road and By-Air mountain
              expeditions across Naran Kaghan, Hunza, Skardu, Swat, Fairy Meadows, and Neelum
              Valley.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Explore Pages</h3>
            <ul className="space-y-2.5 text-sm text-[#CAF0F8]/90">
              {(
                [
                  ['home', 'Home'],
                  ['destinations', 'Destinations'],
                  ['booking', 'Book a Trip'],
                  ['gallery', 'Nature Gallery'],
                  ['about', 'About Pak Tourist'],
                  ['contact', 'Contact & FAQs'],
                  ['auth', 'My Account'],
                ] as [PageId, string][]
              ).map(([id, label]) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(id)}
                    className="hover:text-[#48CAE4] transition-colors text-left"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Top Routes */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Popular Routes</h3>
            <ul className="space-y-2.5 text-sm text-[#CAF0F8]/90">
              <li>Naran Kaghan &amp; Saif-ul-Mulook</li>
              <li>Hunza Valley &amp; Attabad Lake</li>
              <li>Skardu, Shangrila &amp; Deosai</li>
              <li>Swat, Kalam &amp; Malam Jabba</li>
              <li>Fairy Meadows &amp; Nanga Parbat</li>
              <li>Neelum Valley &amp; Arang Kel</li>
            </ul>
          </div>

          {/* Column 4: Direct Contact */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white mb-4">Direct Desk</h3>
            <a
              href={brandConfig.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-sm text-[#CAF0F8] hover:text-[#48CAE4] transition-colors"
            >
              <Phone className="w-4 h-4 text-[#00B4D8] shrink-0" aria-hidden="true" />
              <span className="tabular-nums">WhatsApp: {brandConfig.whatsappDisplay}</span>
            </a>
            <a
              href={`mailto:${brandConfig.email}`}
              className="flex items-center gap-2.5 text-sm text-[#CAF0F8] hover:text-[#48CAE4] transition-colors break-all"
            >
              <Mail className="w-4 h-4 text-[#00B4D8] shrink-0" aria-hidden="true" />
              <span>{brandConfig.email}</span>
            </a>
            <div className="flex items-start gap-2.5 text-sm text-[#CAF0F8]/90">
              <MapPin className="w-4 h-4 text-[#00B4D8] shrink-0 mt-0.5" aria-hidden="true" />
              <span>{brandConfig.headquarters}</span>
            </div>

            <div className="pt-3 flex items-center gap-3">
              <a
                href={brandConfig.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0077B6] hover:bg-[#0096C7] text-white text-xs font-semibold glossy-btn"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>Chat with {brandConfig.ownerName}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#0077B6]/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#90E0EF]">
          <p>
            © {new Date().getFullYear()} {brandConfig.companyName}. All rights reserved. Prices in
            Pakistani Rupees (PKR).
          </p>
          <p>
            Managed by {brandConfig.ownerName} · {brandConfig.officeHours}
          </p>
        </div>
      </div>
    </footer>
  );
}

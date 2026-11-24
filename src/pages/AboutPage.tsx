import { Award, Compass, HeartHandshake, ShieldCheck } from 'lucide-react';
import { AnimatedCounter } from '../components/AnimatedCounter';
import type { PageId } from '../components/Navbar';
import { ResilientImage } from '../components/ResilientImage';
import { useMedia } from '../context/MediaContext';
import { useSiteData } from '../context/SiteDataContext';
import {
  COMPANY_STATS,
  DEFAULT_IMAGES,
  TEAM_MEMBERS,
} from '../data/siteConfig';

export function AboutPage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { ownerPhotoUrl, resolveImage } = useMedia();
  const { brandConfig } = useSiteData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-20">
      {/* Intro & Company Story */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <p className="text-sm font-semibold text-[#0077B6]">Our Story</p>
          <h1 className="text-3xl sm:text-5xl font-bold text-[#03045E] leading-tight">
            Crafted for Safe, Unforgettable Journeys Across Pakistan
          </h1>
          <p className="text-base sm:text-lg text-[#03045E]/85 leading-relaxed">
            Founded by {brandConfig.ownerName}, {brandConfig.companyName} began with a clear
            promise: make travelling to Pakistan’s northern valleys and Kashmir effortless, transparent
            in PKR, and deeply respectful of mountain hospitality.
          </p>
          <p className="text-base text-[#03045E]/80 leading-relaxed">
            Whether you are planning a quiet family sedan trip to Naran Kaghan, a corporate
            coaster retreat in Swat, or a fast By-Air escape to Skardu and Hunza, our team handles
            every transfer, room, and local jeep detail.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('booking')}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn"
            >
              Plan Your Trip
            </button>
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="px-6 py-3 rounded-2xl border border-[#90E0EF] bg-white text-[#03045E] hover:bg-[#CAF0F8] text-sm font-bold transition-colors"
            >
              Talk to {brandConfig.ownerName}
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="glass-card rounded-3xl p-3 bg-white/90">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden">
              <ResilientImage
                src={resolveImage('hunza', DEFAULT_IMAGES.hunza)}
                alt="Hunza Valley terraces and Rakaposhi peak"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Owner Profile Card */}
      <section className="glass-card rounded-3xl p-7 sm:p-10 bg-white/90 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-4 flex flex-col items-center text-center">
          {ownerPhotoUrl ? (
            <img
              src={ownerPhotoUrl}
              alt={`${brandConfig.ownerName} — Founder of Pak Tourist`}
              className="w-40 h-40 rounded-3xl object-cover border-2 border-[#90E0EF] shadow-lg"
            />
          ) : (
            <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-[#023E8A] to-[#0077B6] text-white flex flex-col items-center justify-center shadow-lg border border-[#90E0EF]">
              <span className="text-4xl font-bold">{brandConfig.ownerName.charAt(0).toUpperCase()}</span>
              <span className="text-xs text-[#CAF0F8] mt-1">Founder</span>
            </div>
          )}
        </div>

        <div className="md:col-span-8 space-y-3">
          <p className="text-sm font-semibold text-[#0077B6]">Founder’s Message</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#03045E]">
            {brandConfig.ownerName} · Owner, {brandConfig.companyName}
          </h2>
          <blockquote className="text-base sm:text-lg text-[#03045E]/85 leading-relaxed">
            “When families trust us with their holidays in Naran, Hunza, Skardu, or Neelum Valley,
            they deserve honest PKR rates, reliable vehicles, and someone who answers the phone at
            any hour. That personal accountability is at the heart of Pak Tourist.”
          </blockquote>
          <p className="text-sm font-semibold text-[#023E8A]">
            Direct WhatsApp: {brandConfig.whatsappDisplay} · {brandConfig.email}
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-3xl p-7 bg-white/85">
          <Compass className="w-8 h-8 text-[#0077B6] mb-3" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-[#03045E] mb-2">Our Mission</h2>
          <p className="text-base text-[#03045E]/80 leading-relaxed">
            To connect domestic and international travellers with Pakistan’s breathtaking regions
            through dependable By-Road and By-Air logistics, fair local partnerships, and warm
            personal support.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-7 bg-white/85">
          <HeartHandshake className="w-8 h-8 text-[#023E8A] mb-3" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-[#03045E] mb-2">Our Vision</h2>
          <p className="text-base text-[#03045E]/80 leading-relaxed">
            To become Pakistan’s most trusted family and group tour planner—where planning a trip
            to the Himalayas or Karakoram feels as peaceful as standing beside Lake Saif-ul-Mulook.
          </p>
        </div>
      </section>

      {/* Animated Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {COMPANY_STATS.map((stat) => (
          <div key={stat.label} className="glass-card rounded-3xl p-6 text-center bg-white/90">
            <div className="text-3xl sm:text-4xl font-bold text-[#023E8A]">
              <AnimatedCounter target={stat.value} suffix={stat.suffix} />
            </div>
            <p className="text-sm text-[#03045E]/80 mt-2">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Team & Trust Pillars */}
      <section>
        <div className="max-w-2xl mb-8">
          <p className="text-sm font-semibold text-[#0077B6] mb-1.5">Operations Team</p>
          <h2 className="text-3xl font-bold text-[#03045E]">People Behind Every Smooth Mile</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TEAM_MEMBERS.map((member) => (
            <div key={member.id} className="glass-card rounded-3xl p-6 bg-white/90 space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-[#CAF0F8] border border-[#90E0EF] flex items-center justify-center text-[#023E8A] font-bold text-lg">
                {member.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#03045E]">{member.name}</h3>
                <p className="text-xs font-semibold text-[#0077B6]">{member.role}</p>
              </div>
              <p className="text-sm text-[#03045E]/80 leading-relaxed">{member.bio}</p>
              <p className="text-xs font-semibold text-[#023E8A] pt-1">{member.experience}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-3xl p-7 bg-[#ADE8F4]/40 border border-[#90E0EF] grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="flex items-start gap-4">
          <ShieldCheck className="w-8 h-8 text-[#023E8A] shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-bold text-[#03045E]">Verified Vehicles &amp; Hotels</h3>
            <p className="text-sm text-[#03045E]/80 mt-1">
              Every car, Hiace, coaster, and mountain resort is pre-checked for family safety and
              cleanliness before departure.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <Award className="w-8 h-8 text-[#0077B6] shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-bold text-[#03045E]">Weather-Aware Contingency</h3>
            <p className="text-sm text-[#03045E]/80 mt-1">
              For By-Air travellers to Skardu or Gilgit, we always hold backup highway plans in
              case of mountain flight visibility shifts.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

import React, { useState } from 'react';
import { ChevronDown, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useSiteData } from '../context/SiteDataContext';
import { FAQS } from '../data/siteConfig';
import { errorMessage } from '../utils/api';
import type { AuthSession } from '../utils/authStore';

export function ContactPage({ session }: { session?: AuthSession | null }) {
  const { brandConfig, addInquiry } = useSiteData();
  const [name, setName] = useState(session?.displayName ?? '');
  const [email, setEmail] = useState(session?.email ?? '');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQS[0].id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setFormError('Please enter your name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (message.trim().length < 8) {
      setFormError('Please share a brief message about your trip inquiry.');
      return;
    }
    setFormError(null);
    setSending(true);
    try {
      await addInquiry({
        type: 'contact',
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || 'Not provided',
        message: message.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setFormError(errorMessage(err, 'Could not send your message. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-16">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-[#0077B6] mb-2">Get in Touch</p>
        <h1 className="text-3xl sm:text-5xl font-bold text-[#03045E] mb-3">
          Contact {brandConfig.companyName}
        </h1>
        <p className="text-base text-[#03045E]/80">
          Have a custom group request, honeymoon itinerary, or corporate tour? Reach{' '}
          {brandConfig.ownerName} directly via WhatsApp, email, or the inquiry form below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Direct Contact & Stylized Hub Map */}
        <div className="lg:col-span-5 space-y-5">
          <div className="glass-card rounded-3xl p-6 bg-white/90 space-y-4">
            <h2 className="text-xl font-bold text-[#03045E]">Direct Channels</h2>

            <a
              href={brandConfig.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white glossy-btn"
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-[#90E0EF]" aria-hidden="true" />
                <div>
                  <span className="block text-xs text-[#CAF0F8]">WhatsApp Instant Desk</span>
                  <span className="text-base font-bold tabular-nums">
                    {brandConfig.whatsappDisplay}
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold underline">Chat Now</span>
            </a>

            <a
              href={`mailto:${brandConfig.email}`}
              className="flex items-center gap-3 p-4 rounded-2xl border border-[#90E0EF] bg-[#CAF0F8]/35 hover:bg-[#ADE8F4]/45 transition-colors"
            >
              <Mail className="w-5 h-5 text-[#0077B6] shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <span className="block text-xs text-[#0077B6]">Official Email</span>
                <span className="text-sm font-bold text-[#03045E] break-all">
                  {brandConfig.email}
                </span>
              </div>
            </a>

            <div className="flex items-start gap-3 p-4 rounded-2xl border border-[#90E0EF] bg-white">
              <Phone className="w-5 h-5 text-[#023E8A] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <span className="block text-xs text-[#0077B6]">Owner &amp; Operations Lead</span>
                <span className="text-sm font-bold text-[#03045E]">
                  {brandConfig.ownerName} · {brandConfig.officeHours}
                </span>
              </div>
            </div>
          </div>

          {/* Stylized Route & Islamabad Hub Map Placeholder */}
          <div className="glass-card rounded-3xl p-6 bg-white/90">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-[#0077B6]" aria-hidden="true" />
              <h2 className="text-lg font-bold text-[#03045E]">
                Dispatch Hub · {brandConfig.headquarters}
              </h2>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-[#CAF0F8] via-[#ADE8F4]/60 to-[#90E0EF]/50 border border-[#90E0EF] p-5 relative overflow-hidden">
              <svg
                viewBox="0 0 360 150"
                className="w-full h-36"
                aria-label="Northern corridor dispatch map from Islamabad to Naran, Swat, Skardu, and Hunza"
              >
                <path
                  d="M40 120 Q 110 100, 145 75 T 235 45 T 320 26"
                  fill="none"
                  stroke="#023E8A"
                  strokeWidth="2.5"
                  strokeDasharray="5 5"
                />
                <path
                  d="M40 120 Q 165 115, 290 85"
                  fill="none"
                  stroke="#0077B6"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                {[
                  { x: 40, y: 120, label: 'Islamabad Hub' },
                  { x: 145, y: 75, label: 'Naran' },
                  { x: 235, y: 45, label: 'Hunza' },
                  { x: 320, y: 26, label: 'Khunjerab' },
                  { x: 290, y: 85, label: 'Skardu (By Air)' },
                ].map((pt) => (
                  <g key={pt.label}>
                    <circle cx={pt.x} cy={pt.y} r="5.5" fill="#023E8A" stroke="#FFFFFF" strokeWidth="2" />
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#03045E"
                    >
                      {pt.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* Right: Contact Form */}
        <div className="lg:col-span-7 glass-card rounded-3xl p-6 sm:p-8 bg-white/95">
          {submitted ? (
            <div className="py-10 text-center space-y-4">
              <h2 className="text-2xl font-bold text-[#03045E]">Message Sent to {brandConfig.ownerName}</h2>
              <p className="text-base text-[#03045E]/80 max-w-md mx-auto">
                Thank you, {name}. We have logged your inquiry and will reply via email or WhatsApp
                shortly.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setName('');
                  setEmail('');
                  setPhone('');
                  setMessage('');
                }}
                className="px-6 py-2.5 rounded-2xl bg-[#023E8A] text-white text-sm font-bold glossy-btn"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-2xl font-bold text-[#03045E]">Send a Message</h2>
              {formError && (
                <p className="p-3 rounded-xl bg-[#CAF0F8] border border-[#0077B6] text-sm font-semibold text-[#03045E]">
                  {formError}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-bold text-[#023E8A] mb-1.5">
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="block text-sm font-bold text-[#023E8A] mb-1.5">
                    Phone / WhatsApp
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03XX-XXXXXXX"
                    className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-sm font-bold text-[#023E8A] mb-1.5">
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                />
              </div>

              <div>
                <label htmlFor="contact-msg" className="block text-sm font-bold text-[#023E8A] mb-1.5">
                  Trip Inquiry
                </label>
                <textarea
                  id="contact-msg"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us your preferred valley, dates, group size, and whether you want By Road or By Air..."
                  className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* FAQ Accordion */}
      <section className="max-w-4xl">
        <h2 className="text-3xl font-bold text-[#03045E] mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div
                key={faq.id}
                className="glass-card rounded-2xl bg-white/90 border border-[#90E0EF] overflow-hidden"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-[#03045E] hover:bg-[#CAF0F8]/35 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#0077B6] shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm sm:text-base text-[#03045E]/80 leading-relaxed border-t border-[#CAF0F8]">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

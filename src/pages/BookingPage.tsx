import { CheckCircle2, MessageCircle, Plane, Car } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSiteData } from '../context/SiteDataContext';
import type { TravelMode } from '../data/siteConfig';
import { errorMessage } from '../utils/api';
import type { AuthSession } from '../utils/authStore';
import {
  buildWhatsAppBookingUrl,
  calculateTripEstimate,
  formatPKR,
  validateTravellerDetails,
  type TravellerValidationErrors,
} from '../utils/bookingMath';
import type { QuickSearchDraft } from './HomePage';

interface BookingPageProps {
  initialDraft: Partial<QuickSearchDraft> | null;
  session?: AuthSession | null;
}

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function BookingPage({ initialDraft, session }: BookingPageProps) {
  const { destinations, specialOffer, brandConfig, addBooking, pricing } = useSiteData();
  const ROAD_VEHICLES = pricing.roadVehicles;
  const AIR_CLASSES = pricing.airClasses;
  const DEPARTURE_CITIES = pricing.departureCities;
  const todayStr = isoDateOffset(0);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [destinationId, setDestinationId] = useState(
    initialDraft?.destinationId || destinations[0]?.id || ''
  );
  const [departureCity, setDepartureCity] = useState(
    initialDraft?.departureCity || DEPARTURE_CITIES[0]
  );
  const [travelDate, setTravelDate] = useState(initialDraft?.travelDate || isoDateOffset(14));
  const [travelMode, setTravelMode] = useState<TravelMode>(initialDraft?.travelMode || 'road');
  const [vehicleId, setVehicleId] = useState(ROAD_VEHICLES[0].id);
  const [airClassId, setAirClassId] = useState(AIR_CLASSES[0].id);

  const [fullName, setFullName] = useState(session?.displayName ?? '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(session?.email ?? '');
  const [travellers, setTravellers] = useState(initialDraft?.travellers || 2);
  const [notes, setNotes] = useState('');
  const [applySeasonalOffer, setApplySeasonalOffer] = useState(
    Boolean(initialDraft?.applyOffer)
  );
  const [errors, setErrors] = useState<TravellerValidationErrors>({});
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialDraft) return;
    if (initialDraft.destinationId) setDestinationId(initialDraft.destinationId);
    if (initialDraft.departureCity) setDepartureCity(initialDraft.departureCity);
    if (initialDraft.travelDate) setTravelDate(initialDraft.travelDate);
    if (initialDraft.travellers) setTravellers(initialDraft.travellers);
    if (initialDraft.travelMode) setTravelMode(initialDraft.travelMode);
    if (initialDraft.applyOffer !== undefined) setApplySeasonalOffer(initialDraft.applyOffer);
    setConfirmedRef(null);
  }, [initialDraft]);

  const selectedDestination =
    destinations.find((d) => d.id === destinationId) ?? destinations[0];
  const supportsAir = selectedDestination.modes.includes('air');

  // If user switches to a road-only destination while air was chosen, sync mode safely
  useEffect(() => {
    if (!supportsAir && travelMode === 'air') {
      setTravelMode('road');
    }
  }, [supportsAir, travelMode]);

  const estimate = calculateTripEstimate({
    destinationId: selectedDestination.id,
    travelMode,
    vehicleId,
    airClassId,
    travellers,
    applySeasonalOffer,
    destinationsList: destinations,
    discountPerPersonOverridePKR: specialOffer.discountPerPersonPKR,
    vehicles: ROAD_VEHICLES,
    airClasses: AIR_CLASSES,
  });

  const whatsAppUrl = buildWhatsAppBookingUrl({
    destinationName: selectedDestination.name,
    departureCity,
    travelDate,
    modeLabel: estimate.modeLabel,
    travellers,
    fullName,
    phone,
    estimatedTotalPKR: estimate.estimatedTotalPKR,
    referenceCode: confirmedRef ?? undefined,
    ownerName: brandConfig.ownerName,
    companyName: brandConfig.companyName,
    whatsappLink: brandConfig.whatsappLink,
  });

  const handleNextFromStep3 = () => {
    const validation = validateTravellerDetails({
      fullName,
      phone,
      email,
      travellers,
    });
    setErrors(validation);
    if (Object.keys(validation).length === 0) {
      setStep(4);
    }
  };

  const handleConfirmBooking = async (alsoOpenWhatsApp = false) => {
    if (submitting) return;
    const validation = validateTravellerDetails({
      fullName,
      phone,
      email,
      travellers,
    });
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setStep(3);
      return;
    }
    if (!travelDate || travelDate < todayStr) {
      setSubmitError('Please choose a departure date from today onwards.');
      setStep(1);
      return;
    }

    // Open the WhatsApp tab straight from the click so the browser does not block it.
    const waWindow = alsoOpenWhatsApp ? window.open('', '_blank') : null;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const saved = await addBooking({
        customerName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        departureCity,
        destinationId: selectedDestination.id,
        destinationName: selectedDestination.name,
        travelDate,
        travellers,
        travelMode,
        modeLabel: estimate.modeLabel,
        estimatedTotalPKR: estimate.estimatedTotalPKR,
        notes: notes.trim() || undefined,
      });
      if (waWindow) {
        waWindow.location.href = buildWhatsAppBookingUrl({
          destinationName: selectedDestination.name,
          departureCity,
          travelDate,
          modeLabel: estimate.modeLabel,
          travellers,
          fullName,
          phone,
          estimatedTotalPKR: estimate.estimatedTotalPKR,
          referenceCode: saved.referenceCode,
          ownerName: brandConfig.ownerName,
          companyName: brandConfig.companyName,
          whatsappLink: brandConfig.whatsappLink,
        });
      }
      setConfirmedRef(saved.referenceCode);
    } catch (err) {
      waWindow?.close();
      setSubmitError(errorMessage(err, 'Could not send your booking. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetBooking = () => {
    setConfirmedRef(null);
    setStep(1);
    setFullName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setErrors({});
    setSubmitError(null);
    setTravelDate(isoDateOffset(14));
  };

  if (confirmedRef) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="glass-card rounded-3xl p-8 sm:p-10 bg-white/95 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-[#CAF0F8] border border-[#00B4D8] flex items-center justify-center mx-auto text-[#023E8A]">
            <CheckCircle2 className="w-9 h-9" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-[#0077B6]">
            Booking Request Received · Reference <span className="tabular-nums">{confirmedRef}</span>
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#03045E]">
            Thank You, {fullName}!
          </h1>
          <p className="text-base text-[#03045E]/80 max-w-xl mx-auto leading-relaxed">
            Your itinerary request for <strong>{selectedDestination.name}</strong> is ready.{' '}
            {brandConfig.ownerName}’s desk will reach out shortly, or you can send this instant
            summary directly on WhatsApp.
          </p>

          <div className="text-left rounded-2xl bg-[#CAF0F8]/45 border border-[#90E0EF] p-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#0077B6]">Destination</span>
              <span className="font-bold text-[#03045E]">{selectedDestination.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#0077B6]">Departure</span>
              <span className="font-bold text-[#03045E]">
                {departureCity} · {travelDate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#0077B6]">Travel Mode</span>
              <span className="font-bold text-[#03045E]">{estimate.modeLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#0077B6]">Travellers</span>
              <span className="font-bold text-[#03045E] tabular-nums">{travellers} Persons</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#90E0EF] text-base">
              <span className="font-bold text-[#03045E]">Estimated Total</span>
              <span className="font-bold text-[#023E8A] tabular-nums">
                {formatPKR(estimate.estimatedTotalPKR)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn"
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              <span>Send Summary on WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={resetBooking}
              className="px-6 py-3 rounded-2xl border border-[#90E0EF] bg-white text-[#03045E] hover:bg-[#CAF0F8] text-sm font-bold transition-colors"
            >
              Book Another Trip
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <div className="max-w-3xl mb-10">
        <p className="text-sm font-semibold text-[#0077B6] mb-2">Online Trip Reservation</p>
        <h1 className="text-3xl sm:text-5xl font-bold text-[#03045E] mb-3">
          Plan &amp; Book Your Pakistan Tour
        </h1>
        <p className="text-base text-[#03045E]/80">
          Complete the four steps below for an instant PKR estimate, then confirm or message {brandConfig.ownerName}
          directly on WhatsApp.
        </p>
      </div>

      {/* Step Progress Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {(
          [
            [1, '01. Destination & Date'],
            [2, '02. Road or Air Mode'],
            [3, '03. Traveller Details'],
            [4, '04. PKR Summary'],
          ] as [1 | 2 | 3 | 4, string][]
        ).map(([idx, label]) => {
          const active = step === idx;
          const completed = step > idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (idx <= step) setStep(idx);
              }}
              className={`px-4 py-3 rounded-2xl text-left text-xs sm:text-sm font-bold border transition-all ${
                active
                  ? 'bg-[#023E8A] text-white border-[#023E8A] shadow-lg'
                  : completed
                    ? 'bg-[#ADE8F4]/70 text-[#03045E] border-[#00B4D8]'
                    : 'bg-white/75 text-[#03045E]/70 border-[#90E0EF]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Main Wizard Card */}
        <div className="lg:col-span-8 glass-card rounded-3xl p-6 sm:p-8 bg-white/95">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#03045E]">
                Step 1: Choose Destination &amp; Departure Date
              </h2>
              {submitError && (
                <p role="alert" className="p-3 rounded-xl bg-[#CAF0F8] border border-[#023E8A] text-sm font-semibold text-[#03045E]">
                  {submitError}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="book-destination"
                    className="block text-sm font-bold text-[#023E8A] mb-1.5"
                  >
                    Destination
                  </label>
                  <select
                    id="book-destination"
                    value={destinationId}
                    onChange={(e) => setDestinationId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  >
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.durationLabel} · From {formatPKR(d.basePricePKR)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="book-departure"
                    className="block text-sm font-bold text-[#023E8A] mb-1.5"
                  >
                    Departure City
                  </label>
                  <select
                    id="book-departure"
                    value={departureCity}
                    onChange={(e) => setDepartureCity(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  >
                    {DEPARTURE_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="book-date"
                    className="block text-sm font-bold text-[#023E8A] mb-1.5"
                  >
                    Departure Date
                  </label>
                  <input
                    id="book-date"
                    type="date"
                    min={todayStr}
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-7 py-3 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn"
                >
                  Continue to Travel Mode
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#03045E]">
                Step 2: Select By Road or By Air
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTravelMode('road')}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    travelMode === 'road'
                      ? 'border-[#023E8A] bg-[#CAF0F8]/60 shadow-md'
                      : 'border-[#90E0EF] bg-white hover:bg-[#CAF0F8]/30'
                  }`}
                >
                  <Car className="w-6 h-6 text-[#023E8A] mb-2" aria-hidden="true" />
                  <h3 className="text-lg font-bold text-[#03045E]">By Road Fleet</h3>
                  <p className="text-sm text-[#03045E]/80 mt-1">
                    Private Car, Hiace Grand Cabin, Coaster, or Luxury Bus.
                  </p>
                </button>

                <button
                  type="button"
                  disabled={!supportsAir}
                  onClick={() => supportsAir && setTravelMode('air')}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    !supportsAir
                      ? 'border-[#CAF0F8] bg-white/50 opacity-55 cursor-not-allowed'
                      : travelMode === 'air'
                        ? 'border-[#023E8A] bg-[#CAF0F8]/60 shadow-md'
                        : 'border-[#90E0EF] bg-white hover:bg-[#CAF0F8]/30'
                  }`}
                >
                  <Plane className="w-6 h-6 text-[#0077B6] mb-2" aria-hidden="true" />
                  <h3 className="text-lg font-bold text-[#03045E]">By Air Package</h3>
                  <p className="text-sm text-[#03045E]/80 mt-1">
                    {supportsAir
                      ? 'Return mountain flights + private 4x4 airport transfers.'
                      : 'Only available on Hunza, Skardu, Fairy Meadows & Chitral routes.'}
                  </p>
                </button>
              </div>

              {travelMode === 'road' ? (
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-[#023E8A]">Select Vehicle Type</h3>
                  {estimate.vehiclesNeeded > 1 && (
                    <p className="text-xs font-semibold text-[#0077B6]" role="status">
                      A group of {travellers} needs {estimate.vehiclesNeeded} vehicles of this type. The price already includes all of them.
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ROAD_VEHICLES.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVehicleId(v.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          vehicleId === v.id
                            ? 'border-[#023E8A] bg-[#ADE8F4]/45'
                            : 'border-[#90E0EF] bg-white hover:bg-[#CAF0F8]/35'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#03045E]">{v.name}</span>
                          <span className="text-xs font-semibold text-[#0077B6] tabular-nums">
                            +{formatPKR(v.dailySurchargePKR)}/day
                          </span>
                        </div>
                        <p className="text-xs text-[#0077B6] mt-0.5">{v.capacity}</p>
                        <p className="text-xs text-[#03045E]/80 mt-1.5">{v.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-[#023E8A]">Select Flight Package Class</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AIR_CLASSES.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAirClassId(a.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          airClassId === a.id
                            ? 'border-[#023E8A] bg-[#ADE8F4]/45'
                            : 'border-[#90E0EF] bg-white hover:bg-[#CAF0F8]/35'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#03045E]">{a.name}</span>
                          <span className="text-xs font-semibold text-[#0077B6] tabular-nums">
                            +{formatPKR(a.perPersonSurchargePKR)}/person
                          </span>
                        </div>
                        <p className="text-xs text-[#03045E]/80 mt-1.5">{a.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-2xl border border-[#90E0EF] text-[#03045E] hover:bg-[#CAF0F8] text-sm font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-7 py-3 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn"
                >
                  Continue to Details
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-2xl font-bold text-[#03045E]">Step 3: Traveller Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="traveller-name"
                    className="block text-sm font-bold text-[#023E8A] mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="traveller-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Bilal Ahmed"
                    className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  />
                  {errors.fullName && (
                    <p className="text-xs font-semibold text-[#023E8A] mt-1">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="traveller-phone"
                    className="block text-sm font-bold text-[#023E8A] mb-1.5"
                  >
                    Phone / WhatsApp Number
                  </label>
                  <input
                    id="traveller-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03XX-XXXXXXX"
                    className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  />
                  {errors.phone && (
                    <p className="text-xs font-semibold text-[#023E8A] mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="traveller-email"
                    className="block text-sm font-bold text-[#023E8A] mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="traveller-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  />
                  {errors.email && (
                    <p className="text-xs font-semibold text-[#023E8A] mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="traveller-count"
                    className="block text-sm font-bold text-[#023E8A] mb-1.5"
                  >
                    Number of Travellers
                  </label>
                  <input
                    id="traveller-count"
                    type="number"
                    min={1}
                    max={40}
                    value={travellers}
                    onChange={(e) => setTravellers(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] tabular-nums focus:outline-none focus:border-[#0077B6]"
                  />
                  {errors.travellers && (
                    <p className="text-xs font-semibold text-[#023E8A] mt-1">
                      {errors.travellers}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="traveller-notes"
                    className="block text-sm font-bold text-[#023E8A] mb-1.5"
                  >
                    Special Requests (Optional)
                  </label>
                  <textarea
                    id="traveller-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Hotel room preferences, child seat, honeymoon setup..."
                    className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-2xl border border-[#90E0EF] text-[#03045E] hover:bg-[#CAF0F8] text-sm font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextFromStep3}
                  className="px-7 py-3 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn"
                >
                  Review Summary
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#03045E]">
                Step 4: Booking Summary &amp; Confirmation
              </h2>
              {submitError && (
                <p role="alert" className="p-3 rounded-xl bg-[#CAF0F8] border border-[#023E8A] text-sm font-semibold text-[#03045E]">
                  {submitError}
                </p>
              )}

              <div className="rounded-2xl border border-[#90E0EF] bg-[#CAF0F8]/35 p-5 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#0077B6]">Destination</span>
                  <span className="font-bold text-[#03045E]">{selectedDestination.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#0077B6]">From &amp; Date</span>
                  <span className="font-bold text-[#03045E]">
                    {departureCity} · {travelDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#0077B6]">Travel Service</span>
                  <span className="font-bold text-[#03045E]">{estimate.modeLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#0077B6]">Primary Traveller</span>
                  <span className="font-bold text-[#03045E]">
                    {fullName} ({phone})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#0077B6]">Group Size</span>
                  <span className="font-bold text-[#03045E] tabular-nums">
                    {travellers} Persons
                  </span>
                </div>
                {notes && (
                  <div className="pt-2 border-t border-[#90E0EF]">
                    <span className="text-[#0077B6] block mb-0.5">Notes</span>
                    <span className="text-[#03045E]">{notes}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-2xl border border-[#90E0EF] text-[#03045E] hover:bg-[#CAF0F8] text-sm font-bold"
                >
                  Edit Details
                </button>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleConfirmBooking(true)}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-[#0077B6] bg-white text-[#023E8A] hover:bg-[#CAF0F8] text-sm font-bold transition-colors disabled:opacity-60"
                  >
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    <span>Confirm &amp; Send on WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmBooking(false)}
                    disabled={submitting}
                    className="px-7 py-3 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn disabled:opacity-60"
                  >
                    {submitting ? 'Sending…' : 'Confirm Booking'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Live PKR Estimate Card */}
        <aside className="lg:col-span-4 glass-card rounded-3xl p-6 bg-white/95 lg:sticky lg:top-24 space-y-5">
          <div>
            <p className="text-xs font-bold text-[#0077B6] mb-1">Live PKR Calculator</p>
            <h3 className="text-xl font-bold text-[#03045E]">{selectedDestination.name}</h3>
            <p className="text-xs text-[#03045E]/75 mt-0.5">{estimate.durationLabel}</p>
          </div>

          <div className="space-y-2.5 text-sm border-t border-b border-[#CAF0F8] py-4">
            <div className="flex justify-between">
              <span className="text-[#03045E]/80">Base Rate × {travellers}</span>
              <span className="font-semibold text-[#03045E] tabular-nums">
                {formatPKR(estimate.basePerPersonPKR * travellers)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#03045E]/80">
                {travelMode === 'air' ? 'Airfare & 4x4 Transfer' : 'Vehicle Upgrade Share'}
              </span>
              <span className="font-semibold text-[#03045E] tabular-nums">
                {formatPKR(estimate.modePerPersonPKR * travellers)}
              </span>
            </div>
            {estimate.discountTotalPKR > 0 && (
              <div className="flex justify-between text-[#0077B6]">
                <span>Seasonal Offer ({specialOffer.promoCode})</span>
                <span className="font-bold tabular-nums">
                  -{formatPKR(estimate.discountTotalPKR)}
                </span>
              </div>
            )}
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#03045E] p-3 rounded-xl bg-[#CAF0F8]/50 border border-[#90E0EF]">
            <input
              type="checkbox"
              checked={applySeasonalOffer}
              onChange={(e) => setApplySeasonalOffer(e.target.checked)}
              className="mt-0.5 accent-[#023E8A]"
            />
            <span>
              Apply Seasonal Offer (<strong>{specialOffer.promoCode}</strong> — Save{' '}
              {formatPKR(specialOffer.discountPerPersonPKR)}/person)
            </span>
          </label>

          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold text-[#03045E]">Estimated Total</span>
            <span className="text-2xl font-bold text-[#023E8A] tabular-nums">
              {formatPKR(estimate.estimatedTotalPKR)}
            </span>
          </div>

          <p className="text-xs text-[#03045E]/70 leading-relaxed">
            No upfront card charge required here. Confirming generates your reference ID for{' '}
            {brandConfig.ownerName}’s desk ({brandConfig.whatsappDisplay}).
          </p>
        </aside>
      </div>
    </div>
  );
}

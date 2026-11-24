import {
  AIR_CLASSES,
  BRAND_CONFIG,
  DESTINATIONS,
  ROAD_VEHICLES,
  SPECIAL_OFFER,
  type AirClassOption,
  type RoadVehicleOption,
  type TravelMode,
} from '../data/siteConfig';

export interface BookingEstimateInput {
  destinationId: string;
  travelMode: TravelMode;
  vehicleId: string;
  airClassId: string;
  travellers: number;
  applySeasonalOffer?: boolean;
  destinationsList?: typeof DESTINATIONS;
  /** Admin-editable rates. Fall back to the built-in defaults when omitted. */
  vehicles?: RoadVehicleOption[];
  airClasses?: AirClassOption[];
  discountPerPersonOverridePKR?: number;
}

export interface BookingEstimateResult {
  basePerPersonPKR: number;
  modePerPersonPKR: number;
  discountPerPersonPKR: number;
  subtotalPKR: number;
  discountTotalPKR: number;
  estimatedTotalPKR: number;
  modeLabel: string;
  durationLabel: string;
  /** Road only: how many vehicles the group needs (e.g. 20 people on 12-seat vans = 2). */
  vehiclesNeeded: number;
}

export interface TravellerValidationInput {
  fullName: string;
  phone: string;
  email: string;
  travellers: number;
}

export interface TravellerValidationErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  travellers?: string;
}

export function formatPKR(amount: number): string {
  const safe = Math.max(0, Math.round(amount));
  return `PKR ${safe.toLocaleString('en-US')}`;
}

export function calculateTripEstimate(input: BookingEstimateInput): BookingEstimateResult {
  const sourceDestinations = input.destinationsList && input.destinationsList.length > 0
    ? input.destinationsList
    : DESTINATIONS;
  const destination =
    sourceDestinations.find((d) => d.id === input.destinationId) ?? sourceDestinations[0];
  const travellers = Math.max(1, Math.min(40, Math.floor(input.travellers || 1)));
  const basePerPersonPKR = destination.basePricePKR;

  let modePerPersonPKR = 0;
  let modeLabel = '';

  let vehiclesNeeded = 1;

  if (input.travelMode === 'air') {
    const airList = input.airClasses && input.airClasses.length > 0 ? input.airClasses : AIR_CLASSES;
    const airOption = airList.find((a) => a.id === input.airClassId) ?? airList[0];
    modePerPersonPKR = airOption.perPersonSurchargePKR;
    modeLabel = `By Air · ${airOption.name}`;
  } else {
    const vehicleList = input.vehicles && input.vehicles.length > 0 ? input.vehicles : ROAD_VEHICLES;
    const vehicle = vehicleList.find((v) => v.id === input.vehicleId) ?? vehicleList[0];
    // The whole group shares the cost of every vehicle it needs for the full trip duration.
    vehiclesNeeded = Math.max(1, Math.ceil(travellers / Math.max(1, vehicle.capacityPassengers || 1)));
    const totalVehicleCost = vehicle.dailySurchargePKR * destination.durationDays * vehiclesNeeded;
    modePerPersonPKR = Math.round(totalVehicleCost / travellers);
    modeLabel = `By Road · ${vehicle.name}`;
  }

  const offerPerPerson =
    input.discountPerPersonOverridePKR !== undefined
      ? input.discountPerPersonOverridePKR
      : SPECIAL_OFFER.discountPerPersonPKR;

  const discountPerPersonPKR = input.applySeasonalOffer ? offerPerPerson : 0;

  const subtotalPKR = (basePerPersonPKR + modePerPersonPKR) * travellers;
  const discountTotalPKR = Math.min(Math.max(0, subtotalPKR - 5000), discountPerPersonPKR * travellers);
  const safeDiscount = Math.max(0, discountTotalPKR);
  const estimatedTotalPKR = Math.max(0, subtotalPKR - safeDiscount);

  return {
    basePerPersonPKR,
    modePerPersonPKR,
    discountPerPersonPKR,
    subtotalPKR,
    discountTotalPKR: safeDiscount,
    estimatedTotalPKR,
    modeLabel,
    durationLabel: destination.durationLabel,
    vehiclesNeeded,
  };
}

export function validateTravellerDetails(
  input: TravellerValidationInput
): TravellerValidationErrors {
  const errors: TravellerValidationErrors = {};
  const trimmedName = input.fullName.trim();
  const trimmedPhone = input.phone.trim();
  const trimmedEmail = input.email.trim();

  if (trimmedName.length < 2) {
    errors.fullName = 'Please enter the primary traveller full name.';
  }

  const digitsOnly = trimmedPhone.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    errors.phone = 'Enter a valid Pakistani or international phone number (10–15 digits).';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!Number.isFinite(input.travellers) || input.travellers < 1 || input.travellers > 40) {
    errors.travellers = 'Number of travellers must be between 1 and 40.';
  }

  return errors;
}

export function buildWhatsAppBookingUrl(details: {
  destinationName: string;
  departureCity: string;
  travelDate: string;
  modeLabel: string;
  travellers: number;
  fullName: string;
  phone: string;
  estimatedTotalPKR: number;
  referenceCode?: string;
  ownerName?: string;
  companyName?: string;
  whatsappLink?: string;
}): string {
  const owner = details.ownerName || BRAND_CONFIG.ownerName;
  const company = details.companyName || BRAND_CONFIG.companyName;
  const baseLink = details.whatsappLink || BRAND_CONFIG.whatsappLink;
  const lines = [
    `Assalam-o-Alaikum ${owner}, I would like to book a trip with ${company}:`,
    `Destination: ${details.destinationName}`,
    `From: ${details.departureCity}`,
    `Date: ${details.travelDate || 'Flexible'}`,
    `Travel Mode: ${details.modeLabel}`,
    `Travellers: ${details.travellers}`,
    `Name: ${details.fullName || 'Guest'}`,
    `Phone: ${details.phone || 'Not provided'}`,
    `Estimated Budget: ${formatPKR(details.estimatedTotalPKR)}`,
    ...(details.referenceCode ? [`Reference: ${details.referenceCode}`] : []),
  ];
  return `${baseLink}?text=${encodeURIComponent(lines.join('\n'))}`;
}

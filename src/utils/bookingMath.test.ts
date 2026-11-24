import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsAppBookingUrl,
  calculateTripEstimate,
  formatPKR,
  validateTravellerDetails,
} from './bookingMath';

test('formatPKR formats currency with tabular commas', () => {
  assert.equal(formatPKR(28500), 'PKR 28,500');
  assert.equal(formatPKR(-50), 'PKR 0');
});

test('calculateTripEstimate computes road and air totals accurately', () => {
  const roadEstimate = calculateTripEstimate({
    destinationId: 'naran-kaghan',
    travelMode: 'road',
    vehicleId: 'car',
    airClassId: 'economy',
    travellers: 2,
    applySeasonalOffer: false,
  });

  // Naran base 28,500 + (6,500 * 4 / 2 = 13,000) = 41,500 per person * 2 = 83,000
  assert.equal(roadEstimate.basePerPersonPKR, 28500);
  assert.equal(roadEstimate.modePerPersonPKR, 13000);
  assert.equal(roadEstimate.estimatedTotalPKR, 83000);

  const airEstimate = calculateTripEstimate({
    destinationId: 'hunza-valley',
    travelMode: 'air',
    vehicleId: 'car',
    airClassId: 'economy',
    travellers: 2,
    applySeasonalOffer: true,
  });

  // Hunza base 48,000 + Air economy 32,000 = 80,000 * 2 = 160,000 - (5,000 * 2) = 150,000
  assert.equal(airEstimate.subtotalPKR, 160000);
  assert.equal(airEstimate.discountTotalPKR, 10000);
  assert.equal(airEstimate.estimatedTotalPKR, 150000);
});

test('road price scales with group size: solo pays the whole car, big groups need extra vehicles', () => {
  const solo = calculateTripEstimate({
    destinationId: 'naran-kaghan', travelMode: 'road', vehicleId: 'car', airClassId: 'economy', travellers: 1,
  });
  // Car 6,500 x 4 days = 26,000 for one traveller (previously under-charged at 13,000)
  assert.equal(solo.modePerPersonPKR, 26000);
  assert.equal(solo.vehiclesNeeded, 1);

  const group = calculateTripEstimate({
    destinationId: 'naran-kaghan', travelMode: 'road', vehicleId: 'hiace', airClassId: 'economy', travellers: 20,
  });
  // 20 people on 12-seat Hiace vans = 2 vans x 11,000 x 4 days = 88,000 / 20 = 4,400 each
  assert.equal(group.vehiclesNeeded, 2);
  assert.equal(group.modePerPersonPKR, 4400);
});

test('calculateTripEstimate uses admin-edited rates when supplied', () => {
  const custom = calculateTripEstimate({
    destinationId: 'naran-kaghan', travelMode: 'air', vehicleId: 'car', airClassId: 'economy', travellers: 2,
    airClasses: [{ id: 'economy', name: 'Eco', description: '', perPersonSurchargePKR: 40000, multiplier: 1 }],
  });
  assert.equal(custom.modePerPersonPKR, 40000);
});

test('validateTravellerDetails catches invalid fields and accepts valid data', () => {
  const invalid = validateTravellerDetails({
    fullName: 'A',
    phone: '123',
    email: 'not-an-email',
    travellers: 0,
  });
  assert.ok(invalid.fullName);
  assert.ok(invalid.phone);
  assert.ok(invalid.email);
  assert.ok(invalid.travellers);

  const valid = validateTravellerDetails({
    fullName: 'Bilal Ahmed',
    phone: '03131498344',
    email: 'bilal@example.com',
    travellers: 4,
  });
  assert.deepEqual(valid, {});
});

test('buildWhatsAppBookingUrl targets wa.me/923131498344 with encoded text', () => {
  const url = buildWhatsAppBookingUrl({
    destinationName: 'Hunza Valley & Attabad Lake',
    departureCity: 'Islamabad',
    travelDate: '2026-06-15',
    modeLabel: 'By Air · Economy Flight Package',
    travellers: 2,
    fullName: 'Bilal Ahmed',
    phone: '03001234567',
    estimatedTotalPKR: 150000,
  });
  assert.ok(url.startsWith('https://wa.me/923131498344?text='));
  assert.ok(decodeURIComponent(url).includes('Hunza Valley'));
  assert.ok(decodeURIComponent(url).includes('PKR 150,000'));
});

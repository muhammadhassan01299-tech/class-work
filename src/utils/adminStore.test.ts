import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAdminMetrics,
  deleteDestinationRecord,
  filterBookingRecords,
  getDefaultAdminState,
  upsertDestinationRecord,
  type AdminBookingRecord,
} from './adminStore';

function booking(over: Partial<AdminBookingRecord>): AdminBookingRecord {
  return {
    id: 'b1', referenceCode: 'PT-111111', customerName: 'Test User', phone: '03001234567', email: 't@example.com',
    departureCity: 'Lahore', destinationId: 'hunza-valley', destinationName: 'Hunza', travelDate: '2099-01-01',
    travellers: 2, travelMode: 'road', modeLabel: 'By Road', estimatedTotalPKR: 100000, status: 'Pending',
    createdAt: '2026-01-01', ...over,
  };
}

test('upsertDestinationRecord adds a new destination and edits an existing one cleanly', () => {
  const initial = getDefaultAdminState().destinations;
  const added = upsertDestinationRecord(initial, {
    name: 'Kumrat Valley & Jahaz Banda',
    tagline: 'Dense cedar forests, Dojanga waterfalls, and alpine lakes',
    region: 'KPK & Hazara',
    durationDays: 4,
    durationLabel: '4 Days / 3 Nights',
    basePricePKR: 34000,
    modes: ['road'],
    bestTimeToVisit: 'May to September',
    imageKey: 'swat',
    highlightsText: 'Kala Chashma, Panjkora River, Jahaz Banda',
  });

  assert.equal(added.length, initial.length + 1);
  assert.equal(added[0].name, 'Kumrat Valley & Jahaz Banda');
  assert.equal(added[0].basePricePKR, 34000);
  assert.equal(added[0].highlights.length, 3);

  const edited = upsertDestinationRecord(added, {
    id: added[0].id,
    name: 'Kumrat Valley Deluxe',
    tagline: 'Updated tagline',
    region: 'KPK & Hazara',
    durationDays: 5,
    durationLabel: '5 Days / 4 Nights',
    basePricePKR: 38500,
    modes: ['road'],
    bestTimeToVisit: 'June to September',
    imageKey: 'swat',
    highlightsText: 'Jahaz Banda, Katora Lake',
  });

  assert.equal(edited.length, added.length);
  assert.equal(edited[0].name, 'Kumrat Valley Deluxe');
  assert.equal(edited[0].basePricePKR, 38500);
});

test('deleteDestinationRecord removes target but protects against deleting the final destination', () => {
  const initial = getDefaultAdminState().destinations;
  const afterDelete = deleteDestinationRecord(initial, initial[0].id);
  assert.equal(afterDelete.length, initial.length - 1);

  const single = [initial[0]];
  assert.equal(deleteDestinationRecord(single, single[0].id).length, 1);
});

test('filterBookingRecords and computeAdminMetrics calculate accurate counts and PKR totals', () => {
  const state = getDefaultAdminState();
  assert.equal(state.bookings.length, 0); // no fake demo bookings any more
  state.bookings = [
    booking({ id: '1', referenceCode: 'PT-482910', customerName: 'Bilal Ahmed', status: 'Confirmed', estimatedTotalPKR: 300000 }),
    booking({ id: '2', referenceCode: 'PT-519044', status: 'Pending', estimatedTotalPKR: 83000 }),
    booking({ id: '3', referenceCode: 'PT-394120', status: 'Cancelled', estimatedTotalPKR: 500000 }),
  ];

  assert.equal(filterBookingRecords(state.bookings, { searchQuery: '', status: 'Pending' }).length, 1);
  const search = filterBookingRecords(state.bookings, { searchQuery: 'PT-482910', status: 'All' });
  assert.equal(search.length, 1);
  assert.equal(search[0].customerName, 'Bilal Ahmed');

  const metrics = computeAdminMetrics(state);
  assert.equal(metrics.totalBookings, 3);
  assert.equal(metrics.pendingBookings, 1);
  assert.equal(metrics.confirmedBookings, 1);
  assert.equal(metrics.activeDestinations, state.destinations.length);
  assert.equal(metrics.activePipelinePKR, 383000); // cancelled excluded
});

test('editing a destination price keeps price tiers in sync and custom photos get their own key', () => {
  const dests = getDefaultAdminState().destinations;
  const naran = dests.find((d) => d.id === 'naran-kaghan')!;
  const edited = upsertDestinationRecord(dests, {
    id: naran.id, name: naran.name, tagline: naran.tagline, region: naran.region,
    durationDays: naran.durationDays, durationLabel: naran.durationLabel,
    basePricePKR: naran.basePricePKR * 2, modes: ['road'], bestTimeToVisit: naran.bestTimeToVisit,
    imageKey: 'heroNaran', highlightsText: naran.highlights.join(', '), customImageUrl: '/uploads/x.jpg',
  }).find((d) => d.id === naran.id)!;
  assert.equal(edited.priceTiers[0].pricePKR, naran.priceTiers[0].pricePKR * 2);
  assert.equal(edited.defaultImage, '/uploads/x.jpg');
  assert.equal(edited.imageKey, 'dest-naran-kaghan');

  const added = upsertDestinationRecord(dests, {
    name: 'New Spot', tagline: '', region: 'KPK & Hazara', durationDays: 3, durationLabel: '',
    basePricePKR: 20000, modes: ['road', 'air'], bestTimeToVisit: '', imageKey: 'swat', highlightsText: '',
    itineraryText: 'Arrive | Check in\nSightsee | Full day', roadPricePKR: 21000, airPricePKR: 60000,
  })[0];
  assert.equal(added.itinerary.length, 2);
  assert.equal(added.priceTiers.find((t) => t.mode === 'air')!.pricePKR, 60000);
  assert.equal(added.reviewCount, 0);
});

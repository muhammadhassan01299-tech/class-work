import fs from 'node:fs';
import path from 'node:path';
import { buildCsv, buildXlsx } from './xlsx.js';

const BOOKING_COLUMNS = [
  { header: 'Reference', key: 'referenceCode', width: 14 },
  { header: 'Created At', key: 'createdAt', width: 20 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Customer Name', key: 'customerName', width: 26 },
  { header: 'Phone', key: 'phone', width: 16 },
  { header: 'Email', key: 'email', width: 30 },
  { header: 'Departure City', key: 'departureCity', width: 16 },
  { header: 'Destination', key: 'destinationName', width: 34 },
  { header: 'Travel Date', key: 'travelDate', width: 14 },
  { header: 'Travellers', key: 'travellers', width: 11 },
  { header: 'Travel Mode', key: 'modeLabel', width: 36 },
  { header: 'Estimated Total (PKR)', key: 'estimatedTotalPKR', width: 22 },
  { header: 'Notes', key: 'notes', width: 40 },
];

const INQUIRY_COLUMNS = [
  { header: 'Created At', key: 'createdAt', width: 20 },
  { header: 'Type', key: 'type', width: 12 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Name', key: 'name', width: 24 },
  { header: 'Email', key: 'email', width: 30 },
  { header: 'Phone', key: 'phone', width: 16 },
  { header: 'Message', key: 'message', width: 60 },
];

const CUSTOMER_COLUMNS = [
  { header: 'Registered At', key: 'createdAt', width: 20 },
  { header: 'Full Name', key: 'fullName', width: 26 },
  { header: 'Email', key: 'email', width: 30 },
  { header: 'Phone', key: 'phone', width: 16 },
];

const DESTINATION_COLUMNS = [
  { header: 'Destination', key: 'name', width: 36 },
  { header: 'Region', key: 'region', width: 18 },
  { header: 'Duration', key: 'durationLabel', width: 20 },
  { header: 'Base Price / Person (PKR)', key: 'basePricePKR', width: 24 },
  { header: 'Travel Modes', key: 'modes', width: 14 },
  { header: 'Best Time', key: 'bestTimeToVisit', width: 20 },
];

export function collectSheets(db, defaultDestinations = []) {
  const destinations = Array.isArray(db.destinations) ? db.destinations : defaultDestinations;
  return [
    { name: 'Bookings', columns: BOOKING_COLUMNS, rows: db.bookings },
    { name: 'Inquiries', columns: INQUIRY_COLUMNS, rows: db.inquiries },
    { name: 'Customers', columns: CUSTOMER_COLUMNS, rows: db.users },
    {
      name: 'Destinations & Prices',
      columns: DESTINATION_COLUMNS,
      rows: destinations.map((d) => ({ ...d, modes: Array.isArray(d.modes) ? d.modes.join(' + ') : '' })),
    },
  ];
}

export function createExporter({ dataDir, getDb, getDefaultDestinations }) {
  const exportDir = path.join(dataDir, 'exports');
  const xlsxPath = path.join(exportDir, 'PakTourist-Records.xlsx');
  const csvPath = path.join(exportDir, 'PakTourist-Bookings.csv');
  let timer = null;
  let lastExportAt = null;
  let lastError = null;

  function writeAtomic(target, data) {
    const tmp = `${target}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, target);
  }

  function exportNow() {
    try {
      fs.mkdirSync(exportDir, { recursive: true });
      const db = getDb();
      const sheets = collectSheets(db, getDefaultDestinations());
      writeAtomic(xlsxPath, buildXlsx(sheets));
      writeAtomic(csvPath, buildCsv(BOOKING_COLUMNS, db.bookings));
      lastExportAt = new Date().toISOString();
      lastError = null;
      return { ok: true, xlsxPath, csvPath, at: lastExportAt };
    } catch (err) {
      // Typical cause: the .xlsx is open in Excel on Windows (file locked).
      lastError = err instanceof Error ? err.message : String(err);
      console.error('[export] failed:', lastError);
      return { ok: false, error: lastError };
    }
  }

  function scheduleExport() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      exportNow();
    }, 400);
  }

  return {
    exportNow,
    scheduleExport,
    xlsxPath,
    csvPath,
    status: () => ({ lastExportAt, lastError, folder: exportDir }),
    buildWorkbookBuffer: () => buildXlsx(collectSheets(getDb(), getDefaultDestinations())),
    buildBookingsCsv: () => buildCsv(BOOKING_COLUMNS, getDb().bookings),
  };
}

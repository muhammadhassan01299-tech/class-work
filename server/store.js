import fs from 'node:fs';
import path from 'node:path';

export function defaultDb() {
  return {
    version: 1,
    // null = "use the built-in defaults from src/data/siteConfig.ts"
    destinations: null,
    featuredPackages: null,
    specialOffer: null,
    brand: null,
    pricing: null,
    media: { logoUrl: null, ownerPhotoUrl: null, imageOverrides: {} },
    bookings: [],
    inquiries: [],
    users: [],
  };
}

export function createStore(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'db.json');
  let db = defaultDb();

  try {
    const raw = fs.readFileSync(file, 'utf8');
    db = { ...defaultDb(), ...JSON.parse(raw) };
    db.media = { ...defaultDb().media, ...(db.media || {}) };
  } catch (err) {
    if (err && err.code !== 'ENOENT') {
      // Corrupt file: keep a copy so nothing is silently lost, then start clean.
      try {
        fs.copyFileSync(file, `${file}.corrupt-${Date.now()}`);
      } catch {
        // ignore
      }
      console.error('[store] db.json could not be read; a backup copy was saved and a fresh DB started.');
    }
  }

  function save() {
    const tmp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, file);
  }

  return {
    get data() {
      return db;
    },
    save,
    file,
  };
}

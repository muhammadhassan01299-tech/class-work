import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {
  buildCookie,
  createRateLimiter,
  hashPassword,
  parseCookies,
  safeEqual,
  signToken,
  verifyPassword,
  verifyToken,
} from './auth.js';
import { ENV_PATH, normalizeWhatsAppNumber, setEnvValue, whatsappDisplay } from './env.js';
import { createExporter } from './exporter.js';
import { createStore } from './store.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_COOKIE = 'pt_admin';
const USER_COOKIE = 'pt_user';
const ADMIN_TTL = 8 * 60 * 60;
const USER_TTL = 30 * 24 * 60 * 60;
const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
const INQUIRY_STATUSES = ['New', 'Reviewed', 'Resolved'];
const IMAGE_SIGNATURES = [
  { ext: 'png', test: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'jpg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'gif', test: (b) => b.length > 6 && b.subarray(0, 4).toString('latin1') === 'GIF8' },
  {
    ext: 'webp',
    test: (b) => b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const clean = (value, max = 200) =>
  typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max) : '';

const todayIso = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

export function createApp({ rootDir, dataDir, distDir, isProd, envPath = ENV_PATH }) {
  const store = createStore(dataDir);
  const uploadsDir = path.join(dataDir, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  const limited = createRateLimiter();

  const exporter = createExporter({
    dataDir,
    getDb: () => store.data,
    getDefaultDestinations: () => [],
  });

  // ---- secrets -------------------------------------------------------------
  function getSessionSecret() {
    if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) return process.env.SESSION_SECRET;
    const secretFile = path.join(dataDir, '.session-secret');
    try {
      return fs.readFileSync(secretFile, 'utf8').trim();
    } catch {
      const generated = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(secretFile, generated, { mode: 0o600 });
      return generated;
    }
  }
  const sessionSecret = getSessionSecret();

  const adminConfigured = () => {
    const pw = process.env.ADMIN_PASSWORD || '';
    return pw.length >= 8 && pw !== 'change-me-please';
  };
  const adminUsername = () => (process.env.ADMIN_USERNAME || 'admin').trim();

  const ownerDigits = () => normalizeWhatsAppNumber(process.env.OWNER_WHATSAPP || '');

  // ---- helpers -------------------------------------------------------------
  const isSecure = (req) => Boolean(req.socket.encrypted) || req.headers['x-forwarded-proto'] === 'https';
  const clientIp = (req) =>
    (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : '') ||
    req.socket.remoteAddress ||
    'unknown';

  function send(res, status, body, headers = {}) {
    const isBuffer = Buffer.isBuffer(body);
    const payload = isBuffer || typeof body === 'string' ? body : JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': isBuffer || typeof body === 'string' ? headers['Content-Type'] || 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    });
    res.end(payload);
  }

  function readBody(req, limitBytes) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > limitBytes) {
          reject(new HttpError(413, 'Request too large.'));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        if (size === 0) return resolve({});
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          resolve(parsed && typeof parsed === 'object' ? parsed : {});
        } catch {
          reject(new HttpError(400, 'Invalid JSON body.'));
        }
      });
      req.on('error', reject);
    });
  }

  function getAdmin(req) {
    const token = parseCookies(req.headers.cookie)[ADMIN_COOKIE];
    const payload = verifyToken(token, sessionSecret);
    return payload && payload.role === 'admin' ? payload : null;
  }

  function getUser(req) {
    const token = parseCookies(req.headers.cookie)[USER_COOKIE];
    const payload = verifyToken(token, sessionSecret);
    if (!payload || payload.role !== 'user') return null;
    return store.data.users.find((u) => u.id === payload.sub) || null;
  }

  const publicUser = (u) => ({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, createdAt: u.createdAt });
  const userSession = (u) => ({
    username: u.email,
    displayName: u.fullName,
    email: u.email,
    role: 'user',
    unlockedAt: nowIso(),
  });

  function newId(prefix) {
    return `${prefix}-${Date.now()}-${crypto.randomInt(1000, 9999)}`;
  }

  function uniqueReference() {
    for (let i = 0; i < 20; i += 1) {
      const code = `PT-${crypto.randomInt(100000, 999999)}`;
      if (!store.data.bookings.some((b) => b.referenceCode === code)) return code;
    }
    return `PT-${Date.now().toString().slice(-8)}`;
  }

  function publicPayload() {
    const db = store.data;
    const digits = ownerDigits();
    return {
      destinations: db.destinations,
      featuredPackages: db.featuredPackages,
      specialOffer: db.specialOffer,
      brand: db.brand,
      pricing: db.pricing,
      media: db.media,
      whatsapp: digits ? { digits, display: whatsappDisplay(digits), link: `https://wa.me/${digits}` } : null,
    };
  }

  // ---- validators ----------------------------------------------------------
  function validateBooking(body) {
    const customerName = clean(body.customerName, 100);
    const phone = clean(body.phone, 30);
    const email = clean(body.email, 120).toLowerCase();
    const travellers = Math.floor(Number(body.travellers));
    const travelMode = body.travelMode === 'air' ? 'air' : body.travelMode === 'road' ? 'road' : null;
    const travelDate = clean(body.travelDate, 10);
    const total = Math.round(Number(body.estimatedTotalPKR));

    if (customerName.length < 2) throw new HttpError(400, 'Please enter the traveller name.');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) throw new HttpError(400, 'Please enter a valid phone number.');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address.');
    if (!Number.isFinite(travellers) || travellers < 1 || travellers > 40) throw new HttpError(400, 'Travellers must be between 1 and 40.');
    if (!travelMode) throw new HttpError(400, 'Invalid travel mode.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate) || Number.isNaN(Date.parse(travelDate))) throw new HttpError(400, 'Please choose a valid travel date.');
    if (travelDate < todayIso()) throw new HttpError(400, 'Travel date cannot be in the past.');
    if (!Number.isFinite(total) || total < 0 || total > 500_000_000) throw new HttpError(400, 'Invalid estimated total.');
    const destinationName = clean(body.destinationName, 150);
    if (!destinationName) throw new HttpError(400, 'Destination is required.');

    return {
      customerName,
      phone,
      email,
      departureCity: clean(body.departureCity, 60),
      destinationId: clean(body.destinationId, 100),
      destinationName,
      travelDate,
      travellers,
      travelMode,
      modeLabel: clean(body.modeLabel, 120),
      estimatedTotalPKR: total,
      notes: clean(body.notes, 1000) || undefined,
    };
  }

  function validateInquiry(body) {
    const type = body.type === 'newsletter' ? 'newsletter' : 'contact';
    const name = clean(body.name, 100) || (type === 'newsletter' ? 'Newsletter Subscriber' : '');
    const email = clean(body.email, 120).toLowerCase();
    const message = clean(body.message, 3000);
    if (type === 'contact' && name.length < 2) throw new HttpError(400, 'Please enter your name.');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address.');
    if (type === 'contact' && message.length < 8) throw new HttpError(400, 'Please share a brief message.');
    return { type, name, email, phone: clean(body.phone, 30) || 'Not provided', message: message || 'Subscribed to updates.' };
  }

  const isStr = (v) => typeof v === 'string';
  function validateDestinations(list) {
    if (!Array.isArray(list) || list.length < 1 || list.length > 200) throw new HttpError(400, 'Destinations must be a list of 1–200 items.');
    const ids = new Set();
    for (const d of list) {
      if (!d || typeof d !== 'object' || !isStr(d.id) || !isStr(d.name) || !d.name.trim()) throw new HttpError(400, 'Each destination needs an id and a name.');
      if (ids.has(d.id)) throw new HttpError(400, `Duplicate destination id: ${d.id}`);
      ids.add(d.id);
      if (!Number.isFinite(d.basePricePKR) || d.basePricePKR < 0) throw new HttpError(400, `Invalid price for ${d.name}.`);
      if (!Array.isArray(d.modes) || d.modes.some((m) => m !== 'road' && m !== 'air')) throw new HttpError(400, `Invalid travel modes for ${d.name}.`);
    }
    return list;
  }

  function validatePricing(p) {
    if (!p || typeof p !== 'object') throw new HttpError(400, 'Invalid pricing.');
    const vehicles = Array.isArray(p.roadVehicles) ? p.roadVehicles : null;
    const air = Array.isArray(p.airClasses) ? p.airClasses : null;
    const cities = Array.isArray(p.departureCities) ? p.departureCities.map((c) => clean(c, 60)).filter(Boolean) : null;
    if (!vehicles || vehicles.length < 1 || vehicles.length > 20) throw new HttpError(400, 'Add at least one road vehicle.');
    if (!air || air.length < 1 || air.length > 10) throw new HttpError(400, 'Add at least one air package.');
    if (!cities || cities.length < 1) throw new HttpError(400, 'Add at least one departure city.');
    for (const v of vehicles) {
      if (!v || !isStr(v.id) || !isStr(v.name) || !Number.isFinite(v.dailySurchargePKR) || v.dailySurchargePKR < 0 || !Number.isFinite(v.capacityPassengers) || v.capacityPassengers < 1) {
        throw new HttpError(400, 'Invalid road vehicle entry.');
      }
    }
    for (const a of air) {
      if (!a || !isStr(a.id) || !isStr(a.name) || !Number.isFinite(a.perPersonSurchargePKR) || a.perPersonSurchargePKR < 0) {
        throw new HttpError(400, 'Invalid air package entry.');
      }
    }
    return { roadVehicles: vehicles, airClasses: air, departureCities: cities };
  }

  function saveImage(dataUrl) {
    const match = /^data:image\/(png|jpe?g|gif|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
    if (!match) throw new HttpError(400, 'Only PNG, JPG, GIF or WebP images are allowed.');
    const buf = Buffer.from(match[2], 'base64');
    if (buf.length > 6 * 1024 * 1024) throw new HttpError(413, 'Image is larger than 6 MB.');
    const sig = IMAGE_SIGNATURES.find((s) => s.test(buf));
    if (!sig) throw new HttpError(400, 'File content is not a valid image.');
    const name = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}.${sig.ext}`;
    fs.writeFileSync(path.join(uploadsDir, name), buf);
    return `/uploads/${name}`;
  }

  function removeUploadIfUnused(url) {
    if (typeof url !== 'string' || !url.startsWith('/uploads/')) return;
    const db = JSON.stringify(store.data);
    if (db.includes(url)) return;
    const file = path.join(uploadsDir, path.basename(url));
    fs.rm(file, { force: true }, () => undefined);
  }

  // ---- routes --------------------------------------------------------------
  async function handleApi(req, res, url) {
    const method = req.method || 'GET';
    const route = url.pathname.replace(/\/+$/, '') || '/';
    const ip = clientIp(req);
    const secure = isSecure(req);

    // CSRF defence in depth (cookies are also SameSite=Strict): state-changing calls must carry a custom header.
    if (method !== 'GET' && method !== 'HEAD' && req.headers['x-pt-csrf'] !== '1') {
      throw new HttpError(403, 'Missing security header.');
    }

    // ---------------- public ----------------
    if (method === 'GET' && route === '/api/public') return send(res, 200, publicPayload());

    if (method === 'POST' && route === '/api/auth/register') {
      if (limited(`reg:${ip}`, 10, 60 * 60 * 1000)) throw new HttpError(429, 'Too many sign-ups. Please try again later.');
      const body = await readBody(req, 20_000);
      const fullName = clean(body.fullName, 100);
      const email = clean(body.email, 120).toLowerCase();
      const phone = clean(body.phone, 30);
      const password = typeof body.password === 'string' ? body.password : '';
      if (fullName.length < 2) throw new HttpError(400, 'Please enter your full name (at least 2 characters).');
      if (fullName.toLowerCase() === adminUsername().toLowerCase()) throw new HttpError(400, 'That name is reserved.');
      if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address.');
      if (password.length < 6 || password.length > 200) throw new HttpError(400, 'Password must be at least 6 characters.');
      if (store.data.users.some((u) => u.email === email)) throw new HttpError(409, 'An account with this email already exists. Please Sign In instead.');
      const user = { id: newId('usr'), fullName, email, phone, passwordHash: hashPassword(password), createdAt: nowIso() };
      store.data.users.unshift(user);
      store.save();
      exporter.scheduleExport();
      return send(res, 201, { session: userSession(user) }, {
        'Set-Cookie': buildCookie(USER_COOKIE, signToken({ role: 'user', sub: user.id }, sessionSecret, USER_TTL), { maxAgeSeconds: USER_TTL, secure }),
      });
    }

    if (method === 'POST' && route === '/api/auth/login') {
      if (limited(`login:${ip}`, 15, 15 * 60 * 1000)) throw new HttpError(429, 'Too many attempts. Please wait a few minutes.');
      const body = await readBody(req, 5_000);
      const identifier = clean(body.identifier, 120).toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';
      if (!identifier) throw new HttpError(400, 'Please enter your email.');
      if (!password) throw new HttpError(400, 'Please enter your password.');
      const user = store.data.users.find((u) => u.email === identifier || u.fullName.toLowerCase() === identifier);
      if (!user) throw new HttpError(401, 'Account not found. Please create an account first.');
      if (!verifyPassword(password, user.passwordHash)) throw new HttpError(401, 'Incorrect password. Please try again.');
      return send(res, 200, { session: userSession(user) }, {
        'Set-Cookie': buildCookie(USER_COOKIE, signToken({ role: 'user', sub: user.id }, sessionSecret, USER_TTL), { maxAgeSeconds: USER_TTL, secure }),
      });
    }

    if (method === 'POST' && route === '/api/auth/logout') {
      return send(res, 200, { ok: true }, { 'Set-Cookie': buildCookie(USER_COOKIE, '', { maxAgeSeconds: 0, secure }) });
    }

    if (method === 'GET' && route === '/api/auth/me') {
      const user = getUser(req);
      return send(res, 200, { session: user ? userSession(user) : null });
    }

    if (method === 'POST' && route === '/api/bookings') {
      if (limited(`book:${ip}`, 20, 60 * 60 * 1000)) throw new HttpError(429, 'Too many booking requests. Please try again later.');
      const body = await readBody(req, 20_000);
      const fields = validateBooking(body);
      const record = {
        id: newId('bk'),
        referenceCode: uniqueReference(),
        ...fields,
        userId: getUser(req)?.id,
        status: 'Pending',
        createdAt: nowIso(),
      };
      store.data.bookings.unshift(record);
      store.save();
      exporter.scheduleExport();
      return send(res, 201, { booking: record });
    }

    if (method === 'POST' && route === '/api/inquiries') {
      if (limited(`inq:${ip}`, 20, 60 * 60 * 1000)) throw new HttpError(429, 'Too many messages. Please try again later.');
      const body = await readBody(req, 20_000);
      const fields = validateInquiry(body);
      const record = { id: newId('inq'), ...fields, status: 'New', createdAt: nowIso() };
      store.data.inquiries.unshift(record);
      store.save();
      exporter.scheduleExport();
      return send(res, 201, { inquiry: record });
    }

    // ---------------- admin auth ----------------
    if (method === 'POST' && route === '/api/admin/login') {
      if (limited(`admin:${ip}`, 8, 15 * 60 * 1000)) throw new HttpError(429, 'Too many attempts. Please wait 15 minutes.');
      if (!adminConfigured()) {
        throw new HttpError(503, 'Admin password is not set. Open the .env file, set ADMIN_PASSWORD (min 8 characters) and restart the server.');
      }
      const body = await readBody(req, 5_000);
      const okUser = safeEqual(clean(body.username, 100), adminUsername());
      const okPass = safeEqual(typeof body.password === 'string' ? body.password : '', process.env.ADMIN_PASSWORD);
      if (!okUser || !okPass) throw new HttpError(401, 'Invalid admin username or password.');
      return send(res, 200, { ok: true, username: adminUsername() }, {
        'Set-Cookie': buildCookie(ADMIN_COOKIE, signToken({ role: 'admin', sub: 'admin' }, sessionSecret, ADMIN_TTL), { maxAgeSeconds: ADMIN_TTL, secure }),
      });
    }

    if (method === 'POST' && route === '/api/admin/logout') {
      return send(res, 200, { ok: true }, { 'Set-Cookie': buildCookie(ADMIN_COOKIE, '', { maxAgeSeconds: 0, secure }) });
    }

    if (!route.startsWith('/api/admin')) throw new HttpError(404, 'Not found.');

    // Everything below requires an admin session.
    const admin = getAdmin(req);
    if (!admin) throw new HttpError(401, 'Admin login required.');

    if (method === 'GET' && route === '/api/admin/me') {
      return send(res, 200, { ok: true, username: adminUsername() });
    }

    if (method === 'GET' && route === '/api/admin/data') {
      const db = store.data;
      const digits = ownerDigits();
      return send(res, 200, {
        bookings: db.bookings,
        inquiries: db.inquiries,
        customers: db.users.map(publicUser),
        settings: {
          ownerWhatsapp: digits ? whatsappDisplay(digits) : '',
          ownerWhatsappDigits: digits || '',
          envFile: path.basename(envPath),
        },
        export: exporter.status(),
      });
    }

    const put = (key, validate) => async () => {
      const body = await readBody(req, 4 * 1024 * 1024);
      store.data[key] = validate(body);
      store.save();
      exporter.scheduleExport();
      return send(res, 200, { ok: true });
    };

    if (method === 'PUT' && route === '/api/admin/destinations') {
      return put('destinations', (b) => validateDestinations(b.destinations))();
    }
    if (method === 'PUT' && route === '/api/admin/packages') {
      return put('featuredPackages', (b) => {
        if (!Array.isArray(b.featuredPackages) || b.featuredPackages.length > 50) throw new HttpError(400, 'Invalid packages.');
        return b.featuredPackages;
      })();
    }
    if (method === 'PUT' && route === '/api/admin/offer') {
      return put('specialOffer', (b) => {
        const o = b.specialOffer;
        if (!o || !isStr(o.promoCode) || !Number.isFinite(o.discountPerPersonPKR) || o.discountPerPersonPKR < 0) throw new HttpError(400, 'Invalid offer.');
        return {
          badge: clean(o.badge, 80),
          title: clean(o.title, 200),
          description: clean(o.description, 600),
          discountPerPersonPKR: Math.round(o.discountPerPersonPKR),
          promoCode: clean(o.promoCode, 30).toUpperCase(),
        };
      })();
    }
    if (method === 'PUT' && route === '/api/admin/brand') {
      return put('brand', (b) => {
        const br = b.brand;
        if (!br || !isStr(br.companyName) || !br.companyName.trim()) throw new HttpError(400, 'Company name is required.');
        return {
          companyName: clean(br.companyName, 80),
          ownerName: clean(br.ownerName, 80),
          tagline: clean(br.tagline, 200),
          email: clean(br.email, 120),
          headquarters: clean(br.headquarters, 150),
          officeHours: clean(br.officeHours, 100),
        };
      })();
    }
    if (method === 'PUT' && route === '/api/admin/pricing') {
      return put('pricing', (b) => validatePricing(b.pricing))();
    }

    if (method === 'PUT' && route === '/api/admin/media') {
      const body = await readBody(req, 100_000);
      const previous = JSON.stringify(store.data.media);
      const m = body.media || {};
      const okUrl = (u) => u === null || (isStr(u) && (u.startsWith('/uploads/') || /^https?:\/\//.test(u)) && u.length < 500);
      if (!okUrl(m.logoUrl ?? null) || !okUrl(m.ownerPhotoUrl ?? null)) throw new HttpError(400, 'Invalid image URL.');
      const overrides = {};
      for (const [k, v] of Object.entries(m.imageOverrides || {})) {
        if (/^[A-Za-z0-9_-]{1,60}$/.test(k) && okUrl(v) && v) overrides[k] = v;
      }
      store.data.media = { logoUrl: m.logoUrl ?? null, ownerPhotoUrl: m.ownerPhotoUrl ?? null, imageOverrides: overrides };
      store.save();
      // Clean up files that are no longer referenced anywhere.
      const old = JSON.parse(previous);
      [old.logoUrl, old.ownerPhotoUrl, ...Object.values(old.imageOverrides || {})].forEach(removeUploadIfUnused);
      return send(res, 200, { ok: true });
    }

    if (method === 'POST' && route === '/api/admin/upload') {
      const body = await readBody(req, 9 * 1024 * 1024);
      return send(res, 201, { url: saveImage(body.dataUrl) });
    }

    if (method === 'PATCH' && route.startsWith('/api/admin/bookings/')) {
      const id = decodeURIComponent(route.split('/').pop());
      const body = await readBody(req, 2_000);
      const record = store.data.bookings.find((b) => b.id === id);
      if (!record) throw new HttpError(404, 'Booking not found.');
      if (!BOOKING_STATUSES.includes(body.status)) throw new HttpError(400, 'Invalid status.');
      record.status = body.status;
      store.save();
      exporter.scheduleExport();
      return send(res, 200, { booking: record });
    }
    if (method === 'DELETE' && route.startsWith('/api/admin/bookings/')) {
      const id = decodeURIComponent(route.split('/').pop());
      store.data.bookings = store.data.bookings.filter((b) => b.id !== id);
      store.save();
      exporter.scheduleExport();
      return send(res, 200, { ok: true });
    }
    if (method === 'PATCH' && route.startsWith('/api/admin/inquiries/')) {
      const id = decodeURIComponent(route.split('/').pop());
      const body = await readBody(req, 2_000);
      const record = store.data.inquiries.find((i) => i.id === id);
      if (!record) throw new HttpError(404, 'Inquiry not found.');
      if (!INQUIRY_STATUSES.includes(body.status)) throw new HttpError(400, 'Invalid status.');
      record.status = body.status;
      store.save();
      exporter.scheduleExport();
      return send(res, 200, { inquiry: record });
    }
    if (method === 'DELETE' && route.startsWith('/api/admin/inquiries/')) {
      const id = decodeURIComponent(route.split('/').pop());
      store.data.inquiries = store.data.inquiries.filter((i) => i.id !== id);
      store.save();
      exporter.scheduleExport();
      return send(res, 200, { ok: true });
    }
    if (method === 'DELETE' && route.startsWith('/api/admin/customers/')) {
      const id = decodeURIComponent(route.split('/').pop());
      store.data.users = store.data.users.filter((u) => u.id !== id);
      store.save();
      exporter.scheduleExport();
      return send(res, 200, { ok: true });
    }

    // Owner WhatsApp -> .env  +  full Excel export
    if (method === 'POST' && route === '/api/admin/settings') {
      const body = await readBody(req, 5_000);
      const digits = normalizeWhatsAppNumber(body.ownerWhatsapp);
      if (!digits) throw new HttpError(400, 'Enter a valid WhatsApp number (e.g. 03131498344 or 923131498344).');
      let envSaved = true;
      let envError = null;
      try {
        setEnvValue('OWNER_WHATSAPP', digits, envPath);
      } catch (err) {
        envSaved = false;
        envError = err instanceof Error ? err.message : String(err);
        process.env.OWNER_WHATSAPP = digits; // still applies until restart
      }
      const exported = exporter.exportNow();
      return send(res, 200, {
        ok: true,
        envSaved,
        envError,
        ownerWhatsapp: whatsappDisplay(digits),
        ownerWhatsappDigits: digits,
        export: exported,
      });
    }

    if (method === 'POST' && route === '/api/admin/export') {
      const exported = exporter.exportNow();
      if (!exported.ok) throw new HttpError(500, `Could not write the Excel file: ${exported.error}`);
      return send(res, 200, { ok: true, ...exported, folder: path.relative(rootDir, path.dirname(exported.xlsxPath)) });
    }

    if (method === 'GET' && route === '/api/admin/export.xlsx') {
      return send(res, 200, exporter.buildWorkbookBuffer(), {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="PakTourist-Records-${todayIso()}.xlsx"`,
      });
    }
    if (method === 'GET' && route === '/api/admin/export.csv') {
      return send(res, 200, exporter.buildBookingsCsv(), {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="PakTourist-Bookings-${todayIso()}.csv"`,
      });
    }

    throw new HttpError(404, 'Not found.');
  }

  function serveFile(req, res, filePath, extraHeaders = {}) {
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) return send(res, 404, 'Not found');
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Content-Length': stat.size,
        'X-Content-Type-Options': 'nosniff',
        ...extraHeaders,
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(filePath).pipe(res);
    });
  }

  function safeJoin(base, requested) {
    const target = path.normalize(path.join(base, requested));
    return target.startsWith(base + path.sep) || target === base ? target : null;
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        throw new HttpError(400, 'Bad request.');
      }

      if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin')) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      }

      if (pathname.startsWith('/api/')) {
        url.pathname = pathname;
        return await handleApi(req, res, url);
      }

      if (pathname.startsWith('/uploads/')) {
        const file = safeJoin(uploadsDir, pathname.slice('/uploads/'.length));
        if (!file) return send(res, 400, 'Bad request');
        return serveFile(req, res, file, { 'Cache-Control': 'public, max-age=604800' });
      }

      if (!isProd) return send(res, 404, 'API server only. In development open the Vite URL (http://localhost:3000).');

      // Production: serve the built SPA
      const requested = pathname === '/' ? '/index.html' : pathname;
      const file = safeJoin(distDir, requested);
      if (file && path.extname(file) && fs.existsSync(file)) {
        const immutable = requested.startsWith('/assets/');
        return serveFile(req, res, file, { 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600' });
      }
      if (path.extname(pathname)) return send(res, 404, 'Not found');
      return serveFile(req, res, path.join(distDir, 'index.html'), { 'Cache-Control': 'no-cache' });
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      console.error('[server] unexpected error:', err);
      return send(res, 500, { error: 'Something went wrong on the server.' });
    }
  });

  return { server, store, exporter, adminConfigured };
}

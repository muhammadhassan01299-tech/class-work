import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from './app.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-test-'));
const envPath = path.join(tmp, '.env');
fs.writeFileSync(envPath, 'ADMIN_USERNAME=boss\nADMIN_PASSWORD=supersecret1\n# keep\n');
process.env.ADMIN_USERNAME = 'boss';
process.env.ADMIN_PASSWORD = 'supersecret1';
delete process.env.OWNER_WHATSAPP;

const { server } = createApp({ rootDir: tmp, dataDir: path.join(tmp, 'data'), distDir: tmp, isProd: false, envPath });
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

async function call(method, url, body, cookie) {
  const res = await fetch(base + url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-pt-csrf': '1',
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, data, cookie: setCookie ? setCookie.split(';')[0] : null, headers: res.headers };
}

const validBooking = {
  customerName: 'Ali Khan', phone: '0300-1234567', email: 'ali@example.com', departureCity: 'Lahore',
  destinationId: 'hunza-valley', destinationName: 'Hunza', travelDate: '2099-01-01', travellers: 3,
  travelMode: 'road', modeLabel: 'By Road', estimatedTotalPKR: 90000, notes: 'hello',
};

test.after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('rejects mutating requests without the CSRF header', async () => {
  const res = await fetch(base + '/api/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(res.status, 403);
});

test('public config works and has no admin data', async () => {
  const r = await call('GET', '/api/public');
  assert.equal(r.status, 200);
  assert.equal(r.data.bookings, undefined);
});

test('admin endpoints are locked without login', async () => {
  for (const [m, u] of [['GET', '/api/admin/data'], ['GET', '/api/admin/export.xlsx'], ['POST', '/api/admin/settings'], ['POST', '/api/admin/upload']]) {
    const r = await call(m, u, m === 'GET' ? undefined : {});
    assert.equal(r.status, 401, `${m} ${u}`);
  }
});

test('admin login: wrong password rejected, right password sets httpOnly cookie', async () => {
  const bad = await call('POST', '/api/admin/login', { username: 'boss', password: 'nope' });
  assert.equal(bad.status, 401);
  const ok = await call('POST', '/api/admin/login', { username: 'boss', password: 'supersecret1' });
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('set-cookie'), /HttpOnly/);
  assert.match(ok.headers.get('set-cookie'), /SameSite=Strict/);
});

test('customer register / login / me / duplicate / wrong password', async () => {
  const reg = await call('POST', '/api/auth/register', { fullName: 'Sara Ahmed', email: 'Sara@Example.com', phone: '', password: 'secret12' });
  assert.equal(reg.status, 201);
  assert.equal(reg.data.session.email, 'sara@example.com');
  const me = await call('GET', '/api/auth/me', undefined, reg.cookie);
  assert.equal(me.data.session.displayName, 'Sara Ahmed');
  assert.equal((await call('POST', '/api/auth/register', { fullName: 'Sara Again', email: 'sara@example.com', password: 'secret12' })).status, 409);
  assert.equal((await call('POST', '/api/auth/login', { identifier: 'sara@example.com', password: 'wrongpass' })).status, 401);
  assert.equal((await call('POST', '/api/auth/login', { identifier: 'sara@example.com', password: 'secret12' })).status, 200);
  const db = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'db.json'), 'utf8'));
  assert.ok(db.users[0].passwordHash.startsWith('scrypt$'));
  assert.equal(JSON.stringify(db).includes('secret12'), false);
});

test('forged / tampered session cookie is rejected', async () => {
  const r = await call('GET', '/api/admin/data', undefined, 'pt_admin=eyJyb2xlIjoiYWRtaW4iLCJleHAiOjk5OTk5OTk5OTl9.forged');
  assert.equal(r.status, 401);
});

test('booking validation + creation + reference code', async () => {
  assert.equal((await call('POST', '/api/bookings', { ...validBooking, email: 'bad' })).status, 400);
  assert.equal((await call('POST', '/api/bookings', { ...validBooking, travelDate: '2020-01-01' })).status, 400);
  assert.equal((await call('POST', '/api/bookings', { ...validBooking, travellers: 0 })).status, 400);
  assert.equal((await call('POST', '/api/bookings', { ...validBooking, estimatedTotalPKR: -5 })).status, 400);
  const ok = await call('POST', '/api/bookings', validBooking);
  assert.equal(ok.status, 201);
  assert.match(ok.data.booking.referenceCode, /^PT-\d{6}$/);
  assert.equal(ok.data.booking.status, 'Pending');
});

test('inquiry validation + creation', async () => {
  assert.equal((await call('POST', '/api/inquiries', { type: 'contact', name: 'X', email: 'a@b.co', message: 'hello there friend' })).status, 400);
  assert.equal((await call('POST', '/api/inquiries', { type: 'newsletter', email: 'news@example.com' })).status, 201);
});

test('admin: sees records, updates status, saves WhatsApp to .env, exports valid xlsx + csv', async () => {
  const login = await call('POST', '/api/admin/login', { username: 'boss', password: 'supersecret1' });
  const cookie = login.cookie;
  const data = await call('GET', '/api/admin/data', undefined, cookie);
  assert.equal(data.data.bookings.length, 1);
  assert.equal(data.data.customers.length, 1);
  assert.equal(data.data.customers[0].passwordHash, undefined);

  const id = data.data.bookings[0].id;
  assert.equal((await call('PATCH', `/api/admin/bookings/${id}`, { status: 'Confirmed' }, cookie)).data.booking.status, 'Confirmed');
  assert.equal((await call('PATCH', `/api/admin/bookings/${id}`, { status: 'Hacked' }, cookie)).status, 400);

  assert.equal((await call('POST', '/api/admin/settings', { ownerWhatsapp: 'abc' }, cookie)).status, 400);
  const saved = await call('POST', '/api/admin/settings', { ownerWhatsapp: '0313-1498344' }, cookie);
  assert.equal(saved.status, 200);
  assert.equal(saved.data.ownerWhatsappDigits, '923131498344');
  assert.equal(saved.data.envSaved, true);
  const env = fs.readFileSync(envPath, 'utf8');
  assert.match(env, /^OWNER_WHATSAPP=923131498344$/m);
  assert.match(env, /ADMIN_PASSWORD=supersecret1/); // untouched
  assert.match(env, /# keep/);
  assert.equal(saved.data.export.ok, true);
  assert.ok(fs.existsSync(path.join(tmp, 'data', 'exports', 'PakTourist-Records.xlsx')));

  const pub = await call('GET', '/api/public');
  assert.equal(pub.data.whatsapp.digits, '923131498344');
  assert.equal(pub.data.whatsapp.display, '03131498344');

  const xlsx = await call('GET', '/api/admin/export.xlsx', undefined, cookie);
  assert.equal(xlsx.status, 200);
  assert.equal(xlsx.data.subarray(0, 2).toString(), 'PK');
  const csv = await call('GET', '/api/admin/export.csv', undefined, cookie);
  assert.match(csv.data.toString('utf8'), /Ali Khan/);
});

test('admin: destinations CRUD validation, image upload magic-byte check', async () => {
  const cookie = (await call('POST', '/api/admin/login', { username: 'boss', password: 'supersecret1' })).cookie;
  assert.equal((await call('PUT', '/api/admin/destinations', { destinations: [] }, cookie)).status, 400);
  assert.equal((await call('PUT', '/api/admin/destinations', { destinations: [{ id: 'a', name: 'A', basePricePKR: -1, modes: ['road'] }] }, cookie)).status, 400);
  const good = { id: 'a', name: 'A Place', basePricePKR: 12000, modes: ['road', 'air'] };
  assert.equal((await call('PUT', '/api/admin/destinations', { destinations: [good] }, cookie)).status, 200);
  assert.equal((await call('GET', '/api/public')).data.destinations[0].basePricePKR, 12000);

  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
  const up = await call('POST', '/api/admin/upload', { dataUrl: `data:image/png;base64,${png.toString('base64')}` }, cookie);
  assert.equal(up.status, 201);
  const served = await fetch(base + up.data.url);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/png');
  const fake = await call('POST', '/api/admin/upload', { dataUrl: `data:image/png;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}` }, cookie);
  assert.equal(fake.status, 400);
  assert.equal((await call('POST', '/api/admin/upload', { dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }, cookie)).status, 400);
  assert.equal((await fetch(base + '/uploads/..%2f..%2f.env')).status === 200, false);
});

# Pak Tourist — Poori Guide (A se Z)

Ye ek tourism website hai. Isme customer account bana kar trip book karta hai, aur owner `/admin` se sab kuch sambhalta hai: destinations, prices, logo, photos, bookings, customers aur Excel record.

---

## 1. Kya cheez chahiye (ek dafa install karni hai)

1. **Node.js** (version 20 ya us se naya). Download: https://nodejs.org (LTS wala lo).
2. Check karne ke liye PowerShell kholo aur likho: `node -v` — number aa jaye to theek hai.

Koi database install nahi karna. Sara data `data/` folder mein file ki surat mein save hota hai.

---

## 2. Pehli dafa chalana (apne computer par)

Project folder mein PowerShell kholo (folder mein Shift + right click → "Open PowerShell here"):

```powershell
npm install
copy .env.example .env
```

Ab `.env` file Notepad mein kholo aur ye 3 cheezen set karo:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=yahan-apna-mazboot-password-likho
OWNER_WHATSAPP=923131498344
```

- `ADMIN_PASSWORD` kam az kam **8 characters** ka ho. Jab tak ye change nahi hoga admin login band rahega.
- `OWNER_WHATSAPP` owner ka number hai, country code ke saath, bina `+` aur bina space ke. Pakistan ke liye `0313...` ki jagah `92313...`. (Ye baad mein admin panel se bhi badal sakte ho.)

Phir chalao:

```powershell
npm run dev
```

- Website: http://localhost:3000
- Admin panel: http://localhost:3000/admin

Band karne ke liye PowerShell mein `Ctrl + C`.

---

## 3. Customer kaise use karta hai

1. Website kholta hai → pehle **Create Account** karta hai (naam, email, password).
2. Destinations dekhta hai, **Booking** page par 4 steps mein trip chunta hai (jagah/date → road ya air → apni details → summary).
3. **Confirm Booking** dabata hai → booking save ho jati hai aur usay reference number milta hai (jaise `PT-482910`).
4. **Confirm & Send on WhatsApp** dabata hai to booking save hoti hai aur owner ke number par WhatsApp khulta hai, tayyar message ke saath.
5. Contact page se message bhi bhej sakta hai, aur homepage se newsletter subscribe kar sakta hai.

---

## 4. Admin panel (owner ke liye)

Address bar mein likho: `website-ka-address/admin` (jaise `http://localhost:3000/admin`). Website par is ka koi link nahi hai, sirf wohi jaanta hai jisay address pata ho.

Username/password wohi jo `.env` mein likhe hain.

### Tabs ka kaam

| Tab | Kya karta hai |
|---|---|
| **Overview** | Total bookings, pending, kitni booking confirm, kul amount. |
| **Bookings** | Har booking ka status badlo (Pending / Confirmed / Completed / Cancelled), search karo, customer ko WhatsApp karo, delete karo. |
| **Destinations** | Naya spot add karo ya purana edit/delete karo: naam, tagline, region, din, **price**, road/air, **apni photo upload**, highlights, din ba din itinerary, included/not included. |
| **Offers & Packages** | Seasonal offer (promo code, discount) aur featured packages edit karo. |
| **Inquiries** | Contact form aur newsletter ke messages dekho, status badlo, delete karo. |
| **Customers** | Jis jis ne account banaya unki list (naam, email, phone). |
| **Vehicle & Flight Prices** | Gaadiyon ka rozana rate aur seats, flight packages ki price, departure cities. Booking calculator isi se hisaab karta hai. |
| **WhatsApp & Excel** | Owner ka number likho → **Save & Export to Excel**. Number `.env` mein save hota hai aur saara record Excel mein chala jata hai. Excel/CSV download ke buttons bhi yahin hain. |
| **Brand & Media** | Company ka naam, email, address, office hours, aur **logo / owner photo / destination photos** upload karna. |

### Logo kaise lagayen
Brand & Media → **Open Media Uploader** → "Choose Logo File" → photo chuno. Foran poori website par nazar aane lagta hai (har visitor ko). Photo PNG, JPG, WebP ya GIF ho, 5 MB se chhoti.

### Naya spot kaise add karen
Destinations → **Add Destination** → naam, price, din likho → **Choose Photo** se apni photo lagao → Save. Wo foran website par aa jata hai aur booking mein bhi chun saka jata hai.

---

## 5. Excel record

- Har nayi **booking, inquiry ya signup** par file khud update ho jati hai.
- File yahan hoti hai: `data/exports/PakTourist-Records.xlsx`
- Sheets: **Bookings, Inquiries, Customers, Destinations & Prices**.
- Admin se download: WhatsApp & Excel tab → **Download Excel (.xlsx)**.
- **Zaroori:** agar Excel mein file khuli ho to Windows usay lock kar deta hai aur nayi update nahi likh sakta. Download wala button istemal karo, ya file band karke "Update server file now" dabao.

---

## 6. Live (internet par) kaise lagayen

Ye website ek Node server hai, to usay aisi hosting chahiye jahan Node chalta ho aur **disk save rehti ho** (VPS, ya Railway/Render jahan "persistent disk" ho).

> Vercel / Netlify jaisi serverless hosting par **mat lagao**: wahan `data/` aur `.env` save nahi hote, bookings gayab ho jayengi.

Server par ye karo:

```bash
npm install
npm run build
NODE_ENV=production npm start
```

(Windows PowerShell mein: `$env:NODE_ENV="production"; npm start`)

- Port badalna ho to `.env` mein `PORT=8080` likho.
- `.env` file server par khud banao (copy se), usay kisi ko mat bhejo.
- Domain par **HTTPS** zaroor lagao (hosting wale aksar free dete hain). Admin password isi se mehfooz rehta hai.
- Server hamesha chalta rakhne ke liye `pm2` ya hosting ka "start command" istemal karo.

---

## 7. Data aur backup (bohat zaroori)

| Cheez | Kahan hai |
|---|---|
| Sab bookings, customers, prices | `data/db.json` |
| Logo aur upload ki hui photos | `data/uploads/` |
| Excel / CSV | `data/exports/` |
| Login ka secret (khud banta hai) | `data/.session-secret` |

**Poora `data/` folder + `.env` file** roz ya hafte mein kisi alag jagah copy kar lo. Agar ye gayab ho gaye to record wapas nahi aayega.

---

## 8. Aam masail aur hal

| Masla | Hal |
|---|---|
| Admin login par likha aaye "Admin password is not set" | `.env` mein `ADMIN_PASSWORD` (8+ characters) likho aur server dobara chalao. |
| Password bhool gaye | `.env` mein naya `ADMIN_PASSWORD` likho, server restart karo. |
| "Cannot reach the server" | Server band hai. `npm run dev` (ya live par `npm start`) chalao. |
| Port pehle se use mein | `.env` mein `PORT=` badlo, ya purana program band karo. Dev mein port 3000 aur 3001 khali hone chahiye. |
| Excel update nahi hui | File Excel mein khuli hai — band karo, phir "Update server file now". |
| Upload par error | Photo 5 MB se chhoti, aur PNG/JPG/WebP/GIF honi chahiye. |
| WhatsApp number badla magar `.env` mein nahi likha gaya | Server ko `.env` likhne ki ijazat nahi (hosting ki wajah se). `.env` mein `OWNER_WHATSAPP=` khud likho. |
| Customer ne galat date di | Purani date khud reject ho jati hai. |

---

## 9. Security ka khayal

- Admin password code mein nahi, sirf `.env` mein hai. `.env` ko kabhi git/WhatsApp par mat bhejo.
- Customer passwords hashed (scrypt) hain, plain text nahi.
- Admin ke raaste sirf login ke baad khulte hain; login par ghalat koshishein limit hoti hain.
- Pehle jo `waliwali / wali123` code mein likha tha wo **ab kabhi istemal na karo**.
- Booking ka total browser se aata hai (andaza), server dobara hisaab nahi karta — final amount owner WhatsApp par confirm kare.

---

## 10. Project ka dhancha (developer ke liye)

```
server/       Node server: API, login, upload, Excel (xlsx.js), .env likhna
src/pages/    Website ke pages + AdminApp / AdminPage
src/context/  Server se data lene wale providers
src/utils/    Price hisaab, validation, helpers
scripts/      dev.mjs (server + vite saath chalata hai)
data/         (khud banta hai) database, photos, Excel — git mein nahi jata
```

Tests: `npm test` — price ka hisaab, destinations, aur poora server (login, booking, upload, Excel, `.env`) check karta hai.

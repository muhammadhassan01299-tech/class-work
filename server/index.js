import fs from 'node:fs';
import path from 'node:path';
import { createApp } from './app.js';
import { ROOT_DIR, loadEnv } from './env.js';

loadEnv();

const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;
const dataDir = path.resolve(ROOT_DIR, process.env.DATA_DIR || 'data');
const distDir = path.join(ROOT_DIR, 'dist');

if (isProd && !fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('dist/ folder not found. Run "npm run build" first, then "npm start".');
  process.exit(1);
}

const { server, adminConfigured, exporter } = createApp({ rootDir: ROOT_DIR, dataDir, distDir, isProd });

server.listen(port, () => {
  console.log(`\nPak Tourist server running on http://localhost:${port} (${isProd ? 'production' : 'API only / development'})`);
  console.log(`Admin panel: http://localhost:${isProd ? port : 3000}/admin`);
  if (!adminConfigured()) {
    console.warn('\n[!] ADMIN_PASSWORD is not set in .env (needs 8+ characters). Admin login is disabled until you set it and restart.');
  }
  if (!process.env.OWNER_WHATSAPP) {
    console.warn('[!] OWNER_WHATSAPP is empty. Set it from Admin > Settings & Excel or directly in .env.');
  }
  exporter.exportNow();
});

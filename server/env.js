import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ENV_PATH = path.join(ROOT_DIR, '.env');

function stripQuotes(value) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

export function parseEnv(text) {
  const out = {};
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    out[key] = stripQuotes(line.slice(eq + 1));
  }
  return out;
}

/** Loads .env into process.env without overriding variables that already exist. */
export function loadEnv(envPath = ENV_PATH) {
  try {
    const parsed = parseEnv(fs.readFileSync(envPath, 'utf8'));
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch {
    // .env is optional
  }
}

/**
 * Writes KEY=value into the .env file (creating it if needed) and updates process.env.
 * Only simple single-line values are accepted so a request can never inject extra keys.
 */
export function setEnvValue(key, value, envPath = ENV_PATH) {
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) throw new Error('Invalid env key');
  const v = String(value);
  if (/[\r\n\0]/.test(v)) throw new Error('Invalid env value');

  let current = '';
  try {
    current = fs.readFileSync(envPath, 'utf8');
  } catch {
    current = '';
  }
  const newline = current.includes('\r\n') ? '\r\n' : '\n';
  const lines = current === '' ? [] : current.split(/\r?\n/);
  const pattern = new RegExp(`^\\s*${key}\\s*=`);
  let replaced = false;
  const next = lines.map((line) => {
    if (!replaced && pattern.test(line)) {
      replaced = true;
      return `${key}=${v}`;
    }
    return line;
  });
  if (!replaced) {
    if (next.length && next[next.length - 1] === '') next.pop();
    next.push(`${key}=${v}`);
  }
  let output = next.join(newline);
  if (!output.endsWith(newline)) output += newline;

  const tmp = `${envPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, output, { mode: 0o600 });
  fs.renameSync(tmp, envPath);
  process.env[key] = v;
}

/** Normalises a Pakistani / international phone into wa.me digits (e.g. 0313-1498344 -> 923131498344). */
export function normalizeWhatsAppNumber(input) {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `92${digits.slice(1)}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function whatsappDisplay(digits) {
  if (!digits) return '';
  if (digits.startsWith('92') && digits.length === 12) return `0${digits.slice(2)}`;
  return `+${digits}`;
}

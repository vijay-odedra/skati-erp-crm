// Shared helpers for the SKATI read-only load/latency audit.
// Credentials are read at runtime from the project's own seed fixture and are never printed.
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';

export const PROJECT_DIR = 'C:/skati-erp-crm';

export function loadEnv() {
  const txt = fs.readFileSync(`${PROJECT_DIR}/.env.local`, 'utf8');
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

export function firebaseConfig() {
  const e = loadEnv();
  return {
    config: {
      apiKey: e.VITE_FIREBASE_API_KEY,
      authDomain: e.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: e.VITE_FIREBASE_PROJECT_ID,
      storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: e.VITE_FIREBASE_APP_ID,
      measurementId: e.VITE_FIREBASE_MEASUREMENT_ID,
    },
    databaseId: e.VITE_FIREBASE_DATABASE_ID || 'default',
    useEmulators: e.VITE_USE_FIREBASE_EMULATORS,
  };
}

// Parse the 5 standard role accounts from the project's live seed fixture.
export function testAccounts() {
  const src = fs.readFileSync(`${PROJECT_DIR}/scratch/seed-live-auth.mjs`, 'utf8');
  const re = /\{\s*email:\s*'([^']+)',\s*password:\s*'([^']+)',\s*role:\s*'([^']+)'/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) out.push({ email: m[1], password: m[2], role: m[3] });
  return out;
}

export const now = () => performance.now();

export async function timed(fn) {
  const t0 = performance.now();
  try {
    const value = await fn();
    return { ok: true, ms: performance.now() - t0, value };
  } catch (error) {
    return { ok: false, ms: performance.now() - t0, error: String(error?.code || error?.message || error) };
  }
}

export function stats(arr) {
  const a = [...arr].sort((x, y) => x - y);
  const n = a.length;
  if (!n) return { n: 0 };
  const pct = (p) => a[Math.min(n - 1, Math.max(0, Math.ceil((p / 100) * n) - 1))];
  const sum = a.reduce((s, v) => s + v, 0);
  return {
    n,
    avg: sum / n,
    p50: pct(50),
    p90: pct(90),
    p95: pct(95),
    p99: n >= 100 ? pct(99) : null, // only report P99 when sample size supports it
    min: a[0],
    max: a[n - 1],
  };
}

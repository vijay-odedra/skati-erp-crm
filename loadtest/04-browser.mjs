// Browser load timing with N truly concurrent, independent browser contexts (separate cookie/storage/cache).
// Target: /dashboard (unauthenticated) -> app boots, Firebase Auth initialises, ProtectedRoute redirects to /login.
// "Usable" = login email input visible and enabled. Each context starts with an empty cache (cold first visit).
// No credentials are used; the login-attempt probe uses a non-existent dummy address.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { stats } from './lib.mjs';

const BASE = process.argv[2] || 'http://localhost:5173';
const LABEL = process.argv[3] || 'dev';
const STAGES = [ [1, 10], [5, 4], [10, 3], [25, 2], [50, 2] ]; // [concurrent contexts, rounds]
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const consoleErrors = new Map();

async function oneLoad() {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') { const t = m.text().slice(0, 160); consoleErrors.set(t, (consoleErrors.get(t) || 0) + 1); } });
  page.on('pageerror', (e) => { const t = 'pageerror: ' + String(e).slice(0, 150); consoleErrors.set(t, (consoleErrors.get(t) || 0) + 1); });
  try {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'commit', timeout: 120000 });
    await page.waitForSelector('input[type="email"]:not([disabled])', { state: 'visible', timeout: 120000 });
    const usable = await page.evaluate(() => performance.now());
    const t = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      return { ttfb: nav.responseStart, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd || null, fcp: fcp ? fcp.startTime : null,
        transfer: performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) + (nav.transferSize || 0),
        requests: performance.getEntriesByType('resource').length + 1, url: location.pathname };
    });
    return { ok: t.url === '/login', usable, ...t };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  } finally {
    await ctx.close();
  }
}

async function loginFailureProbe() {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'loadtest-dummy@example.invalid');
  await page.fill('input[type="password"]', 'not-a-real-password');
  const t0 = Date.now();
  await page.click('button[type="submit"]');
  // error banner text appears in the form
  const msg = await page.waitForFunction(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.style.backgroundColor === 'rgb(254, 226, 226)');
    return el ? el.textContent : null;
  }, null, { timeout: 60000 }).then((h) => h.jsonValue());
  const ms = Date.now() - t0;
  await ctx.close();
  return { ms, msg };
}

const results = { base: BASE, label: LABEL, stages: [] };
await oneLoad(); // warm-up (Vite dev server transforms modules on first request)
for (const [n, rounds] of STAGES) {
  const samples = [];
  const t0 = Date.now();
  for (let r = 0; r < rounds; r++) samples.push(...(await Promise.all(Array.from({ length: n }, oneLoad))));
  const wall = (Date.now() - t0) / 1000;
  const ok = samples.filter((s) => s.ok);
  const row = {
    users: n, rounds, wallSeconds: wall, total: samples.length, ok: ok.length, failed: samples.length - ok.length,
    errors: [...new Set(samples.filter((s) => !s.ok).map((s) => s.error || 'not redirected to /login'))],
    usable: stats(ok.map((s) => s.usable)), fcp: stats(ok.map((s) => s.fcp).filter(Boolean)), dcl: stats(ok.map((s) => s.dcl)),
    ttfb: stats(ok.map((s) => s.ttfb)), requestsPerLoad: ok[0]?.requests, transferBytes: ok[0]?.transfer,
    throughputLoadsPerSec: ok.length / wall,
  };
  results.stages.push(row);
  console.log(`${LABEL} n=${n} ok=${row.ok}/${row.total} usable avg=${(row.usable.avg / 1000).toFixed(2)}s p95=${(row.usable.p95 / 1000).toFixed(2)}s max=${(row.usable.max / 1000).toFixed(2)}s fcp=${(row.fcp.avg / 1000).toFixed(2)}s`);
  if (row.failed > row.total * 0.2) { console.log('Stopping: >20% failures'); break; }
}
results.loginProbe = [];
if (process.env.PROBE) for (let i = 0; i < 5; i++) results.loginProbe.push(await loginFailureProbe());
results.consoleErrors = Object.fromEntries(consoleErrors);
await browser.close();
fs.writeFileSync(`out-04-browser-${LABEL}.json`, JSON.stringify(results, null, 2));
console.log('login probe', results.loginProbe);
console.log('console errors', results.consoleErrors);

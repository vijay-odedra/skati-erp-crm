// Page-level timing of the real app (1 browser session). Login goes through the app's own Auth-unconfigured
// fallback (dummy address, no credentials) because Firebase Auth is not enabled in the project.
// Each page is opened by direct URL (= browser refresh / reinitialisation). Definitions, from navigation start:
//   FCP = first-contentful-paint; DCL = DOMContentLoaded; RENDERED = last DOM mutation before 1.2 s of DOM quiet
//   (i.e. main page data rendered and spinners gone); USABLE = RENDERED with no "Loading" text on the page.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { stats } from './lib.mjs';

const BASE = process.argv[2] || 'http://localhost:4173';
const LABEL = process.argv[3] || 'prod';
const ROUNDS = Number(process.argv[4] || 3);
const PAGES = ['/dashboard', '/raw-materials', '/products', '/finished-products', '/production', '/purchases', '/suppliers', '/crm', '/sales', '/reports', '/users', '/settings'];

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const ctx = await browser.newContext();
await ctx.addInitScript(() => {
  window.__lastMut = 0;
  new MutationObserver(() => { window.__lastMut = performance.now(); }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
});
const page = await ctx.newPage();
const consoleErr = {};
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = `${m.type()}: ${m.text().slice(0, 140)}`; consoleErr[t] = (consoleErr[t] || 0) + 1; } });
page.on('pageerror', (e) => { const t = `pageerror: ${String(e).slice(0, 140)}`; consoleErr[t] = (consoleErr[t] || 0) + 1; });

async function settle(timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const s = await page.evaluate(() => ({ now: performance.now(), last: window.__lastMut, loading: /Loading/i.test(document.body.innerText) }));
    if (s.now - s.last > 1200 && !s.loading) return { rendered: s.last, timedOut: false };
    await page.waitForTimeout(100);
  }
  return { rendered: await page.evaluate(() => window.__lastMut), timedOut: true };
}

// Login timing (fallback path): submit -> dashboard rendered.
await page.goto(`${BASE}/login`);
await page.waitForSelector('input[type="email"]');
await page.fill('input[type="email"]', 'loadtest-50u-timing@example.invalid');
await page.fill('input[type="password"]', 'dummy-not-a-credential');
const submitAt = await page.evaluate(() => performance.now());
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 30000 });
const loginRendered = await settle();
const login = { toDashboardRenderedMs: loginRendered.rendered - submitAt, timedOut: loginRendered.timedOut, url: page.url() };
console.log('login(fallback) -> dashboard rendered', (login.toDashboardRenderedMs / 1000).toFixed(2), 's');

const res = {};
for (let r = 0; r < ROUNDS; r++) {
  for (const p of PAGES) {
    await page.goto(`${BASE}${p}`, { waitUntil: 'commit' });
    const s = await settle();
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      const txt = document.body.innerText;
      return { fcp: fcp?.startTime ?? null, dcl: nav.domContentLoadedEventEnd, path: location.pathname,
        codes: (txt.match(/\b[A-Z]{2,5}-\d{2,}/g) || []).length, denied: /access denied/i.test(txt), textLen: txt.length };
    });
    (res[p] ||= []).push({ ...m, rendered: s.rendered, timedOut: s.timedOut });
  }
}
const summary = {};
for (const [p, rows] of Object.entries(res)) {
  summary[p] = { fcp: stats(rows.map((x) => x.fcp)), dcl: stats(rows.map((x) => x.dcl)), rendered: stats(rows.map((x) => x.rendered)),
    timedOut: rows.filter((x) => x.timedOut).length, finalPath: rows[0].path, recordCodesVisible: rows.at(-1).codes, accessDenied: rows[0].denied };
  const f = (o) => (o.avg / 1000).toFixed(2);
  console.log(p.padEnd(20), 'fcp', f(summary[p].fcp), 'dcl', f(summary[p].dcl), 'rendered avg', f(summary[p].rendered), 'max', (summary[p].rendered.max / 1000).toFixed(2), 'codes', summary[p].recordCodesVisible, summary[p].timedOut ? 'TIMEOUT' : '', summary[p].finalPath !== p ? `-> ${summary[p].finalPath}` : '');
}
await browser.close();
fs.writeFileSync(`out-12-pages-${LABEL}.json`, JSON.stringify({ base: BASE, rounds: ROUNDS, login, summary, raw: res, console: consoleErr }, null, 2));
console.log('console:', consoleErr);

# SKATI ERP & CRM — 50-User Load Test, Firebase Storage Audit & Performance Report

**Test date:** 2026-10-13 · **Project dir:** `C:\skati-erp-crm` · **Final verdict:** **`BLOCKED`**

> **Read this first.** No authenticated user session could be created. Firebase Authentication is not set up in the project the app connects to (`skati-erp-crm-76657`), so the authenticated 50-user test could not run. While investigating, two **critical security problems** were found (see §1.2). With the owner's approval, everything below was measured **read-only**. No test writes were made and no records were created, changed or deleted.

---

## 1. Executive Summary

| Metric | Actual Result |
|---|---|
| Firebase project | **`skati-erp-crm-76657`**. This is **not** the expected `skati-erp-crm`: all six config values differ (§3). The owner confirmed `-76657` is the intended project. |
| Environment tested | **Real Firebase (cloud)**, Firestore named database **`default`**. The app ran locally: Vite dev server (`start:live`) and production build (`vite preview`). Emulator not used. |
| Maximum concurrent users tested | 50 independent Firestore clients (read-only, **unauthenticated**); 50 independent browser contexts (login screen only) |
| Successfully handled concurrent users | **Authenticated: 0 verified** (Auth not configured). Read-only backend: 50 clients, 0 errors. |
| Average dashboard load time | **1.11 s** (production build, 1 user, data fully rendered, n=3); **0.89 s** on dev server (n=2) |
| P95 dashboard load time | 1.23 s (n=3, so P95 = maximum). Backend dashboard data at 50 clients: P95 0.71 s |
| P99 dashboard load time | NOT MEASURED (sample too small) |
| Average Firestore read latency | **0.42 s** (single document); 0.40–0.45 s per list query |
| Average Firestore write latency | **NOT MEASURED**: writes not authorised (read-only run) |
| Overall request error rate | **0.00 %** (564 measured backend requests in the staged test, 0 failed) |
| Measured throughput | 20.67 req/s at 50 clients. This is a closed loop with 2 s think time, so it is **not** a saturation limit. |
| Average raw material document JSON size | **371 bytes = 0.362 KiB** (Firestore storage estimate: 362 B = 0.354 KiB) |
| Average transaction document JSON size | **310 bytes = 0.303 KiB** (`stockTransactions`; Firestore estimate 340 B = 0.332 KiB) |
| Total measured documents | **59** (all 25 collections) |
| Estimated document storage | **18,043 B = 17.62 KiB = 0.017 MiB** (excludes indexes); ≈ 138.5 KiB including an index upper-bound estimate |
| Actual billed storage available? | **No** (no Console or billing access) |
| Data integrity | **NOT TESTED** (no writes allowed). Read-only run: 0 documents changed. |
| Data lost or corrupted | 0 observed (doc counts identical across two full audits) |
| Duplicate business records | NOT MEASURED |
| Build | **PASS** (only after a Windows install workaround, §21) |
| Lint | **PASS**: 0 errors, 29 warnings |
| Recommended safe concurrency | **Cannot be determined for real (authenticated) users.** Read-only backend showed no degradation up to 50 clients. |
| Final verdict | **`BLOCKED`** |

### 1.1 Plain-English answers

- **Dashboard load, 1 user:** about **1.1 seconds** from opening the page until the data is on screen (production build). On the dev server (`npm run start:live`) a first cold visit to the login screen takes about **0.9 s**.
- **10 users:** NOT MEASURED as authenticated browser users. The dashboard's *data* took **0.71 s** on average with 10 simultaneous clients.
- **25 users:** dashboard data took **0.54 s** on average (P95 0.72 s).
- **50 users:** dashboard data took **0.50 s** on average (P95 0.71 s). Firestore did **not** slow down between 1 and 50 clients.
  - *Caveat:* the full-browser timings for 10/25/50 users (login screen only) **did** slow down: 1.3 s / 6.5 s / 20.7 s on the production build. That slowdown came from one laptop running 50 Chrome sessions at once. The web server answered in about 0.01 s throughout. These numbers do **not** show what 50 people on 50 PCs would see.
- **Slowest page:** **Products & BOM**, 2.25 s average (max 3.11 s). Next is Finished Products at 1.95 s.
- **Slowest operation:** **pagination**, 0.83 s for loading page 1 then page 2. Next is a cold app restart plus the first query at 0.63 s.
- **Storage per record:** a typical business record is **about 0.3–0.55 KiB** (300–580 bytes), not 3–5 KB. The average business document is **377 bytes** of Firestore storage.
- **1,000 records ≈ 0.36 MiB; 10,000 records ≈ 3.6 MiB.** Including an upper-bound estimate of automatic index storage: ≈ 2.9 MiB and ≈ 29 MiB.
- **Was data verified in Firebase?** Reading: yes. 59 real documents were read from `skati-erp-crm-76657 / default`. Writing: **no**. No write or read-back test could be done, because login is impossible and writes were not authorised.
- **Errors or conflicts:** 0 failed requests in the backend test. One transient internal gRPC stream reset was retried automatically by the SDK. Transactions were not tested.
- **Ready for a controlled production pilot?** **No.** See §1.2. Authentication does not work, and the live data is readable without logging in.

### 1.2 Critical findings (must fix before any pilot)

| # | Finding | Evidence |
|---|---|---|
| C1 | **Firebase Authentication is not set up** in `skati-erp-crm-76657`. | Every sign-in, including the 5 seeded role accounts, returns `auth/configuration-not-found`. A raw REST call to `identitytoolkit … accounts:signInWithPassword` returns `400 CONFIGURATION_NOT_FOUND`. |
| C2 | **Login bypass: any email/password becomes System Admin.** When sign-in fails with `auth/configuration-not-found` **or `auth/network-request-failed`** (for example, offline), the app creates a fake admin session and saves it in `localStorage['skati_demo_user']`. | [AuthContext.tsx:118-160](src/contexts/AuthContext.tsx:118). Verified: a dummy, non-existent address reached the full Administrator dashboard. Anyone can also put `skati_demo_user` into localStorage by hand. |
| C3 | **Unknown users default to the admin role.** If a profile read fails or takes longer than 1.5 s, the UI assigns `role: 'admin'` to any email not on a hard-coded list. This will matter once Auth is enabled, because measured read latency is 0.4–1.0 s and slow networks can exceed 1.5 s. | [AuthContext.tsx:41-62](src/contexts/AuthContext.tsx:41) |
| C4 | **Live business data can be read without logging in.** The rules **deployed** to the project are not the ones in the repo's `firestore.rules`, which require sign-in and roles. Unauthenticated *queries* return documents from all 25 collections, including all 5 user profiles (emails, roles), orders and payments. Unauthenticated *list* requests (REST `GET`) are denied. | `loadtest/07-sdk-unauth.mjs`, `loadtest/08-rest-runquery.mjs`. No record contents were printed or stored. **Write access without login was deliberately not tested.** Assume it may also be open until the deployed rules are checked. |

---

## 2. Environment Tested

| Item | Value |
|---|---|
| Firebase project | `skati-erp-crm-76657` (from `.env`, `.env.local`, `.firebaserc`) |
| Firestore database ID | `default`: a *named* database. The project has **no** `(default)` database (REST returns `404 … database (default) does not exist`). |
| Emulator | Not used. `VITE_USE_FIREBASE_EMULATORS=false`. The local emulator cannot run on this PC anyway: **Java is not installed**, and `./emulator-data` does not exist. |
| App mode | `start:live` runs **Vite dev server** (`npx vite --host 0.0.0.0 --port 5173`). Production build was served separately with `vite preview` on port 4173. Nothing was deployed. |
| Test machine | Intel i7-1165G7 (4 cores / 8 threads), 11.8 GiB RAM, Windows 11, Node 24.12.0, Chrome (installed) |
| Network | Home/office Wi-Fi. The minimum Firestore round-trip observed was 0.34–0.36 s, which suggests the database region is far from the test location (region not verifiable without Console access). |
| Firebase plan | NOT VERIFIED |

**Does `npm run start:live` work as written? No, not on Windows.** npm runs scripts through `cmd.exe`, which fails with `'.' is not recognized…`. The same script was therefore run as `bash ./start.sh live`. That is the identical script, launched through Git Bash. `start.sh` also rewrites `.env`/`.env.local` with `sed -i` on every start, and uses `lsof`, which is not available on Windows. `.env` was confirmed byte-identical after the run.

---

## 3. Firebase Configuration Verification

The screenshot mentioned in the request **was not attached**, so the comparison below is against the values listed in the request.

| Key | Expected (request) | Configured (`.env` / `.env.local`) | Match |
|---|---|---|---|
| Project ID | `skati-erp-crm` | `skati-erp-crm-76657` | ❌ |
| Auth domain | `skati-erp-crm.firebaseapp.com` | `skati-erp-crm-76657.firebaseapp.com` | ❌ |
| Storage bucket | `skati-erp-crm.firebasestorage.app` | `skati-erp-crm-76657.firebasestorage.app` | ❌ |
| Messaging sender ID | `101565252940` | `277695282161` | ❌ |
| App ID | `1:101565252940:web:e68b…` | `1:277695282161:web:c400…` | ❌ |
| Measurement ID | `G-GZ1BK6ZTTM` | `G-D0MNENV626` | ❌ |
| API key | (not exposed) | Valid for `-76657`: requests are accepted and reach Auth and Firestore | n/a |

Other configuration notes:
- `.env` and `.env.local` are identical and set `VITE_APP_ENV=production`.
- `.gitignore` explicitly *un-ignores* `.env` and `.env.local`.
- The project is not a git repository.
- Emulator-only scripts (`scratch/seed-users.mjs`, `seed-full-test-suite.mjs`) use project `skati-erp-crm`. The live scripts use whichever project the `serviceAccountKey.json` names, and that file is not present.

The owner confirmed `skati-erp-crm-76657` is the intended project, so tests ran against it.

---

## 4. Authentication Verification

| Check | Result |
|---|---|
| Firebase Auth initialises in the browser | Yes (SDK loads) |
| Sign-in with each of the 5 seeded role accounts | **FAIL ×5**: `auth/configuration-not-found` (sign-in attempt took 0.47–0.97 s) |
| Raw Identity Toolkit REST probe | `400 CONFIGURATION_NOT_FOUND`: Authentication was never initialised for this project |
| Session persistence, separate test users, role restrictions | **NOT TESTABLE** |
| UI behaviour on a failed login | **Bypass** to Administrator (finding C2). Fallback login to dashboard rendered took 3.29 s (prod) / 1.87 s (dev). This is **not** a real login timing. |

---

## 5. Firestore Connection and Read/Write Proof

| Item | Result |
|---|---|
| Environment | Real cloud, `skati-erp-crm-76657`, database `default` |
| Authentication | **Not possible** (C1) |
| Read | **PASS (unauthenticated):** 59 documents across 25 collections read twice with identical counts. Single-document read averaged 0.42 s. |
| Write | **BLOCKED**: login impossible, and writes were not authorised by the owner (read-only run) |
| Read-back | **BLOCKED** |
| Write / update / transaction latency | **NOT MEASURED** |
| Existing records intact | Yes. No writes were issued, and the fallback login path makes no profile update. |

The live data is exactly the 59 records created by `scratch/provision-live-database.mjs`: every document's computed size matches the fixture byte-for-byte. **No business activity has happened in this project yet.**

---

## 6. Test Infrastructure

All scripts are in `loadtest/` and raw results in `loadtest/results/`. Credentials are never stored in the scripts: they are read at runtime from `.env.local` and the existing seed fixture, and never printed.

| Test | Tool / concurrency model | What it measures |
|---|---|---|
| `01-connect`, `02-rest` | Firebase JS SDK 12.19 + REST | Auth and database existence |
| `03-storage` | Offline: runs the live provisioning fixture against a stub Firestore | Exact documents the fixture writes, sized |
| `09-live-storage` | SDK, read-only | Real document count and size per collection |
| `10-live-ops` | 1 SDK client, sequential, 15 samples per operation, `getDocsFromServer` (no cache) | Per-operation backend latency |
| `11-live-load` | **N independent clients**, each with its own `FirebaseApp` + Firestore connection, running concurrently. Closed loop: operation, then **2 s think time**. **3 s warm-up** (excluded) and **15 s steady state** per stage. Mix: 15 % full dashboard (10 parallel queries, exactly as in `dashboardQueries.ts`), 60 % page list query, 10 % single-doc get, 15 % paginated query. | Backend latency, errors, throughput at 1/5/10/25/50 |
| `04-browser` | Playwright-core + installed Chrome, headless; **N independent browser contexts**, each with its own cookies, storage and empty cache, loading simultaneously. 1 untimed warm-up. Rounds: 10/4/3/2/2. | Cold app load to a usable login screen, dev vs prod |
| `12-pages` | Playwright, 1 browser session; each page opened by direct URL (equivalent to a refresh) | Per-page time until data is rendered |

**Timing definitions (browser):** all are measured from navigation start.
- **FCP**: first contentful paint.
- **DCL**: DOMContentLoaded (*not* data loaded).
- **Rendered**: time of the last DOM change before 1.2 s of no further changes, with no "Loading" text on the page. This means the main data is shown and the page is usable.
- **Usable (login)**: the email field is visible and enabled.

Browser timings and Firestore request timings are reported separately and never mixed.

---

## 7. Concurrent User Results

### 7.1 Firestore backend: read-only, unauthenticated, independent clients

| Concurrent Users | Test Duration | Total Requests | Successful | Failed | Error % | Avg (s) | P50 (s) | P95 (s) | P99 (s) | Throughput (req/s) |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3 s + 15 s | 6 | 6 | 0 | 0.00 | 0.54 | 0.40 | 1.24 | n/a | 0.40 |
| 5 | 3 s + 15 s | 31 | 31 | 0 | 0.00 | 0.50 | 0.39 | 0.63 | n/a | 2.07 |
| 10 | 3 s + 15 s | 63 | 63 | 0 | 0.00 | 0.44 | 0.39 | 0.64 | n/a | 4.20 |
| 25 | 3 s + 15 s | 154 | 154 | 0 | 0.00 | 0.47 | 0.43 | 0.65 | 1.26 | 10.27 |
| 50 | 3 s + 15 s | 310 | 310 | 0 | 0.00 | 0.44 | 0.42 | 0.59 | 0.71 | 20.67 |

- A "request" is one user action: a full dashboard (10 queries), a list, a get, or a pagination step.
- P99 is shown only where n ≥ 100.
- Load-generator CPU was 2–27 %, so the generator was not the bottleneck.
- The 1-user stage has only 6 samples. The 255-sample single-client run in §9 is the better 1-user figure.
- The single 3.05 s maximum at 5 users is one dashboard outlier.

### 7.2 Browser: cold app load to usable login screen (no data, unauthenticated)

| Users | Dev server (`start:live`) Avg / P50 / P95 / Max (s) | Fails | Production build Avg / P50 / P95 / Max (s) | Fails |
|---:|---|---:|---|---:|
| 1 | 0.94 / 0.95 / 0.98 / 0.98 (n=10) | 0 | 0.29 / 0.29 / 0.32 / 0.32 (n=10) | 0 |
| 5 | 2.85 / 2.84 / 2.96 / 3.19 (n=20) | 0 | 0.65 / 0.64 / 0.72 / 0.79 (n=20) | 0 |
| 10 | 5.93 / 5.74 / 6.51 / 6.54 (n=30) | 0 | 1.28 / 1.16 / 1.80 / 1.87 (n=30) | 0 |
| 25 | 19.16 / 18.26 / 20.46 / 20.50 (n=50) | 0 | 6.49 / 6.51 / 7.88 / 7.93 (n=50) | 0 |
| 50 | 61.25 / 56.20 / 67.95 / 68.02 (n=94) | **6 (6 %)** | 20.70 / 16.61 / 25.90 / 26.05 (n=100) | 0 |

**What these numbers mean:**
- Server time-to-first-byte stayed at about 0.00–0.02 s at every level. The slowdown is the **single test laptop** rendering N Chrome tabs at once.
- The 6 dev-server failures were `net::ERR_INSUFFICIENT_RESOURCES`, which means the browser itself ran out of resources.
- Each cold dev-server load downloads **116 files / 19.7 MB**. The production build downloads **5 files / 0.34 MB**.

---

## 8. Page Load Time in Seconds (1 user, real data rendered)

Each page was opened by direct URL, which is the same as a browser refresh with full Firebase re-initialisation.

| Page | Prod: Avg / P50 / Max (s), n=3 | Dev: Avg / Max (s), n=2 | First paint, prod (s) | Real data visible |
|---|---|---|---:|---|
| Dashboard | **1.11** / 1.16 / 1.23 | 0.89 / 0.94 | 0.19 | Yes |
| Raw Materials | 1.16 / 1.17 / 1.40 | 1.03 / 1.18 | 0.11 | Yes (5 records) |
| Products & BOM | **2.25** / 2.03 / 3.11 | 1.76 / 1.89 | 0.17 | Yes |
| Finished Products | 1.95 / 1.96 / 2.01 | 1.56 / 1.58 | 0.18 | Yes |
| Production | 1.11 / 1.13 / 1.37 | 1.54 / 2.22 | 0.17 | Yes |
| Purchases | 1.06 / 1.13 / 1.15 | 0.88 / 0.89 | 0.14 | Yes |
| Suppliers | 1.07 / 1.05 / 1.20 | 0.88 / 0.89 | 0.12 | Yes |
| CRM & Leads | 1.56 / 1.02 / 2.75 | 0.90 / 0.90 | 0.12 | Yes |
| Sales & Orders | 1.02 / 1.03 / 1.07 | 1.62 / 2.38 | 0.12 | Yes |
| Reports | 1.08 / 1.03 / 1.18 | 1.16 / 1.44 | 0.10 | Yes |
| User Management | 0.16 / 0.11 / 0.31 | 0.14 / 0.15 | 0.16 | No record codes detected |
| Settings | 0.12 / 0.09 / 0.20 | 0.16 / 0.17 | 0.12 | Static page |

- With 3 samples, P90/P95 equal the maximum, and P99 is NOT MEASURED.
- The dev-server rows ran with a warm browser module cache in the same session, so they are not slower than prod here.
- Page timings with data at 10, 25 and 50 concurrent **browser** users: **NOT MEASURED**. This needs authenticated sessions and multiple load-generating machines. The backend share of these pages under 10/25/50 users is in §7.1.

### §12 page matrix (as requested)

| Page | 1 User (s) | 10 Users (s) | 25 Users (s) | 50 Users (s) | Errors | Result |
|---|---:|---:|---:|---:|---:|---|
| Dashboard | 1.11 | NOT MEASURED (backend 0.71) | NOT MEASURED (backend 0.54) | NOT MEASURED (backend 0.50) | 0 | Blocked (auth) |
| All other pages | see table above | NOT MEASURED | NOT MEASURED | NOT MEASURED | 0 | Blocked (auth) |

---

## 9. Operation Latency in Seconds (single client, 15 samples each, no cache)

| Operation | Avg | P50 | P90 | P95 | Min | Max | n |
|---|---:|---:|---:|---:|---:|---:|---:|
| Firestore read: single document | 0.42 | 0.41 | 0.47 | 0.50 | 0.39 | 0.50 | 15 |
| Dashboard data (10 parallel queries) | 0.56 | 0.52 | 0.79 | 1.06 | 0.38 | 1.06 | 15 |
| Raw Materials page query (`isActive` + `orderBy materialCode`) | 0.41 | 0.41 | 0.42 | 0.43 | 0.36 | 0.43 | 15 |
| List query: rawMaterials / products / productions / purchases / suppliers | 0.44 / 0.41 / 0.45 / 0.44 / 0.41 | 0.39–0.41 | 0.44–0.65 | 0.46–0.71 | 0.36–0.38 | 0.46–0.71 | 15 each |
| List query: leads / orders / bomItems / stockTransactions / customers | 0.43 / 0.40 / 0.40 / 0.40 / 0.44 | 0.39–0.41 | 0.41–0.58 | 0.46–0.74 | 0.36 | 0.46–0.74 | 15 each |
| Search response | 0.41 (server part, same as the Raw Materials query; filtering happens in the browser) | | | | | | 15 |
| Pagination: page 1 then page 2 | **0.83** | 0.82 | 0.93 | 0.99 | 0.71 | 0.99 | 15 |
| Pagination: next page only (`startAfter`) | 0.40 | 0.39 | 0.44 | 0.46 | 0.36 | 0.46 | 15 |
| Reports-style range query | 0.42 | 0.41 | 0.52 | 0.60 | 0.38 | 0.60 | 15 |
| Refresh / re-initialisation (new client + first query) | 0.63 | 0.60 | 0.87 | 0.91 | 0.54 | 0.91 | 15 |
| Firestore write / update / transaction | NOT MEASURED | | | | | | 0 |
| Login completion (real) | NOT MEASURED (Auth not configured) | | | | | | 0 |

## 10. P50/P95/P99 Measurements

These are given in §7–§9. P99 is reported only where a stage has at least 100 samples: 25 users = 1.26 s, 50 users = 0.71 s. Everywhere else it is n/a.

## 11. Throughput and Error Rate

- **Backend:** 564 requests, 0 failed, so the error rate is **0.00 %**. Throughput grew in line with users (0.40 → 20.67 req/s) because the test used a fixed 2 s think time; latency did not rise. **No saturation point was reached.**
- One transient `GrpcConnection RPC 'Listen' stream … RST_STREAM (Internal server error)` was logged at 50 users. The SDK retried it, and no request failed.
- **Browser (login screen):** 0 % errors up to 25 contexts. 6 % at 50 contexts on the dev server, caused by the test PC running out of browser resources. 0 % on the production build.

---

## 12. Firestore Document Size by Record Type (measured from live data)

All documents were read from the live project. The **JSON** column is the UTF-8 size of `JSON.stringify` with timestamps as ISO strings. The **Firestore estimate** follows Google's storage-size rules:

- **Document name:** Σ(UTF-8 bytes of collection ID and doc ID + 1) + 16
- **Field name:** UTF-8 bytes + 1
- **Values:** string = UTF-8 bytes + 1; number or timestamp = 8; boolean or null = 1
- **Document:** name + fields + 32

**Index estimate** is an upper bound for automatic single-field indexes: 2 entries per scalar field (ascending and descending), each entry = doc name + collection ID + field name + value + 32. It is **not** billed data.

| Record Type | Sample Count | Fields | Avg JSON (bytes) | Avg (KiB) | Min (KiB) | Max (KiB) | Estimated Stored Size (Firestore rules) | Est. index entries per doc (upper bound) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| User profile (`users`) | 5 | 8 | 245 | 0.239 | 0.226 | 0.250 | 230 B (0.224 KiB) | 1552 B |
| Counter (`counters`) | 12 | 1 | 19 | 0.019 | 0.019 | 0.019 | 89 B (0.087 KiB) | 196 B |
| Raw material (`rawMaterials`) | 5 | 13 | 371 | 0.362 | 0.348 | 0.372 | 362 B (0.354 KiB) | 2695 B |
| Stock transaction (`stockTransactions`) | 5 | 10 | 310 | 0.303 | 0.299 | 0.309 | 340 B (0.332 KiB) | 2516 B |
| Product (`products`) | 3 | 11 | 359 | 0.350 | 0.348 | 0.354 | 344 B (0.336 KiB) | 2205 B |
| BOM item (`bomItems`) | 5 | 12 | 352 | 0.344 | 0.340 | 0.351 | 339 B (0.331 KiB) | 2324 B |
| Production (`productions`) | 1 | 16 | 521 | 0.509 | 0.509 | 0.509 | 462 B (0.451 KiB) | 3318 B |
| Production item (`productionItems`) | 1 | 9 | 251 | 0.245 | 0.245 | 0.245 | 280 B (0.273 KiB) | 2000 B |
| Finished product stock (`finishedProductStock`) | 3 | 6 | 191 | 0.187 | 0.184 | 0.191 | 234 B (0.229 KiB) | 1501 B |
| Finished product transaction (`finishedProductTransactions`) | 1 | 11 | 316 | 0.309 | 0.309 | 0.309 | 345 B (0.337 KiB) | 2986 B |
| Supplier (`suppliers`) | 2 | 16 | 480 | 0.468 | 0.459 | 0.478 | 445 B (0.434 KiB) | 3189 B |
| Purchase (`purchases`) | 1 | 17 | 513 | 0.501 | 0.501 | 0.501 | 480 B (0.469 KiB) | 3412 B |
| Purchase item (`purchaseItems`) | 1 | 14 | 340 | 0.332 | 0.332 | 0.332 | 367 B (0.358 KiB) | 2920 B |
| Lead (`leads`) | 2 | 18 | 518 | 0.506 | 0.501 | 0.511 | 474 B (0.463 KiB) | 3306 B |
| Follow-up (`followUps`) | 1 | 12 | 419 | 0.409 | 0.409 | 0.409 | 384 B (0.375 KiB) | 2438 B |
| Customer (`customers`) | 2 | 18 | 545 | 0.532 | 0.525 | 0.538 | 510 B (0.498 KiB) | 3657 B |
| Customer requirement (`customerRequirements`) | 1 | 15 | 455 | 0.444 | 0.444 | 0.444 | 449 B (0.438 KiB) | 3684 B |
| Quotation (`quotations`) | 1 | 18 | 566 | 0.553 | 0.553 | 0.553 | 516 B (0.504 KiB) | 3706 B |
| Quotation item (`quotationItems`) | 1 | 15 | 363 | 0.354 | 0.354 | 0.354 | 391 B (0.382 KiB) | 3192 B |
| Sales order (`orders`) | 1 | 20 | 579 | 0.565 | 0.565 | 0.565 | 535 B (0.522 KiB) | 3744 B |
| Order item (`orderItems`) | 1 | 16 | 382 | 0.373 | 0.373 | 0.373 | 410 B (0.400 KiB) | 3152 B |
| Production-order link (`productionOrderLinks`) | 1 | 8 | 206 | 0.201 | 0.201 | 0.201 | 240 B (0.234 KiB) | 1894 B |
| Dispatch (`dispatches`) | 1 | 15 | 486 | 0.475 | 0.475 | 0.475 | 442 B (0.432 KiB) | 3118 B |
| Dispatch item (`dispatchItems`) | 1 | 10 | 280 | 0.273 | 0.273 | 0.273 | 301 B (0.294 KiB) | 2178 B |
| Payment (`payments`) | 1 | 14 | 448 | 0.438 | 0.438 | 0.438 | 426 B (0.416 KiB) | 2794 B |

**Limitations:**
- Many collections hold only 1–5 sample documents, all from the provisioning fixture. Real records with longer names, notes or addresses will be larger.
- The fixture uses short IDs (for example `rm-001`). Documents created by the app use 20-character auto-IDs, which adds about 14 bytes per document and about 14 bytes per index entry.
- The single-field index estimate assumes no index exemptions. Composite indexes from `firestore.indexes.json` are **excluded**.

## 13. Estimated Total Firestore Storage

| Measure | Value |
|---|---|
| Documents | 59 (42 business records + 12 counters + 5 user profiles) |
| Total serialized JSON | 17,476 B = 17.07 KiB |
| **Total document storage (Firestore estimate)** | **18,043 B = 17.62 KiB = 0.0172 MiB** (indexes **excluded**) |
| Average per document (all 59) | 305.8 B |
| Average per **business** document (42, excludes counters and users) | **376.8 B** storage / 381.5 B JSON |
| Single-field index estimate (upper bound) | 123,748 B = 120.85 KiB; total with documents ≈ 138.47 KiB |
| Actual billed storage | NOT AVAILABLE |
| Firebase Storage (file bucket) usage | NOT MEASURED. The app code makes no Storage uploads, and the bucket is **not** included in any figure here. |

Units are binary: 1 KiB = 1,024 B and 1 MiB = 1,024 KiB.

## 14. Storage Growth Projections

**Formula:** projected storage = document count × 376.8 B, where 376.8 B is the measured average business document, weighted by the record mix that exists today. The "incl. index (upper bound)" column adds 2,705.5 B per document. Real index storage is likely lower, because the estimate assumes every field is indexed in both directions.

| Document Count | Estimated Document Storage | Incl. index estimate (upper bound) | Indexes Included? | Actual or Estimate? |
|---:|---:|---:|---|---|
| 1,000 | 0.36 MiB | 2.94 MiB | No / Yes (est.) | Estimate |
| 10,000 | 3.59 MiB | 29.40 MiB | No / Yes (est.) | Estimate |
| 100,000 | 35.93 MiB | 293.95 MiB | No / Yes (est.) | Estimate |
| 500,000 | 179.67 MiB | 1.44 GiB | No / Yes (est.) | Estimate |
| 1,000,000 | 359.33 MiB | 2.87 GiB | No / Yes (est.) | Estimate |

Per 1,000 documents of a single type:
- Raw materials: 0.35 MiB (2.92 MiB with indexes)
- Stock transactions: 0.32 MiB (2.72 MiB)
- Sales orders: 0.51 MiB (4.08 MiB)

**Practical example. The workload is an *assumption*, not an observation**, because the live project has had no business activity yet: **if** the system creates **200 records per working day** across all modules, over **300 working days**, that is 60,000 documents per year. That is ≈ **21.6 MiB** of document storage, or ≈ 176 MiB including the index upper bound.

At this size, **storage is unlikely to be the cost driver. Document reads are** (§16). Storage is billed per GiB-month, while reads and writes are billed per operation.

## 15. Index Storage Limitations

- Actual index storage cannot be read without Console or Cloud Monitoring access.
- The estimate above covers only automatic single-field indexes, as an upper bound.
- `firestore.indexes.json` (9.8 KB) defines composite indexes. Their storage is not included, and could not be verified as deployed.

---

## 16. Firebase Read/Write Usage

| Item | Value | How obtained |
|---|---:|---|
| Document reads by this test run | ≈ 4,550, plus an estimated few hundred from the browser page tests | Client instrumentation: max(1, docs returned) per query, plus 1 per `count()` |
| Writes / updates / deletes by this run | **0** | No write calls were issued. The fallback login does not call `updateUserLastLogin`. |
| Transaction attempts / retries | 0 / 0 | No transactions run |
| Failed operations | 0 backend. 5 sign-in attempts failed (Auth not configured). 25 unauthenticated REST list calls were denied. | |
| Actual cloud usage (Console metrics) | NOT AVAILABLE | |

**Reads per screen, measured with the current 59-document dataset:**
- A full admin dashboard costs **≈ 18 reads**: 10 queries, each billed at least 1 read.
- The dashboard queries use `limit(100)`, `limit(50)` and `limit(30)`. With real data, one dashboard load can therefore cost **up to ≈ 550 reads**.
- Example: 50 users opening the dashboard 10 times a day would use about 275,000 reads per day at full limits, which is above the free tier's 50,000 per day.
- **No monthly bill is projected.** The plan, region and pricing were not verified.

---

## 17. Data Integrity Results — **NOT TESTED**

Writes were not authorised and login is impossible, so none of the write-side checks could run:
- duplicate IDs or codes, lost updates, partial transactions, orphan references
- negative stock, double stock deduction, duplicate batches, purchase totals
- over-dispatch, overpayment, payment balance, cross-user corruption

Read-only observation: the document count per collection was identical across two full audits (59 documents), so the test caused no data change.

**Code observation (not a test result):** 16 service files use `runTransaction` for counters and multi-document business operations. Whether these behave correctly under contention is **unverified**.

## 18. Transaction and Race-Condition Results — **NOT TESTED** (same reason).

## 19. Authentication and Permission Results

- Role-based checks for admin, manager, production, purchase and sales: **NOT TESTABLE** (C1).
- What was observed instead: any login produces an Administrator UI (C2/C3).
- Server-side, *queries* are not protected by the deployed rules (C4).
- **Blocking unauthorised operations under concurrent load could not be shown.**

## 20. Browser Console Results

| Message | Where |
|---|---|
| `Failed to load resource: 400` (Identity Toolkit sign-in) | every login attempt |
| `[AuthContext] Firebase Auth unconfigured, falling back to authenticated persona profile.` | every login attempt |
| `net::ERR_INSUFFICIENT_RESOURCES` ×6 | dev server, 50 simultaneous contexts (test-PC limit) |
| `GrpcConnection RPC 'Listen' stream … RST_STREAM` ×1 | Node SDK, 50 clients, retried automatically |

No uncaught page errors were recorded on any of the 12 pages.

## 21. Build and Lint Results

| Step | Result |
|---|---|
| `npm install` | **FAIL on Windows.** `package.json` lists `@rolldown/binding-linux-x64-gnu` (Linux-only) as a hard dependency, so npm stops with `EBADPLATFORM`. Workaround used: `npm install --force --no-package-lock`. `package.json` and the lockfile were left unchanged. |
| `npm run build` (`tsc -b && vite build`) | **PASS**, 8.8 s. Output is one JS chunk of **1,354.66 kB (337.15 kB gzip)**, with a Vite warning that the chunk is over 500 kB. |
| `npm run lint` (oxlint) | **PASS**: 0 errors, 29 warnings (24 `react(set-state-in-effect)`, 5 `no-unused-vars`) |

---

## 22. Performance Bottlenecks

| # | Problem | Evidence | Measured impact | Fix | Needed before production? |
|---|---|---|---|---|---|
| 1 | Auth not configured; login bypass; admin default role | §1.2 C1–C3 | The app cannot be used securely | Enable Email/Password in Firebase Console, then create users. Delete the fallback branch in `signIn`, the `skati_demo_user` restore, and the default-`admin` mapping. On a profile timeout, sign the user out or deny access. | **Yes, critical** |
| 2 | Deployed rules ≠ repo rules; data readable without login | C4 | Every collection can be queried anonymously | Review the repo `firestore.rules` and deploy them (`firebase deploy --only firestore:rules`, with approval). Then re-run `loadtest/07` and `08`, expecting `PERMISSION_DENIED`. | **Yes, critical** |
| 3 | Dev server used as the runtime | §7.2 | 116 requests / 19.7 MB per cold load; 0.94 s vs 0.29 s at 1 user; 3–4× slower under concurrency | Serve `npm run build` output from Firebase Hosting or another static host. Never give users the dev server. | **Yes** |
| 4 | Network round-trip floor of about 0.36–0.42 s per Firestore call | §9 (min 0.36 s for every query type) | Each page needs 1–3 round trips, giving 1–2 s pages | Run independent page queries in parallel (as the dashboard already does). Check the database region in Console; a region closer to users would require a new database. Use offline persistence or caching for lookup lists. | Recommended |
| 5 | Products & BOM (2.25 s) and Finished Products (1.95 s) are about 2× slower than other pages | §8 | +1 s per visit | Profile these pages for sequential (waterfall) queries and per-row lookups, and batch them | Recommended |
| 6 | Search only filters the current 20-row page | [rawMaterials.ts:238](src/services/inventory/rawMaterials.ts:238) | Records on other pages cannot be found | Add a server-side prefix query or normalised search keywords | **Yes (functional)** |
| 7 | Dashboard read cost grows with data | §16 | Up to ≈ 550 reads per dashboard view | Keep summary/aggregate documents or use `count()`/`sum()` aggregation queries; lower the limits | Recommended before 50 users |
| 8 | 1.35 MB single JS bundle | §21 | Slower first load on slow links | Lazy-load routes with `React.lazy` and split vendor code | Recommended |
| 9 | Windows tooling breaks | §2, §21 | `npm install` and `npm run start:live` fail on Windows | Move the Linux binding to `optionalDependencies` or remove it. Use a cross-platform start script. Stop `start.sh` from rewriting `.env` on every run. | Recommended |
| 10 | 24 `set-state-in-effect` warnings | §21 | Extra renders (not measured as significant) | Derive state during render where possible | Optional |

No evidence was found of excessive realtime listeners (the code has **no** `onSnapshot` usage), quota errors, or Firestore slowing down under load.

## 23. Recommended Optimizations (in order)

1. Enable Firebase Auth. Remove the persona fallback and the admin default role (C1–C3).
2. Deploy and verify the repo's Firestore rules (C4).
3. Re-check whether `skati-erp-crm` or `skati-erp-crm-76657` should be the long-term project, and align `.env`, `.env.local` and `.firebaserc` with that decision.
4. Serve the production build. Add route-level code splitting.
5. Fix the search scope, and reduce dashboard read volume.
6. Then repeat this test **with authentication**. Approval is needed for 50 dedicated test accounts and controlled `LOAD TEST 50U -` writes. Use 2–3 load-generating machines for browser-level 25/50-user runs, because one laptop saturates at about 10 Chrome sessions.

## 24. Recommended Safe Concurrent-User Capacity

**Cannot be stated for real users.** No authenticated session has ever succeeded in this project.

The only evidence-based statement is narrow: **Firestore read latency showed no degradation from 1 to 50 concurrent read-only clients** (P95 0.59–0.65 s, 0 % errors). The write path, transactions, rules evaluation with authenticated role look-ups (each rule check performs `get()`/`exists()` on `users/{uid}`), and real browser sessions at 25–50 users are all untested.

## 25. Final Verdict

# `BLOCKED`

- Firebase Authentication is not configured in `skati-erp-crm-76657`, so **no genuinely authenticated sessions** (0 of 50) could be created.
- The write, read-back, transaction and data-integrity tests were not authorised and could not run.
- Measured so far: read-only backend performance up to 50 clients, page load times for 1 user, and document storage sizes.
- Before any pilot: fix critical security findings C2–C4 and enable Auth (C1), then re-run this test with authentication.

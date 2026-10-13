// Concurrent read-only load on live Firestore (unauthenticated path). Each virtual user = its own FirebaseApp +
// Firestore instance (independent connection). Closed-loop: op -> think time -> op. Warm-up excluded from stats.
import fs from 'node:fs';
import { query, collection, orderBy, limit, startAfter, getDocsFromServer, getDocFromServer, doc } from 'firebase/firestore';
import { newClient, runDashboard, PAGE_LISTS, listQuery, runQuery } from './live.mjs';
import { stats } from './lib.mjs';

const STAGES = [1, 5, 10, 25, 50];
const WARMUP_MS = 3000, STEADY_MS = 15000, THINK_MS = 2000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pickOp(db) {
  const x = Math.random();
  if (x < 0.15) return ['dashboard', () => runDashboard(db)];
  if (x < 0.75) { const c = PAGE_LISTS[Math.floor(Math.random() * PAGE_LISTS.length)]; return ['list', () => runQuery(listQuery(db, c))]; }
  if (x < 0.85) return ['getDoc', async () => { await getDocFromServer(doc(db, 'counters', 'orders')); return { reads: 1 }; }];
  return ['pagination', async () => {
    const p = await getDocsFromServer(query(collection(db, 'rawMaterials'), orderBy('materialCode'), startAfter('RM-0002'), limit(3)));
    return { reads: Math.max(1, p.size) };
  }];
}

const out = [];
for (const users of STAGES) {
  const clients = Array.from({ length: users }, newClient);
  const samples = []; // {t, op, ms, ok, err, reads}
  const start = Date.now(), measureFrom = start + WARMUP_MS, end = measureFrom + STEADY_MS;
  const cpu0 = process.cpuUsage();
  await Promise.all(clients.map(async (db, i) => {
    await sleep(Math.random() * THINK_MS); // stagger
    while (Date.now() < end) {
      const [op, fn] = pickOp(db);
      const t0 = performance.now(), tStart = Date.now();
      try { const r = await fn(); samples.push({ tStart, op, ms: performance.now() - t0, ok: true, reads: r.reads }); }
      catch (e) { samples.push({ tStart, op, ms: performance.now() - t0, ok: false, err: String(e?.code || e), reads: 1 }); }
      await sleep(THINK_MS);
    }
  }));
  const cpu = process.cpuUsage(cpu0);
  const wallAll = (Date.now() - start) / 1000;
  const m = samples.filter((s) => s.tStart >= measureFrom && s.tStart < end);
  const ok = m.filter((s) => s.ok);
  const byOp = {};
  for (const op of ['dashboard', 'list', 'getDoc', 'pagination']) byOp[op] = stats(ok.filter((s) => s.op === op).map((s) => s.ms));
  const row = {
    users, warmupSec: WARMUP_MS / 1000, steadySec: STEADY_MS / 1000, thinkMs: THINK_MS, total: m.length, ok: ok.length, failed: m.length - ok.length,
    errorPct: m.length ? (100 * (m.length - ok.length)) / m.length : 0, errors: [...new Set(m.filter((s) => !s.ok).map((s) => s.err))],
    all: stats(ok.map((s) => s.ms)), byOp, throughput: ok.length / (STEADY_MS / 1000),
    readsMeasured: m.reduce((s, x) => s + (x.reads || 0), 0), readsInclWarmup: samples.reduce((s, x) => s + (x.reads || 0), 0),
    generatorCpuPct: (100 * (cpu.user + cpu.system) / 1000) / (wallAll * 1000),
  };
  out.push(row);
  const f = (v) => (v == null ? '  -  ' : (v / 1000).toFixed(3));
  console.log(`users=${users} req=${row.total} ok=${row.ok} err%=${row.errorPct.toFixed(2)} avg=${f(row.all.avg)} p50=${f(row.all.p50)} p95=${f(row.all.p95)} p99=${f(row.all.p99)} max=${f(row.all.max)} tput=${row.throughput.toFixed(2)}/s dash_avg=${f(byOp.dashboard.avg)} dash_p95=${f(byOp.dashboard.p95)} reads=${row.readsInclWarmup} cpu=${row.generatorCpuPct.toFixed(0)}%`);
  fs.writeFileSync('out-11-live-load.json', JSON.stringify(out, null, 2));
  if (row.errorPct > 5) { console.log('Stopping: error rate > 5%'); break; }
}
console.log('total reads (instrumented):', out.reduce((s, r) => s + r.readsInclWarmup, 0));
process.exit(0);

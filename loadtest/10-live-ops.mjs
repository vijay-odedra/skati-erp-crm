// Per-operation Firestore latency, single client, sequential, READ-ONLY, unauthenticated path.
import fs from 'node:fs';
import { query, collection, where, orderBy, limit, startAfter, getDocsFromServer, getDocFromServer, doc } from 'firebase/firestore';
import { newClient, runDashboard, PAGE_LISTS, listQuery, runQuery } from './live.mjs';
import { timed, stats } from './lib.mjs';

const SAMPLES = 15;
const db = newClient();
await runQuery(listQuery(db, 'counters')); // warm-up: open channel
const res = {};
let reads = 0;
async function measure(name, fn) {
  const ms = [], errs = [];
  for (let i = 0; i < SAMPLES; i++) {
    const r = await timed(fn);
    if (r.ok) { ms.push(r.ms); reads += r.value?.reads ?? 1; } else errs.push(r.error);
  }
  res[name] = { ...stats(ms), errors: errs.length, errorSample: errs[0] };
  console.log(name.padEnd(36), res[name].n ? `avg ${(res[name].avg / 1000).toFixed(3)}s p50 ${(res[name].p50 / 1000).toFixed(3)}s p95 ${(res[name].p95 / 1000).toFixed(3)}s max ${(res[name].max / 1000).toFixed(3)}s` : '', errs.length ? `ERR x${errs.length} ${errs[0]}` : '');
}

await measure('Single document get (getDoc)', async () => { await getDocFromServer(doc(db, 'counters', 'rawMaterials')); return { reads: 1 }; });
await measure('Dashboard backend (10 parallel queries)', () => runDashboard(db));
for (const c of PAGE_LISTS) await measure(`List page: ${c} (limit 21)`, () => runQuery(listQuery(db, c)));
await measure('Raw materials page query (isActive, orderBy code)', () => runQuery(query(collection(db, 'rawMaterials'), where('isActive', '==', true), orderBy('materialCode', 'asc'), limit(21))));
await measure('Pagination: page 1 + page 2 via startAfter', async () => {
  const p1 = await getDocsFromServer(query(collection(db, 'rawMaterials'), orderBy('materialCode', 'asc'), limit(3)));
  const p2 = await getDocsFromServer(query(collection(db, 'rawMaterials'), orderBy('materialCode', 'asc'), startAfter(p1.docs.at(-1)), limit(3)));
  return { reads: Math.max(1, p1.size) + Math.max(1, p2.size) };
});
await measure('Pagination: page 2 only (startAfter)', async () => {
  const p2 = await getDocsFromServer(query(collection(db, 'rawMaterials'), orderBy('materialCode', 'asc'), startAfter('RM-0003'), limit(3)));
  return { reads: Math.max(1, p2.size) };
});
await measure('Reports-style range (orders, 30 days)', () => runQuery(query(collection(db, 'orders'), orderBy('orderDate', 'desc'), limit(100))));
await measure('Client re-init + first query (refresh)', async () => { const d2 = newClient(); return runQuery(listQuery(d2, 'rawMaterials')); });

res._reads = reads;
fs.writeFileSync('out-10-live-ops.json', JSON.stringify(res, null, 2));
console.log('instrumented reads', reads);
process.exit(0);

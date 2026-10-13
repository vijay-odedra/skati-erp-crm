// Live storage audit (READ-ONLY, unauthenticated path). Reads every document (capped at 500/collection),
// sizes it; never prints or stores field values.
import fs from 'node:fs';
import { getCountFromServer, collection, query, limit, getDocsFromServer } from 'firebase/firestore';
import { newClient, firestoreDocSize, indexEstimate, jsonSize } from './live.mjs';
import { COLLECTIONS } from './collections.mjs';
import { timed } from './lib.mjs';

const db = newClient();
const out = {};
let reads = 0;
for (const c of COLLECTIONS) {
  const cnt = await timed(() => getCountFromServer(collection(db, c)));
  reads += 1;
  const count = cnt.ok ? cnt.value.data().count : null;
  const snapR = await timed(() => getDocsFromServer(query(collection(db, c), limit(500))));
  if (!snapR.ok) { out[c] = { count, countError: cnt.error, error: snapR.error }; console.log(c, 'ERR', snapR.error); continue; }
  reads += Math.max(1, snapR.value.size);
  const rows = snapR.value.docs.map((d) => {
    const data = d.data();
    return { json: jsonSize(data), fs: firestoreDocSize(d.ref.path, data), idx: indexEstimate(d.ref.path, c, data), fields: Object.keys(data).length, idLen: d.id.length,
      loadTest: Object.values(data).some((v) => typeof v === 'string' && v.startsWith('LOAD TEST')) };
  });
  const agg = (k) => rows.length ? { avg: rows.reduce((s, r) => s + r[k], 0) / rows.length, min: Math.min(...rows.map((r) => r[k])), max: Math.max(...rows.map((r) => r[k])), sum: rows.reduce((s, r) => s + r[k], 0) } : null;
  out[c] = { count, sampled: rows.length, fetchMs: snapR.ms, json: agg('json'), firestore: agg('fs'), index: agg('idx'), fields: agg('fields'), idLen: agg('idLen'), loadTestDocs: rows.filter((r) => r.loadTest).length };
  console.log(c.padEnd(28), 'count', String(count).padStart(4), 'json avg', (out[c].json?.avg ?? 0).toFixed(0).padStart(5), 'fs avg', (out[c].firestore?.avg ?? 0).toFixed(0).padStart(5), 'idx', (out[c].index?.avg ?? 0).toFixed(0).padStart(6), `${snapR.ms.toFixed(0)}ms`);
}
out._readsUsed = reads;
fs.writeFileSync('out-09-live-storage.json', JSON.stringify(out, null, 2));
console.log('reads used (instrumented):', reads);
process.exit(0);

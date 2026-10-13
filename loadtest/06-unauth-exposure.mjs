// Read-only: which collections can be read with NO authentication? (pageSize=1, prints status + doc presence only)
import fs from 'node:fs';
import { firebaseConfig, timed, stats } from './lib.mjs';
import { COLLECTIONS } from './collections.mjs';
const { config, databaseId } = firebaseConfig();
const base = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${databaseId}/documents`;
const out = {};
for (const c of COLLECTIONS) {
  const r = await timed(async () => { const res = await fetch(`${base}/${c}?pageSize=1&key=${config.apiKey}`); const j = await res.json(); return { status: res.status, docs: (j.documents || []).length }; });
  out[c] = r.ok ? { ...r.value, ms: Math.round(r.ms) } : { error: r.error };
  console.log(c.padEnd(28), JSON.stringify(out[c]));
}
fs.writeFileSync('out-06-unauth.json', JSON.stringify(out, null, 2));

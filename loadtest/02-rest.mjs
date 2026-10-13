// Read-only REST probes: Identity Toolkit config + unauthenticated Firestore reads (named DB vs (default)).
import { firebaseConfig, timed } from './lib.mjs';
const { config, databaseId } = firebaseConfig();
const k = config.apiKey, p = config.projectId;
async function hit(label, url, opts) {
  const r = await timed(async () => { const res = await fetch(url, opts); return { status: res.status, body: (await res.text()).slice(0, 400) }; });
  console.log(`\n## ${label}  (${r.ms.toFixed(0)} ms)\n`, r.ok ? `${r.value.status} ${r.value.body.replace(k, '<key>')}` : r.error);
}
await hit('Auth: signInWithPassword (dummy creds, no real account)', `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${k}`,
  { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nobody@example.invalid', password: 'x', returnSecureToken: true }) });
await hit('Auth: getProjectConfig', `https://identitytoolkit.googleapis.com/v1/projects?key=${k}`);
for (const d of [databaseId, '(default)']) {
  await hit(`Firestore unauthenticated GET users (db=${d})`, `https://firestore.googleapis.com/v1/projects/${p}/databases/${encodeURIComponent(d)}/documents/users?pageSize=1&key=${k}`);
}

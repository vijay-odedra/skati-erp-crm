import { firebaseConfig } from './lib.mjs';
const { config, databaseId } = firebaseConfig();
const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${databaseId}/documents:runQuery?key=${config.apiKey}`;
for (const c of ['orders', 'users']) {
  for (const lim of [1, 1000]) {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: c }], limit: lim } }) });
    const j = await res.json();
    const docs = Array.isArray(j) ? j.filter((x) => x.document).length : 0;
    console.log(c, 'limit', lim, res.status, 'docs', docs, Array.isArray(j) ? '' : JSON.stringify(j).slice(0, 120));
  }
}

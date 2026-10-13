// Read-only: unauthenticated Firestore Web SDK queries, same settings as src/services/firebase/firestore.ts.
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, query, limit, getDocsFromServer } from 'firebase/firestore';
import { firebaseConfig, timed } from './lib.mjs';
import { COLLECTIONS } from './collections.mjs';
const { config, databaseId } = firebaseConfig();
const db = initializeFirestore(initializeApp(config), { experimentalAutoDetectLongPolling: true }, databaseId);
for (const c of ['orders', 'payments', 'users', 'rawMaterials']) {
  const r = await timed(() => getDocsFromServer(query(collection(db, c), limit(1))));
  console.log(c.padEnd(14), r.ok ? `OK docs=${r.value.size}` : `DENIED ${r.error}`, `${r.ms.toFixed(0)}ms`);
}
process.exit(0);

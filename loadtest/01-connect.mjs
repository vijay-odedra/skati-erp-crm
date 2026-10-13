// Step 1 (read-only): verify Auth + Firestore connectivity and count documents per collection.
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, collection, getCountFromServer } from 'firebase/firestore';
import fs from 'node:fs';
import { firebaseConfig, testAccounts, timed } from './lib.mjs';

export const COLLECTIONS = [
  'users', 'counters', 'rawMaterials', 'stockTransactions', 'products', 'bomItems', 'productions',
  'productionItems', 'finishedProductStock', 'finishedProductTransactions', 'suppliers', 'purchases',
  'purchaseItems', 'leads', 'followUps', 'customers', 'customerRequirements', 'quotations',
  'quotationItems', 'orders', 'orderItems', 'productionOrderLinks', 'dispatches', 'dispatchItems', 'payments',
];

const { config, databaseId, useEmulators } = firebaseConfig();
const accounts = testAccounts();
const result = { projectId: config.projectId, authDomain: config.authDomain, databaseId, useEmulators, accounts: [], counts: {} };

for (const acc of accounts) {
  const app = initializeApp(config, `probe-${acc.role}`);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {}, databaseId);
  const signin = await timed(() => signInWithEmailAndPassword(auth, acc.email, acc.password));
  const row = { role: acc.role, signInOk: signin.ok, signInMs: signin.ms, error: signin.error };
  if (signin.ok) {
    const uid = signin.value.user.uid;
    const prof = await timed(() => getDocFromServer(doc(db, 'users', uid)));
    row.profileReadOk = prof.ok;
    row.profileReadMs = prof.ms;
    row.profileExists = prof.ok ? prof.value.exists() : null;
    row.profileRole = prof.ok && prof.value.exists() ? prof.value.data().role : null;
    row.profileError = prof.error;
    if (acc.role === 'admin') {
      for (const c of COLLECTIONS) {
        const r = await timed(() => getCountFromServer(collection(db, c)));
        result.counts[c] = r.ok ? { count: r.value.data().count, ms: r.ms } : { error: r.error, ms: r.ms };
      }
    }
    await signOut(auth);
  }
  result.accounts.push(row);
}
fs.writeFileSync('out-01-connect.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
process.exit(0);

// Shared live (read-only, UNAUTHENTICATED) helpers. No writes are issued anywhere in this module.
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, collection, query, where, orderBy, limit, getDocsFromServer, getDocFromServer, doc,
  Timestamp, DocumentReference, GeoPoint, Bytes,
} from 'firebase/firestore';
import { firebaseConfig } from './lib.mjs';

const { config, databaseId } = firebaseConfig();
let n = 0;
// Each client gets its own FirebaseApp + Firestore instance => its own connection/session.
export function newClient() {
  const app = initializeApp(config, `client-${++n}`);
  return initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, databaseId);
}

// ---- Firestore storage-size accounting (https://firebase.google.com/docs/firestore/storage-size)
const u8 = (s) => Buffer.byteLength(String(s), 'utf8');
export const strSize = (s) => u8(s) + 1;
export const docNameSize = (path) => path.split('/').reduce((s, seg) => s + strSize(seg), 0) + 16;
export function valueSize(v) {
  if (v === null || v === undefined) return 1;
  if (v instanceof Timestamp) return 8;
  if (v instanceof GeoPoint) return 16;
  if (v instanceof Bytes) return v.toUint8Array().length;
  if (v instanceof DocumentReference) return docNameSize(v.path);
  if (typeof v === 'string') return strSize(v);
  if (typeof v === 'number') return 8;
  if (typeof v === 'boolean') return 1;
  if (Array.isArray(v)) return v.reduce((s, x) => s + valueSize(x), 0);
  if (typeof v === 'object') return Object.entries(v).reduce((s, [k, x]) => s + strSize(k) + valueSize(x), 0);
  return 8;
}
export function firestoreDocSize(path, data) {
  return docNameSize(path) + Object.entries(data).reduce((s, [k, v]) => s + strSize(k) + valueSize(v), 0) + 32;
}
// Estimate of automatic single-field index entries (asc+desc per scalar, array-contains per element).
export function indexEstimate(path, coll, data) {
  const base = docNameSize(path) + strSize(coll) + 32;
  let total = 0;
  const walk = (p, v) => {
    if (Array.isArray(v)) { for (const x of v) total += base + strSize(p) + valueSize(x); return; }
    if (v && typeof v === 'object' && !(v instanceof Timestamp) && !(v instanceof GeoPoint) && !(v instanceof DocumentReference) && !(v instanceof Bytes)) {
      for (const [k, x] of Object.entries(v)) walk(`${p}.${k}`, x);
      return;
    }
    total += 2 * (base + strSize(p) + valueSize(v));
  };
  for (const [k, v] of Object.entries(data)) walk(k, v);
  return total;
}
export function jsonSize(data) {
  // Use the holder's original value: Timestamp.toJSON() runs before a replacer sees the value.
  return u8(JSON.stringify(data, function (k, v) { const o = this[k]; return o instanceof Timestamp ? o.toDate().toISOString() : v; }));
}

// ---- Workload: the exact admin dashboard query set (src/services/dashboard/dashboardQueries.ts) + page lists.
const thirtyDaysAgo = () => Timestamp.fromMillis(Date.now() - 30 * 864e5);
export const DASHBOARD_QUERIES = (db) => [
  query(collection(db, 'rawMaterials'), where('isActive', '==', true), limit(100)),
  query(collection(db, 'finishedProductStock'), limit(100)),
  query(collection(db, 'productions'), where('createdAt', '>=', thirtyDaysAgo()), orderBy('createdAt', 'desc'), limit(100)),
  query(collection(db, 'orders'), orderBy('orderDate', 'desc'), limit(50)),
  query(collection(db, 'dispatches'), orderBy('dispatchDate', 'desc'), limit(30)),
  query(collection(db, 'payments'), orderBy('paymentDate', 'desc'), limit(30)),
  query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(30)),
  query(collection(db, 'followUps'), where('status', '==', 'PENDING'), limit(50)),
  query(collection(db, 'quotations'), orderBy('createdAt', 'desc'), limit(30)),
  query(collection(db, 'customers'), where('isActive', '==', true), limit(30)),
];
// Representative page list queries (page size 20 + 1 look-ahead, as in rawMaterials.ts / orders.ts).
export const PAGE_LISTS = ['rawMaterials', 'products', 'productions', 'purchases', 'suppliers', 'leads', 'orders', 'bomItems', 'stockTransactions', 'customers'];
export const listQuery = (db, c) => query(collection(db, c), limit(21));

// Reads billed for a query = max(1, docs returned) (Firestore bills a minimum of one read per query).
export async function runQuery(q) {
  const snap = await getDocsFromServer(q);
  return { docs: snap.size, reads: Math.max(1, snap.size) };
}
export async function runDashboard(db) {
  const r = await Promise.all(DASHBOARD_QUERIES(db).map(runQuery));
  return { docs: r.reduce((s, x) => s + x.docs, 0), reads: r.reduce((s, x) => s + x.reads, 0), queries: r.length };
}
export { getDocsFromServer, getDocFromServer, doc, collection, query, limit };

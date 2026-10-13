// Storage audit (offline): executes the project's live provisioning fixture against a STUB Firestore
// (no network, no credentials) to capture every document exactly as it would be written, then sizes it.
//
// Firestore storage formula (https://firebase.google.com/docs/firestore/storage-size):
//   doc name   = sum(UTF8(collectionId)+1, UTF8(docId)+1 for each path segment) + 16
//   field name = UTF8 + 1
//   values     = string UTF8+1 | int/double 8 | bool 1 | null 1 | timestamp 8 | geopoint 16 | ref = docname
//                array = sum(values) | map = sum(keyName + value)
//   document   = doc name + sum(field name + value) + 32
// Automatic single-field index entry (estimate) = doc name + (collectionId+1) + fieldName + value + 32,
//   two entries (asc + desc) per scalar field, one array-contains entry per array element, maps recursed.
import fs from 'node:fs';
import { PROJECT_DIR } from './lib.mjs';

class Timestamp {
  constructor(ms) { this.ms = ms; }
  static now() { return new Timestamp(Date.now()); }
  static fromMillis(ms) { return new Timestamp(ms); }
  static fromDate(d) { return new Timestamp(d.getTime()); }
  toDate() { return new Date(this.ms); }
  toMillis() { return this.ms; }
  toJSON() { return new Date(this.ms).toISOString(); }
}
const FieldValue = { serverTimestamp: () => Timestamp.now(), increment: (n) => n };

const captured = new Map(); // "coll/id" -> { coll, id, data }
const db = {
  collection: (coll) => ({
    doc: (id) => ({
      set: async (data, opts) => {
        const key = `${coll}/${id}`;
        const prev = opts?.merge && captured.get(key) ? captured.get(key).data : {};
        captured.set(key, { coll, id, data: { ...prev, ...data } });
      },
    }),
  }),
};

// Load fixture source, strip its real imports/initialisation, inject stubs.
let src = fs.readFileSync(`${PROJECT_DIR}/scratch/provision-live-database.mjs`, 'utf8');
src = src
  .replace(/^import .*$/gm, '')
  .replace(/const serviceAccount[\s\S]*?const db = getFirestore\(app, 'default'\);/, '')
  .replace(/provisionAllTables\(\)\.catch\(console\.error\);\s*$/, 'export const run = provisionAllTables;');
fs.writeFileSync('fixture-stubbed.mjs', 'const { db, FieldValue, Timestamp } = globalThis.__stub; const serviceAccount = { project_id: "stub" };\n' + src);
globalThis.__stub = { db, FieldValue, Timestamp };
const origLog = console.log; console.log = () => {};
await (await import('./fixture-stubbed.mjs')).run();
console.log = origLog;

const u8 = (s) => Buffer.byteLength(String(s), 'utf8');
const strSize = (s) => u8(s) + 1;
const docNameSize = (coll, id) => strSize(coll) + strSize(id) + 16;
function valueSize(v) {
  if (v === null || v === undefined) return 1;
  if (v instanceof Timestamp || v instanceof Date) return 8;
  if (typeof v === 'string') return strSize(v);
  if (typeof v === 'number') return 8;
  if (typeof v === 'boolean') return 1;
  if (Array.isArray(v)) return v.reduce((s, x) => s + valueSize(x), 0);
  if (typeof v === 'object') return Object.entries(v).reduce((s, [k, x]) => s + strSize(k) + valueSize(x), 0);
  return 8;
}
function indexBytes(coll, id, data) {
  const base = docNameSize(coll, id) + strSize(coll) + 32;
  let total = 0;
  const walk = (path, v) => {
    if (Array.isArray(v)) { for (const x of v) total += base + strSize(path) + valueSize(x); return; }
    if (v && typeof v === 'object' && !(v instanceof Timestamp)) {
      for (const [k, x] of Object.entries(v)) walk(`${path}.${k}`, x);
      return;
    }
    total += 2 * (base + strSize(path) + valueSize(v));
  };
  for (const [k, v] of Object.entries(data)) walk(k, v);
  return total;
}

const per = {};
for (const { coll, id, data } of captured.values()) {
  const json = u8(JSON.stringify(data));
  const fsSize = docNameSize(coll, id) + Object.entries(data).reduce((s, [k, v]) => s + strSize(k) + valueSize(v), 0) + 32;
  const idx = indexBytes(coll, id, data);
  (per[coll] ||= []).push({ id, json, fsSize, idx, fields: Object.keys(data).length });
}
const out = {};
for (const [coll, rows] of Object.entries(per)) {
  const agg = (k) => ({ avg: rows.reduce((s, r) => s + r[k], 0) / rows.length, min: Math.min(...rows.map((r) => r[k])), max: Math.max(...rows.map((r) => r[k])) });
  out[coll] = { samples: rows.length, fieldsAvg: rows.reduce((s, r) => s + r.fields, 0) / rows.length, json: agg('json'), firestore: agg('fsSize'), index: agg('idx') };
}
fs.writeFileSync('out-03-storage.json', JSON.stringify(out, null, 2));
const pad = (s, n) => String(s).padStart(n);
console.log('collection                  n  fields  json_avg  json_min  json_max  fs_avg  fs_min  fs_max  idx_avg');
for (const [c, o] of Object.entries(out)) {
  console.log(c.padEnd(26), pad(o.samples, 2), pad(o.fieldsAvg.toFixed(1), 6), pad(o.json.avg.toFixed(0), 9), pad(o.json.min, 9), pad(o.json.max, 9),
    pad(o.firestore.avg.toFixed(0), 7), pad(o.firestore.min, 7), pad(o.firestore.max, 7), pad(o.index.avg.toFixed(0), 8));
}
const all = [...captured.values()];
console.log('\nTOTAL docs', all.length);

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = getFirestore(app);
const auth = getAuth(app);

async function testConnection() {
  console.log('Testing connection to Firebase project:', serviceAccount.project_id);

  const testRef = db.collection('_probe').doc('connectivity');
  await testRef.set({ test: true, timestamp: new Date().toISOString() });
  const snap = await testRef.get();
  console.log('✓ Firestore read/write SUCCESS! Doc data:', snap.data());
  await testRef.delete();
  console.log('✓ Firestore cleanup SUCCESS!');

  const users = await auth.listUsers(10);
  console.log('✓ Firebase Auth SUCCESS! Existing users found:', users.users.length);
  for (const u of users.users) {
    console.log(`  - ${u.email} (${u.uid})`);
  }
}

testConnection().catch(console.error);

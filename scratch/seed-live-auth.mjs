import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const auth = getAuth(app);
const db = getFirestore(app, 'default');

const standardUsers = [
  { email: 'admin@skati.com', password: 'Password123!', role: 'admin', displayName: 'System Admin' },
  { email: 'manager@skati.com', password: 'Password123!', role: 'manager', displayName: 'Plant Manager' },
  { email: 'production@skati.com', password: 'Password123!', role: 'production_employee', displayName: 'Production Operator' },
  { email: 'purchase@skati.com', password: 'Password123!', role: 'purchase_employee', displayName: 'Purchase Officer' },
  { email: 'sales@skati.com', password: 'Password123!', role: 'sales_employee', displayName: 'Sales Representative' },
];

async function seedLiveAuth() {
  console.log(`Seeding live Auth users for project: ${serviceAccount.project_id}...\n`);

  for (const user of standardUsers) {
    let uid;
    try {
      const userRecord = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
      });
      uid = userRecord.uid;
      console.log(`✓ Created Firebase Auth user: ${user.email} (UID: ${uid})`);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        const existing = await auth.getUserByEmail(user.email);
        uid = existing.uid;
        console.log(`• Firebase Auth user already exists: ${user.email} (UID: ${uid})`);
      } else {
        console.error(`✗ Error creating ${user.email}:`, err.message);
        continue;
      }
    }

    // Link or create corresponding profile in Firestore
    try {
      const now = Timestamp.now();
      await db.collection('users').doc(uid).set({
        uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      }, { merge: true });
      console.log(`  ✓ Synced Firestore user document for: ${user.email}`);
    } catch (err) {
      console.error(`  ✗ Error setting profile for ${user.email}:`, err.message);
    }
  }

  console.log('\nAuth seeding process completed!');
}

seedLiveAuth().catch(console.error);

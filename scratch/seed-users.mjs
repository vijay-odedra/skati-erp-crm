import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'skati-erp-crm.firebaseapp.com',
  projectId: 'skati-erp-crm',
  storageBucket: 'skati-erp-crm.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const standardUsers = [
  { email: 'admin@skati.com', password: 'Password123!', role: 'admin', displayName: 'System Admin' },
  { email: 'manager@skati.com', password: 'Password123!', role: 'manager', displayName: 'Plant Manager' },
  { email: 'production@skati.com', password: 'Password123!', role: 'production_employee', displayName: 'Production Operator' },
  { email: 'purchase@skati.com', password: 'Password123!', role: 'purchase_employee', displayName: 'Purchase Officer' },
  { email: 'sales@skati.com', password: 'Password123!', role: 'sales_employee', displayName: 'Sales Representative' },
];

async function seed() {
  console.log('Seeding standard user personas to Firebase Emulator...\n');

  for (const user of standardUsers) {
    let uid;
    try {
      const cred = await createUserWithEmailAndPassword(auth, user.email, user.password);
      uid = cred.user.uid;
      console.log(`✓ Created user: ${user.email} (${user.role})`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        const cred = await signInWithEmailAndPassword(auth, user.email, user.password);
        uid = cred.user.uid;
        console.log(`• User already exists: ${user.email}`);
      } else {
        console.error(`✗ Error creating ${user.email}:`, err);
        continue;
      }
    }

    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
      console.log(`  ✓ Profile set for: ${user.email}`);
    } catch (err) {
      console.error(`  ✗ Error setting profile for ${user.email}:`, err);
    }
  }

  console.log('\nSeeding completed successfully!');
}

seed().catch(console.error);

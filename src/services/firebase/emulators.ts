import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { auth } from './auth.ts';
import { db } from './firestore.ts';

let emulatorsConnected = false;

export function setupFirebaseEmulators(): void {
  if (emulatorsConnected) return;
  if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'false') {
    try {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    } catch {}
    try {
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
    } catch {}
    emulatorsConnected = true;
    console.log('[Firebase Emulators] Connected to Auth (9099) and Firestore (8080)');
  }
}

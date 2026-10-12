import {
  initializeFirestore,
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import { app } from './config.ts';

const useEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'false';

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    useEmulator
      ? { host: '127.0.0.1:8080', ssl: false }
      : { experimentalAutoDetectLongPolling: true }
  );
} catch {
  firestoreInstance = getFirestore(app);
}

export const db: Firestore = firestoreInstance;

if (useEmulator) {
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  } catch {
    // Ignore if already connected or established via initializeFirestore
  }
}

import {
  initializeFirestore,
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import { app } from './config.ts';

const useEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
const databaseId = (import.meta.env.VITE_FIREBASE_DATABASE_ID as string) || (useEmulator ? '(default)' : 'default');

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    useEmulator
      ? { host: '127.0.0.1:8080', ssl: false }
      : { experimentalAutoDetectLongPolling: true },
    databaseId
  );
} catch {
  firestoreInstance = getFirestore(app, databaseId);
}

export const db: Firestore = firestoreInstance;

if (useEmulator) {
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  } catch {
    // Ignore if already connected or established via initializeFirestore
  }
}

import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
  type UserCredential,
  type Unsubscribe,
} from 'firebase/auth';
import { app } from './config.ts';

export const auth: Auth = getAuth(app);

// Connect emulator immediately in DEV mode before any asynchronous listeners or queries begin
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'false') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  } catch {
    // Ignore if already connected (e.g. during HMR)
  }
}

/**
 * Sign in using email and password.
 */
export async function signIn(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

/**
 * Sign out the currently authenticated user.
 */
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

/**
 * Observe Firebase Authentication state changes.
 */
export function observeAuthState(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current Firebase Auth user instance synchronously.
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// Aliases for compatibility
export const loginWithEmail = signIn;
export const logoutUser = signOut;
export const subscribeToAuthState = observeAuthState;

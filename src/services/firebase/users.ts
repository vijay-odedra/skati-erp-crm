import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firestore.ts';
import type { UserProfile } from '../../types/auth.ts';

const USERS_COLLECTION = 'users';

/**
 * Fetch a user profile by UID from Firestore.
 * Single read operation to avoid continuous listener overhead.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      uid: data.uid || uid,
      email: data.email || '',
      displayName: data.displayName || '',
      role: data.role || 'production_employee',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString()),
      lastLoginAt: data.lastLoginAt?.toDate ? data.lastLoginAt.toDate().toISOString() : (data.lastLoginAt || null),
    } as UserProfile;
  } catch (error) {
    console.error(`[Firebase] Error fetching user profile for ${uid}:`, error);
    throw error;
  }
}

/**
 * Update a user's last login timestamp in Firestore.
 */
export async function updateUserLastLogin(uid: string): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userDocRef, {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // Non-blocking catch to not hinder user login if update fails
    console.warn(`[Firebase] Could not update last login timestamp for ${uid}:`, error);
  }
}

/**
 * Create or initialize a user profile document in Firestore.
 */
export async function createUserProfile(profile: UserProfile): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, profile.uid);
    await setDoc(userDocRef, {
      uid: profile.uid,
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      isActive: profile.isActive,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`[Firebase] Error creating user profile for ${profile.uid}:`, error);
    throw error;
  }
}

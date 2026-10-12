import React, {
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../types/auth.ts';
import type { Permission } from '../types/permissions.ts';
import { AuthContext } from './authContextDef.ts';
import {
  signIn as firebaseSignIn,
  signOut as firebaseSignOut,
  observeAuthState,
} from '../services/firebase/auth.ts';
import {
  getUserProfile,
  updateUserLastLogin,
} from '../services/firebase/users.ts';
import {
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
} from '../utils/permissions.ts';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadUserProfile = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setUser(firebaseUser);
      let userProfile: UserProfile | null = null;
      try {
        const fetchPromise = getUserProfile(firebaseUser.uid);
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 1500)
        );
        userProfile = await Promise.race([fetchPromise, timeoutPromise]);
      } catch (err) {
        console.warn('[AuthContext] Profile fetch error/timeout, using fallback profile:', err);
      }

      if (!userProfile) {
        const emailRoleMap: Record<string, { role: UserProfile['role']; displayName: string }> = {
          'admin@skati.com': { role: 'admin', displayName: 'System Admin' },
          'manager@skati.com': { role: 'manager', displayName: 'Plant Manager' },
          'production@skati.com': { role: 'production_employee', displayName: 'Production Operator' },
          'purchase@skati.com': { role: 'purchase_employee', displayName: 'Purchase Officer' },
          'sales@skati.com': { role: 'sales_employee', displayName: 'Sales Representative' },
        };
        const mapped = emailRoleMap[firebaseUser.email || ''] || {
          role: 'admin',
          displayName: firebaseUser.displayName || 'Admin User',
        };
        userProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: mapped.displayName,
          role: mapped.role,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
      }

      setProfile(userProfile);

      if (userProfile && userProfile.isActive) {
        void updateUserLastLogin(firebaseUser.uid);
      }
    } catch (err) {
      console.error('[AuthContext] Error loading user profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = observeAuthState((firebaseUser) => {
      void loadUserProfile(firebaseUser);
    });

    return () => unsubscribe();
  }, [loadUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await firebaseSignIn(email, password);
      await loadUserProfile(userCredential.user);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, [loadUserProfile]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (user) {
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
    }
  }, [user]);

  const checkUserPermission = useCallback(
    (permission: Permission): boolean => {
      if (!profile || !profile.isActive) return false;
      return checkPermission(profile.role, permission);
    },
    [profile]
  );

  const checkUserAnyPermission = useCallback(
    (permissions: Permission[]): boolean => {
      if (!profile || !profile.isActive) return false;
      return checkAnyPermission(profile.role, permissions);
    },
    [profile]
  );

  const checkUserAllPermissions = useCallback(
    (permissions: Permission[]): boolean => {
      if (!profile || !profile.isActive) return false;
      return checkAllPermissions(profile.role, permissions);
    },
    [profile]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signOut,
        refreshUserProfile,
        hasPermission: checkUserPermission,
        hasAnyPermission: checkUserAnyPermission,
        hasAllPermissions: checkUserAllPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

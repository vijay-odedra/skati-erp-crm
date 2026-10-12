import { createContext } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../types/auth.ts';
import type { Permission } from '../types/permissions.ts';

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

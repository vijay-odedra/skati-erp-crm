import type { UserRole } from '../types/auth.ts';
import type { Permission } from '../types/permissions.ts';
import { ROLE_PERMISSIONS } from '../constants/permissions.ts';

/**
 * Returns all permissions associated with a given role.
 */
export function getRolePermissions(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Checks if a given role has a specific permission.
 */
export function hasPermission(
  role: UserRole | undefined | null,
  permission: Permission
): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Checks if a given role has ANY of the specified permissions.
 */
export function hasAnyPermission(
  role: UserRole | undefined | null,
  permissions: Permission[]
): boolean {
  if (!role || permissions.length === 0) return false;
  const userPermissions = ROLE_PERMISSIONS[role];
  if (!userPermissions) return false;
  return permissions.some((permission) => userPermissions.includes(permission));
}

/**
 * Checks if a given role has ALL of the specified permissions.
 */
export function hasAllPermissions(
  role: UserRole | undefined | null,
  permissions: Permission[]
): boolean {
  if (!role || permissions.length === 0) return false;
  const userPermissions = ROLE_PERMISSIONS[role];
  if (!userPermissions) return false;
  return permissions.every((permission) => userPermissions.includes(permission));
}

/**
 * Helper to check module access by permission or module key.
 */
export function canAccessModule(
  role: UserRole | undefined | null,
  requiredPermission: Permission
): boolean {
  return hasPermission(role, requiredPermission);
}

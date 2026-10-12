import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.ts';
import { LoadingSpinner } from '../components/common/LoadingSpinner.tsx';
import type { Permission } from '../types/permissions.ts';

interface PermissionRouteProps {
  permission?: Permission;
  permissions?: Permission[];
  matchAll?: boolean;
  children?: React.ReactNode;
}

export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  permission,
  permissions,
  matchAll = false,
  children,
}) => {
  const { user, profile, loading, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen message="Checking permissions..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user profile is not found or user is inactive
  if (!profile || !profile.isActive) {
    return (
      <Navigate
        to="/access-denied"
        state={{
          reason: !profile ? 'Profile not initialized in database' : 'Account is deactivated',
          from: location,
        }}
        replace
      />
    );
  }

  let isAuthorized = true;

  if (permission) {
    isAuthorized = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    isAuthorized = matchAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (!isAuthorized) {
    return (
      <Navigate
        to="/access-denied"
        state={{
          requiredPermission: permission || permissions?.join(', '),
          userRole: profile.role,
          from: location,
        }}
        replace
      />
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

import React from 'react';
import { getUserClaims } from '../lib/auth';

interface RequireRoleProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
  * RequireRole Component
  * Conditionally renders child components only if the current user
  * possesses one of the allowedRoles.
  */
export const RequireRole: React.FC<RequireRoleProps> = ({
  allowedRoles,
  children,
  fallback = null,
}) => {
  const claims = getUserClaims();
  const userRole = claims?.role?.toUpperCase();

  const isAllowed = userRole && allowedRoles.map(r => r.toUpperCase()).includes(userRole);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
  * useHasRole Hook
  * Returns a boolean indicating whether the current logged-in user has
  * permission matching any of the specified roles.
  */
export function useHasRole(allowedRoles: string[]): boolean {
  const claims = getUserClaims();
  const userRole = claims?.role?.toUpperCase();

  if (!userRole) return false;
  return allowedRoles.map(r => r.toUpperCase()).includes(userRole);
}

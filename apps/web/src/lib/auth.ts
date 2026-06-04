import type { UserClaims } from '@pulse/shared-types';

/** Safe client-side JWT payload decode (matches ProtectedRoute). */
export function getUserClaims(): UserClaims | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as UserClaims;
  } catch {
    return null;
  }
}

export function getCurrentUserId(): string | null {
  return getUserClaims()?.sub ?? null;
}

export function canEditImpactMetrics(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'PM' || role === 'PROJECT_MANAGER';
}

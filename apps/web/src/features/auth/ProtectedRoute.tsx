// apps/web/src/features/auth/ProtectedRoute.tsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { UserClaims } from "@pulse/shared-types"; // CRITICAL RULE: Type isolation

export const ProtectedRoute: React.FC = () => {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Safe Client-Side Base64 Decoded JWT Evaluation
  let claims: UserClaims | null = null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    claims = JSON.parse(jsonPayload);
  } catch (e) {
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }

  // Rule 6: Limited Access Donor View Navigation Guard
  if (claims?.role === "DONOR") {
    const forbiddenKeywords = ["messages", "notes", "calendar"];
    const pathLower = location.pathname.toLowerCase();
    const isForbidden = forbiddenKeywords.some(keyword => pathLower.includes(keyword));
    
    if (isForbidden) {
      return <Navigate to="/projects" replace />;
    }
  }

  // Field Officer RBAC Protection
  if (claims?.role?.toUpperCase() === "FIELD_OFFICER") {
    const pathLower = location.pathname.toLowerCase();
    const searchParams = new URLSearchParams(location.search);
    const isReports = pathLower === "/reports";
    const isSettingsWorkspace = pathLower.startsWith("/settings/workspace") || 
      (pathLower === "/settings" && searchParams.get("tab")?.toLowerCase() === "workspace");
      
    if (isReports || isSettingsWorkspace) {
      alert("Access Denied: Field Officers are not authorized to view Reports or Workspace Settings.");
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};
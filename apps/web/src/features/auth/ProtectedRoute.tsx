import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute: React.FC = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    // Redirect to login if there is no token present
    return <Navigate to="/login" replace />;
  }

  // If authorized, render the child routes (e.g., MainLayout and pages)
  return <Outlet />;
};
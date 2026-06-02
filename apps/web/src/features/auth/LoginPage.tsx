import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Briefcase, Shield, Eye } from "lucide-react";
import { api } from "../../lib/api";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = [
    { id: "ADMIN", label: "System Admin (HQ)", icon: Shield, color: "text-purple-600 dark:text-purple-400" },
    { id: "PROJECT_MANAGER", label: "Project Manager", icon: Briefcase, color: "text-blue-600 dark:text-blue-400" },
    { id: "FIELD_OFFICER", label: "Field Officer", icon: User, color: "text-emerald-600 dark:text-emerald-400" },
    { id: "DONOR", label: "External Donor", icon: Eye, color: "text-slate-600 dark:text-slate-400" },
  ];

  const handleLogin = async (roleId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch token from proxy. We append the role to simulate backend RBAC generation.
      const response = await api.get(`/auth/mock-login?role=${roleId}`);
      
      // Handle the raw string payload your Axum backend currently returns
      const token = typeof response.data === "string" ? response.data : response.data.token;
      
      localStorage.setItem("token", token);
      navigate("/projects"); // Send directly to projects after login
    } catch (err) {
      setError("Failed to connect to the backend server. Is Axum running on port 8080?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 border border-slate-200 dark:border-slate-800">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pulse-Field Suite</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Select a role to enter the ENA workspace</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-md border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {roles.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => handleLogin(id)}
              disabled={loading}
              className="w-full flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${color}`} />
                <span className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                  {label}
                </span>
              </div>
              <span className="text-xs text-slate-400">Login &rarr;</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
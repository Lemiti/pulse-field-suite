import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Briefcase, Shield, Eye, Globe } from "lucide-react";
import { api } from "../../lib/api";
import { TENANT_COUNTRIES, DEFAULT_COUNTRY_ID } from "../../lib/countries";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countryId, setCountryId] = useState<string>(DEFAULT_COUNTRY_ID);

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
      const response = await api.get(`/auth/mock-login`, {
        params: { role: roleId, country_id: countryId },
      });

      const token = typeof response.data === "string" ? response.data : response.data.token;
      localStorage.setItem("token", token);
      localStorage.removeItem("activeCountryId");
      navigate("/");
    } catch {
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
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Select your region and role to enter the workspace</p>
        </div>

        <div className="mb-6">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            <Globe className="w-4 h-4" />
            Active Country
          </label>
          <select
            value={countryId}
            onChange={(e) => setCountryId(e.target.value)}
            disabled={loading}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {TENANT_COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-2">
            Your tenant is locked at login. All projects and messages use this region.
          </p>
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
              <span className="text-xs text-slate-400">Login →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

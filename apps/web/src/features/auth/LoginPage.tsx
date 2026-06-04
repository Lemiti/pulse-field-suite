import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Briefcase, Shield, Eye, Globe } from "lucide-react";
import { api } from "../../lib/api";
import { TENANT_COUNTRIES, DEFAULT_COUNTRY_ID } from "../../lib/countries";
import { brand } from "../../config/brand";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5FBFF] p-4 dark:bg-[#0F172A]">
      <div className="w-full max-w-md rounded-[8px] border border-slate-200 bg-white p-8 shadow-xl shadow-blue-100/50 dark:border-slate-800 dark:bg-[#0B1220] dark:shadow-none">
        <div className="text-center mb-8">
          <img
            src={brand.logoUrl}
            alt={`${brand.appName} logo`}
            className="mx-auto mb-4 h-20 w-20 rounded-[8px] object-cover shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
          />
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white">{brand.appName}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Select your region and role to enter the {brand.organization} workspace</p>
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
              className="group flex min-h-[60px] w-full items-center justify-between rounded-[8px] border border-slate-200 p-4 transition-all hover:border-[#1273DE] hover:bg-[#F1F7FF] disabled:opacity-50 dark:border-slate-800 dark:hover:border-blue-500 dark:hover:bg-slate-900"
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

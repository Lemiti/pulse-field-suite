import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Mail, Globe, Shield, Briefcase, Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "./AuthContext";
import { TENANT_COUNTRIES, DEFAULT_COUNTRY_ID } from "../../lib/countries";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Signup Only Fields
  const [name, setName] = useState("");
  const [role, setRole] = useState("FIELD_OFFICER");
  const [countryId, setCountryId] = useState<string>(DEFAULT_COUNTRY_ID);

  const [showPassword, setShowPassword] = useState(false);

  const roles = [
    { id: "ADMIN", label: "System Admin (HQ)" },
    { id: "PROJECT_MANAGER", label: "Project Manager" },
    { id: "FIELD_OFFICER", label: "Field Officer" },
    { id: "DONOR", label: "External Donor" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all credentials.");
      return;
    }
    if (isSignup && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignup) {
        // Trigger Signup
        const response = await api.post("/auth/signup", {
          email,
          password,
          name,
          role,
          country_id: countryId,
        });
        login(response.data.token);
        navigate("/");
      } else {
        // Trigger Login
        const response = await api.post("/auth/login", {
          email,
          password,
        });
        login(response.data.token);
        navigate("/");
      }
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data) {
        setError(typeof err.response.data === "string" ? err.response.data : "Invalid credentials.");
      } else {
        setError("Network connection issue. Make sure backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 border border-slate-200 dark:border-slate-800 transition-all">
        
        {/* LOGO & TITLE */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-extrabold text-2xl mx-auto mb-3 shadow-md">
            P
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Pulse-Field Suite
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isSignup ? "Create a secure account to join" : "Access your country operations command center"}
          </p>
        </div>

        {/* ERROR DISPLAY */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 text-red-500 text-xs font-bold rounded-lg leading-relaxed">
            {error}
          </div>
        )}

        {/* AUTH FORM */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignup && (
            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="you@ngo.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isSignup && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  System Role
                </label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Country Tenant
                </label>
                <div className="relative">
                  <select
                    value={countryId}
                    onChange={(e) => setCountryId(e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer"
                  >
                    {TENANT_COUNTRIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500/50 text-white font-extrabold text-sm rounded-lg transition-all shadow-md hover:shadow-lg focus:outline-none cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isSignup ? "Create Account" : "Access Console"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* TOGGLE LINK */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError(null);
            }}
            disabled={loading}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {isSignup ? "Already have an account? Sign In" : "Need an account? Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
};

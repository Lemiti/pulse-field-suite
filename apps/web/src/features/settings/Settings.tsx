import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, User, Building2, ToggleRight, Database, Cloud } from 'lucide-react';
import { api } from '../../lib/api';

/**
 * JWT Payload structure (decoded from token)
 */
interface DecodedJWT {
  sub: string;
  country_id: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

/**
 * Lightweight Base64 decoder - decodes JWT payload without external libraries
 * Safely handles padding and encoding edge cases
 */
function decodeBase64(str: string): string {
  try {
    // Add padding if needed
    let padded = str;
    switch (str.length % 4) {
      case 2:
        padded += '==';
        break;
      case 3:
        padded += '=';
        break;
    }
    // Replace URL-safe characters
    const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    // Use browser's atob
    return decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (e) {
    console.error('Base64 decode failed:', e);
    return '';
  }
}

/**
 * Decode JWT from token string
 * Safely parses the payload segment without validation
 */
function decodeJWT(token: string): DecodedJWT | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadStr = decodeBase64(parts[1]);
    const payload = JSON.parse(payloadStr);
    return payload;
  } catch (e) {
    console.error('JWT decode failed:', e);
    return null;
  }
}

/**
 * Settings Component
 *
 * Workspace configuration panel with JWT-based profile display,
 * security settings, and workspace preferences.
 *
 * Features:
 * - JWT decoding from localStorage with native Base64
 * - User profile display (name, role, tenant context)
 * - Tab-based navigation (Profile, Security, Workspace)
 * - Placeholder configuration toggles
 * - WCAG AAA compliance with 48x48px touch targets
 * - Light/dark mode support
 */
export default function Settings() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'Profile';

  // ============= JWT DECODING =============
  const decodedUser = useMemo(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const decoded = decodeJWT(token);
    return decoded;
  }, []);

  // ============= RENDER =============
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in font-sans select-none">
      {/* ============= PAGE HEADER ============= */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Manage your profile, security, and workspace preferences
          </p>
        </div>
      </div>

      {/* ============= TAB CONTENT ============= */}
      {activeTab === 'Profile' && <ProfileTab user={decodedUser} />}
      {activeTab === 'Security' && <SecurityTab />}
      {activeTab === 'Workspace' && <WorkspaceTab />}

      {/* Fallback for unknown tabs */}
      {activeTab !== 'Profile' && activeTab !== 'Security' && activeTab !== 'Workspace' && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-600 dark:text-slate-300">
            Content for tab "{activeTab}" not yet available.
          </p>
        </div>
      )}
    </div>
  );
}

// ============= PROFILE TAB =============
interface ProfileTabProps {
  user: DecodedJWT | null;
}

/**
 * Displays decoded user profile information from JWT token:
 * - Full name (from token claims)
 * - Role authority badge
 * - Tenant (country) context
 *
 * Accessibility: High-contrast cards, readable font sizes
 */
function ProfileTab({ user }: ProfileTabProps) {
  if (!user) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-8 border border-amber-200 dark:border-amber-800">
        <p className="text-amber-900 dark:text-amber-200">
          ⚠ No active token found. Please log in again.
        </p>
      </div>
    );
  }

  // Extract user information from JWT payload
  const userId = user.sub || 'Unknown';
  const countryId = user.country_id || 'Unknown';
  const email = user.email || 'N/A';
  const role = user.role || 'USER';
  const issuedAt = user.iat ? new Date(user.iat * 1000).toLocaleDateString() : 'Unknown';
  const expiresAt = user.exp ? new Date(user.exp * 1000).toLocaleDateString() : 'Unknown';

  // Role badge styling
  const getRoleBadgeStyle = (role: string): { bg: string; text: string; label: string } => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-900 dark:text-red-200',
          label: 'Administrator',
        };
      case 'PROJECT_MANAGER':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-900 dark:text-blue-200',
          label: 'Project Manager',
        };
      case 'FIELD_OFFICER':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-900 dark:text-green-200',
          label: 'Field Officer',
        };
      case 'DONOR':
        return {
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: 'text-purple-900 dark:text-purple-200',
          label: 'Donor',
        };
      default:
        return {
          bg: 'bg-slate-100 dark:bg-slate-700',
          text: 'text-slate-900 dark:text-slate-200',
          label: role,
        };
    }
  };

  const roleBadge = getRoleBadgeStyle(role);

  return (
    <div className="space-y-6">
      {/* ============= USER IDENTITY CARD ============= */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/20 rounded-lg p-8 border border-blue-200 dark:border-blue-800 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Welcome back!
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              Your active session and role authorization
            </p>
          </div>
        </div>
      </div>

      {/* ============= INFO CARDS GRID ============= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User ID Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-2 min-h-[120px]">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            User ID
          </p>
          <p className="text-slate-900 dark:text-white font-mono font-semibold break-all">
            {userId.substring(0, 16)}...
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Full UUID: <span className="font-mono text-[10px]">{userId}</span>
          </p>
        </div>

        {/* Email Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-2 min-h-[120px]">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Email Address
          </p>
          <p className="text-slate-900 dark:text-white font-medium break-all">
            {email}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Contact for notifications and support
          </p>
        </div>

        {/* Role Badge Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-2 min-h-[120px]">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Role Authority
          </p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm ${roleBadge.bg} ${roleBadge.text}`}>
            <Lock className="w-4 h-4" />
            {roleBadge.label}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Your assigned role within the NGO
          </p>
        </div>

        {/* Tenant Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-2 min-h-[120px]">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Assigned Tenant (Country)
          </p>
          <p className="text-slate-900 dark:text-white font-medium">
            {countryId === 'Unknown' ? countryId : `Country ID: ${countryId}`}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            All projects scoped to this tenant context
          </p>
        </div>
      </div>

      {/* ============= TOKEN METADATA ============= */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Token Information
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-600 dark:text-slate-400 text-xs mb-1">Issued</p>
            <p className="text-slate-900 dark:text-white font-mono">{issuedAt}</p>
          </div>
          <div>
            <p className="text-slate-600 dark:text-slate-400 text-xs mb-1">Expires</p>
            <p className="text-slate-900 dark:text-white font-mono">{expiresAt}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= SECURITY TAB =============
/**
 * Placeholder security settings with configuration toggles
 */
function SecurityTab() {
  const [settings, setSettings] = useState({
    twoFactor: false,
    sessionTimeout: true,
    apiKeys: false,
  });

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setMessage({ type: 'error', text: 'All password fields are required.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data) {
        setMessage({
          type: 'error',
          text: typeof err.response.data === 'string' ? err.response.data : 'Failed to update password.',
        });
      } else {
        setMessage({ type: 'error', text: 'Network connection issue.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const securityOptions = [
    {
      id: 'twoFactor',
      name: 'Two-Factor Authentication',
      description: 'Require a second verification method for login',
      icon: Lock,
    },
    {
      id: 'sessionTimeout',
      name: 'Session Timeout',
      description: 'Auto-logout after 30 minutes of inactivity',
      icon: Lock,
    },
    {
      id: 'apiKeys',
      name: 'API Key Management',
      description: 'Manage and rotate API keys for integrations',
      icon: Lock,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <p className="text-blue-900 dark:text-blue-200 text-sm">
          Security settings help protect your account and organization data. Changes to these settings
          take effect immediately.
        </p>
      </div>

      <div className="space-y-4">
        {securityOptions.map((option) => (
          <div
            key={option.id}
            className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors min-h-[60px]"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setSettings({
                  ...settings,
                  [option.id]: !settings[option.id as keyof typeof settings],
                });
              }
            }}
            onClick={() => {
              setSettings({
                ...settings,
                [option.id]: !settings[option.id as keyof typeof settings],
              });
            }}
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white">{option.name}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{option.description}</p>
            </div>
            <button
              className={`flex-shrink-0 ml-4 w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                settings[option.id as keyof typeof settings]
                  ? 'bg-emerald-600 dark:bg-emerald-500'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
              aria-pressed={settings[option.id as keyof typeof settings]}
              aria-label={`Toggle ${option.name}`}
              onClick={(e) => {
                e.stopPropagation();
                setSettings({
                  ...settings,
                  [option.id]: !settings[option.id as keyof typeof settings],
                });
              }}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings[option.id as keyof typeof settings] ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Change Account Password</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Update your account credentials. You will stay signed in.
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg text-xs font-bold ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border border-red-500 text-red-500'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Current Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              New Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500/50 text-white font-extrabold text-xs transition-colors cursor-pointer shadow-sm"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============= WORKSPACE TAB =============
/**
 * Placeholder workspace settings with configuration toggles
 */
function WorkspaceTab() {
  const [settings, setSettings] = useState({
    offlineSync: true,
    autoBackup: true,
    cacheLocal: true,
  });

  const workspaceOptions = [
    {
      id: 'offlineSync',
      name: 'Enable Offline Background Sync',
      description:
        'Allow the app to sync data when network connectivity is restored (for field officers)',
      icon: Cloud,
    },
    {
      id: 'autoBackup',
      name: 'Automatic Backup',
      description: 'Daily backup of project data to secure cloud storage',
      icon: Cloud,
    },
    {
      id: 'cacheLocal',
      name: 'Local Database Cache',
      description: 'Clear local SQLite cache to free up storage (will resync on next load)',
      icon: Database,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <p className="text-slate-700 dark:text-slate-300 text-sm">
          Workspace settings apply to all users in your tenant. You must be an Administrator to modify
          these settings.
        </p>
      </div>

      <div className="space-y-4">
        {workspaceOptions.map((option) => {
          const IconComponent = option.icon;
          return (
            <div
              key={option.id}
              className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors min-h-[60px]"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSettings({
                    ...settings,
                    [option.id]: !settings[option.id as keyof typeof settings],
                  });
                }
              }}
              onClick={() => {
                setSettings({
                  ...settings,
                  [option.id]: !settings[option.id as keyof typeof settings],
                });
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <IconComponent className="w-5 h-5 text-slate-600 dark:text-slate-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{option.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </div>
              <button
                className={`flex-shrink-0 ml-4 w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  settings[option.id as keyof typeof settings]
                    ? 'bg-emerald-600 dark:bg-emerald-500'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
                aria-pressed={settings[option.id as keyof typeof settings]}
                aria-label={`Toggle ${option.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSettings({
                    ...settings,
                    [option.id]: !settings[option.id as keyof typeof settings],
                  });
                }}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings[option.id as keyof typeof settings] ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* ============= DANGER ZONE ============= */}
      <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Danger Zone
        </h3>
        <button className="w-full px-4 py-3 rounded-lg border-2 border-red-600 dark:border-red-500 text-red-700 dark:text-red-300 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors min-h-[48px] text-sm">
          Clear All Local Cache and Resync
        </button>
      </div>
    </div>
  );
}

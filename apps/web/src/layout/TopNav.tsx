import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, Sun, Moon, Search, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useActiveCountry } from '../features/auth/ActiveCountryContext';
import { PendingSyncBanner } from '../features/sync/SyncManager';
import type { AlertResponse, SearchItem } from '@pulse/shared-types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../features/auth/AuthContext';

export default function TopNav() {
  const { activeCountryId } = useActiveCountry();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();

  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  // Click outside for search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: alerts = [] } = useQuery<AlertResponse[]>({
    queryKey: ['global-alerts', activeCountryId],
    queryFn: async () => {
      const res = await api.get('/alerts');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!activeCountryId,
    refetchInterval: 10000,
  });

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const { data: searchResults = [], isLoading: isSearchLoading } = useQuery<SearchItem[]>({
    queryKey: ['global-search', debouncedSearchQuery],
    queryFn: async () => {
      if (!debouncedSearchQuery.trim()) return [];
      const res = await api.get(`/search?q=${encodeURIComponent(debouncedSearchQuery)}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: debouncedSearchQuery.trim().length > 0,
  });

  const groupedResults = useMemo(() => {
    const groups: {
      projects: SearchItem[];
      beneficiaries: SearchItem[];
      assets: SearchItem[];
    } = {
      projects: [],
      beneficiaries: [],
      assets: [],
    };

    searchResults.forEach((item) => {
      if (item.item_type === 'PROJECT') {
        groups.projects.push(item);
      } else if (item.item_type === 'BENEFICIARY') {
        groups.beneficiaries.push(item);
      } else if (item.item_type === 'ASSET') {
        groups.assets.push(item);
      }
    });

    return groups;
  }, [searchResults]);

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await api.post(`/alerts/${alertId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-alerts', activeCountryId] });
    },
  });

  const { data: meData } = useQuery({
    queryKey: ['users-me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data;
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(event.target as Node)) {
        setAvatarDropdownOpen(false);
      }
    }
    if (avatarDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [avatarDropdownOpen]);

  const hasUnread = alerts.length > 0;

  return (
    <header className="h-16 bg-white dark:bg-[#0B1220] px-8 flex items-center justify-between select-none shrink-0 z-10 sticky top-0">
      <div className="flex items-center gap-2 mr-6">
        <span className="text-blue-600 dark:text-blue-500 font-extrabold text-2xl tracking-tight font-sans">
          Engage Now Africa
        </span>
      </div>

      {/* Global Search Bar */}
      <div className="relative hidden md:block" ref={searchRef}>
        <div className="flex h-10 w-72 items-center gap-2 rounded-[8px] border border-slate-200 bg-[#F8FBFF] px-3 text-slate-500 dark:border-slate-800 dark:bg-slate-900/70">
          <Search className="h-4 w-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search projects, assets, beneficiaries..."
            className="w-full bg-transparent text-xs font-medium text-slate-850 placeholder-slate-400 outline-none dark:text-slate-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {isSearchFocused && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 mt-2 z-50 w-80 bg-white dark:bg-[#0B1220] border border-gray-200 dark:border-slate-800 shadow-2xl rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            {isSearchLoading ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>Searching database...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No matches found
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-855">
                {/* 1. PROJECTS GROUP */}
                {groupedResults.projects.length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/60 text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                      Projects
                    </div>
                    {groupedResults.projects.map((p) => (
                      <Link
                        key={p.id}
                        to={`/projects/${p.id}`}
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchFocused(false);
                        }}
                        className="block px-3 py-2.5 hover:bg-[#F1F7FF] dark:hover:bg-slate-900 text-left transition"
                      >
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          {p.name}
                        </p>
                        {p.details && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {p.details}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}

                {/* 2. ASSETS GROUP */}
                {groupedResults.assets.length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/60 text-[10px] font-extrabold text-slate-455 dark:text-slate-500 uppercase tracking-wider">
                      Logistics Assets
                    </div>
                    {groupedResults.assets.map((a) => (
                      <Link
                        key={a.id}
                        to={`/logistics?tab=assets&highlight=${a.id}`}
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchFocused(false);
                        }}
                        className="block px-3 py-2.5 hover:bg-[#F1F7FF] dark:hover:bg-slate-900 text-left transition"
                      >
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          {a.name}
                        </p>
                        {a.details && (
                          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            Code: {a.details}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}

                {/* 3. BENEFICIARIES GROUP */}
                {groupedResults.beneficiaries.length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/60 text-[10px] font-extrabold text-slate-455 dark:text-slate-500 uppercase tracking-wider">
                      Beneficiaries
                    </div>
                    {groupedResults.beneficiaries.map((b) => (
                      <Link
                        key={b.id}
                        to={`/beneficiaries?id=${b.id}`}
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchFocused(false);
                        }}
                        className="block px-3 py-2.5 hover:bg-[#F1F7FF] dark:hover:bg-slate-900 text-left transition"
                      >
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          {b.name}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          ID: {b.id} • Woreda: {b.details || 'N/A'}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 flex-1 justify-end">
        <PendingSyncBanner />
        
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-[#F1F7FF] hover:text-[#1273DE] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-all duration-200 relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            {hasUnread && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-[#0F172A]" />
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-y-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] shadow-xl z-50 py-2">
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-sans">
                  Notifications
                </span>
                {hasUnread && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/50 text-red-650 dark:text-red-400 font-sans">
                    {alerts.length} New
                  </span>
                )}
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-8 font-sans">
                    No new alerts
                  </p>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-2 justify-between items-start"
                    >
                      <div className="space-y-1">
                        <p className="text-xs text-slate-850 dark:text-slate-200 font-sans leading-relaxed">
                          {alert.message}
                        </p>
                        <span className="inline-block text-[9px] uppercase tracking-wider font-extrabold text-red-600 dark:text-red-450 font-sans">
                          {alert.severity}
                        </span>
                      </div>
                      <button
                        onClick={() => dismissMutation.mutate(alert.id)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors cursor-pointer"
                        title="Dismiss notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={avatarDropdownRef}>
          <button
            onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
            className="flex items-center gap-3 p-1 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-all focus:outline-none cursor-pointer"
            title="User menu"
          >
            {meData?.avatar_url ? (
              <img
                src={meData.avatar_url}
                alt="User profile"
                className="w-9 h-9 rounded-full border-2 border-blue-500/20 object-cover shadow-sm"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center border-2 border-blue-500/20 shadow-sm">
                {meData?.name ? meData.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
              </div>
            )}
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline-block">
              {meData?.name || 'User'}
            </span>
          </button>

          {avatarDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] shadow-xl z-50 py-2 animate-fade-in">
              {/* Signed in info */}
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-850">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  Signed in as
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-white truncate block mt-0.5">
                  {meData?.name || 'User'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                  {meData?.email || ''}
                </span>
              </div>

              {/* Links */}
              <div className="py-1">
                <Link
                  to="/settings"
                  onClick={() => setAvatarDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-[#F1F7FF] dark:hover:bg-slate-800/50 transition-colors"
                >
                  My Profile
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setAvatarDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-[#F1F7FF] dark:hover:bg-slate-800/50 transition-colors"
                >
                  Workspace Preferences
                </Link>
                <Link
                  to="/help"
                  onClick={() => setAvatarDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-[#F1F7FF] dark:hover:bg-slate-800/50 transition-colors"
                >
                  Help & Support
                </Link>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 py-1">
                <button
                  type="button"
                  onClick={() => {
                    setAvatarDropdownOpen(false);
                    logout();
                    window.location.href = '/login';
                  }}
                  className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

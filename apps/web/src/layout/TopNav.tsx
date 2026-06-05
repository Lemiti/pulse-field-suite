import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, Sun, Moon, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useActiveCountry } from '../features/auth/ActiveCountryContext';
import { PendingSyncBanner } from '../features/sync/SyncManager';
import type { AlertResponse } from '@pulse/shared-types';
import { applyTheme, getStoredTheme } from '../lib/theme';
import type { ThemeMode } from '../lib/theme';

export default function TopNav() {
  const { activeCountryId } = useActiveCountry();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<ThemeMode>('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

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

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['notification-projects', activeCountryId],
    queryFn: async () => {
      const res = await api.get('/projects');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!activeCountryId,
  });

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await api.post(`/alerts/${alertId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-alerts', activeCountryId] });
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

  const hasUnread = alerts.length > 0;

  return (
    <header className="h-16 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between select-none shrink-0 z-10 sticky top-0">
      <div className="flex items-center gap-2 mr-6">
        <span className="text-blue-600 dark:text-blue-500 font-extrabold text-2xl tracking-tight font-sans">
          Pulse-Field
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
            placeholder="Search projects..."
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
          <div className="absolute left-0 mt-2 z-50 w-72 overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0B1220]">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Matching Projects
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-850">
              {filteredProjects.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  No projects found
                </div>
              ) : (
                filteredProjects.map((p) => (
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
                    {p.description && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {p.description}
                      </p>
                    )}
                  </Link>
                ))
              )}
            </div>
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
            <div className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] shadow-xl z-50 py-2">
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

        <div className="flex items-center gap-3">
          <img
            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face"
            alt="User profile"
            className="w-9 h-9 rounded-full border-2 border-blue-500/20 object-cover shadow-sm"
          />
        </div>
      </div>
    </header>
  );
}

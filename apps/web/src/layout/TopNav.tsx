import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Contrast, X } from 'lucide-react';
import { api } from '../lib/api';
import { useActiveCountry } from '../features/auth/ActiveCountryContext';
import { PendingSyncBanner } from '../features/sync/SyncManager';
import type { AlertResponse } from '@pulse/shared-types';

export default function TopNav() {
  const { activeCountryId } = useActiveCountry();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: alerts = [] } = useQuery<AlertResponse[]>({
    queryKey: ['global-alerts', activeCountryId],
    queryFn: async () => {
      const res = await api.get('/alerts');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!activeCountryId,
    refetchInterval: 10000,
  });

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
      <div className="flex items-center gap-2">
        <span className="text-blue-600 dark:text-blue-500 font-extrabold text-2xl tracking-tight font-sans">
          Pulse-Field
        </span>
      </div>

      <div className="flex items-center gap-6 flex-1 justify-end">
        <PendingSyncBanner />
        
        <button
          onClick={() => document.documentElement.classList.toggle('dark')}
          className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-all duration-200 cursor-pointer"
          title="Toggle Contrast"
        >
          <Contrast className="w-6 h-6" />
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
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
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
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-sans leading-relaxed">
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

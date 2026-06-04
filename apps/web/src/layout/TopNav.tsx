import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bell, Check, Clock, Mail, Moon, Search, Sun } from 'lucide-react';
import type { AlertResponse, ProjectResponse } from '@pulse/shared-types';
import { PendingSyncBanner } from '../features/sync/SyncManager';
import { api } from '../lib/api';
import { brand } from '../config/brand';
import { applyTheme, getStoredTheme } from '../lib/theme';
import type { ThemeMode } from '../lib/theme';

type NotificationItem = AlertResponse & {
  project_name: string;
};

const readStorageKey = 'pulse-field-read-notifications';

function getReadNotificationIds() {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(readStorageKey) || '[]'));
  } catch {
    return new Set<string>();
  }
}

function saveReadNotificationIds(ids: Set<string>) {
  localStorage.setItem(readStorageKey, JSON.stringify(Array.from(ids)));
}

function formatNotificationTime(value: string) {
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return 'Recently';

  const diffMinutes = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function TopNav() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadNotificationIds());
  const notificationRef = useRef<HTMLDivElement | null>(null);

  const { data: projects = [] } = useQuery<ProjectResponse[]>({
    queryKey: ['notification-projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchInterval: 30_000,
  });

  const { data: notifications = [], isFetching: isFetchingNotifications } = useQuery<NotificationItem[]>({
    queryKey: ['project-notifications', projects.map((project) => project.id).join(',')],
    queryFn: async () => {
      const responses = await Promise.all(
        projects.map(async (project) => {
          const res = await api.get(`/projects/${project.id}/alerts`);
          const alerts = Array.isArray(res.data) ? (res.data as AlertResponse[]) : [];
          return alerts.map((alert) => ({
            ...alert,
            project_name: project.name,
          }));
        })
      );

      return responses.flat().sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    },
    enabled: projects.length > 0,
    refetchInterval: 20_000,
  });

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !readIds.has(notification.id)).length,
    [notifications, readIds]
  );

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  const markAllRead = () => {
    const nextReadIds = new Set(readIds);
    notifications.forEach((notification) => nextReadIds.add(notification.id));
    setReadIds(nextReadIds);
    saveReadNotificationIds(nextReadIds);
  };

  const markRead = (id: string) => {
    const nextReadIds = new Set(readIds);
    nextReadIds.add(id);
    setReadIds(nextReadIds);
    saveReadNotificationIds(nextReadIds);
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 select-none items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur dark:border-slate-800 dark:bg-[#0B1220]/95 md:px-8">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-950 dark:text-white">Overview</p>
        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{brand.organization}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden h-10 w-72 items-center gap-2 rounded-[8px] border border-slate-200 bg-[#F8FBFF] px-3 text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 md:flex">
          <Search className="h-4 w-4" />
          <span className="text-xs font-medium">Search projects, tasks, messages</span>
        </div>

        <PendingSyncBanner />

        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-slate-600 transition hover:bg-[#F1F7FF] hover:text-[#1273DE] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setIsNotificationsOpen((isOpen) => !isOpen)}
            className={`relative flex h-10 w-10 items-center justify-center rounded-[8px] border transition ${
              isNotificationsOpen
                ? 'border-[#1273DE] bg-[#EAF4FF] text-[#1273DE] dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-[#F1F7FF] hover:text-[#1273DE] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300'
            }`}
            title="Notifications"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={isNotificationsOpen}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-extrabold text-white ring-2 ring-white dark:ring-slate-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-[#0B1220] dark:shadow-black/30">
              <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-950 dark:text-white">Notifications</h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {isFetchingNotifications ? 'Checking for updates...' : `${unreadCount} unread alerts`}
                  </p>
                </div>
                <button
                  onClick={markAllRead}
                  disabled={notifications.length === 0}
                  className="inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-xs font-bold text-[#1273DE] transition hover:bg-[#EAF4FF] disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-300 dark:hover:bg-blue-950/40"
                >
                  <Check className="h-3.5 w-3.5" />
                  Read all
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.slice(0, 8).map((notification) => {
                    const isUnread = !readIds.has(notification.id);
                    return (
                      <button
                        key={notification.id}
                        onClick={() => markRead(notification.id)}
                        className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 dark:border-slate-800 ${
                          isUnread
                            ? 'bg-[#F8FBFF] hover:bg-[#EAF4FF] dark:bg-blue-950/20 dark:hover:bg-blue-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <div className={`mt-0.5 rounded-[8px] p-2 ${
                          notification.severity === 'CRITICAL'
                            ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-bold text-slate-950 dark:text-white">
                              {notification.message}
                            </p>
                            {isUnread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                          </div>
                          <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                            {notification.project_name}
                          </p>
                          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                            <Clock className="h-3 w-3" />
                            {formatNotificationTime(notification.created_at)}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-5 py-10 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#EAF4FF] text-[#1273DE] dark:bg-blue-950/50 dark:text-blue-300">
                      <Bell className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-extrabold text-slate-950 dark:text-white">No alerts right now</p>
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      New project alerts will appear here automatically.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200/80 p-3 dark:border-slate-800">
                <Link
                  to="/inbox"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="flex min-h-10 items-center justify-center gap-2 rounded-[8px] bg-[#1273DE] px-3 text-sm font-bold text-white transition hover:bg-[#0F63C3]"
                >
                  <Mail className="h-4 w-4" />
                  Open notification center
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-800 sm:flex">
          <div className="text-right leading-tight">
            <p className="text-sm font-extrabold text-slate-950 dark:text-white">{brand.user.name}</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{brand.user.role}</p>
          </div>
          <img
            src={brand.user.avatarUrl}
            alt={brand.user.name}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-[#E7F2FF] dark:ring-slate-800"
          />
        </div>
      </div>
    </header>
  );
}

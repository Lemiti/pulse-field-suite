import { Bell, Contrast } from 'lucide-react';
import { PendingSyncBanner } from '../features/sync/SyncManager';

export default function TopNav() {
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
          className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-all duration-200"
          title="Toggle Contrast"
        >
          <Contrast className="w-6 h-6" />
        </button>

        <button
          className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-all duration-200 relative"
          title="Notifications"
        >
          <Bell className="w-6 h-6 text-blue-600 dark:text-blue-500" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-[#0F172A]" />
        </button>

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

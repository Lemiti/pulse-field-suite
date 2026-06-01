import { Bell, Contrast } from 'lucide-react';

export default function TopNav() {
  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between select-none shrink-0 z-10">
      {/* BRAND LOGO */}
      <div className="flex items-center gap-2">
        <span className="text-[#0052cc] font-extrabold text-2xl tracking-tight font-sans">
          Pulse-Field
        </span>
      </div>

      {/* TOP CONTROLS */}
      <div className="flex items-center gap-6">
        {/* Contrast / Theme Toggle */}
        <button
          onClick={() => document.documentElement.classList.toggle('dark')}
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-full transition-all duration-200"
          title="Toggle Contrast"
        >
          <Contrast className="w-6 h-6 text-[#232936]" />
        </button>

        {/* Bell Notifications */}
        <button
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-full transition-all duration-200 relative"
          title="Notifications"
        >
          <Bell className="w-6 h-6 text-[#0052cc]" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
        </button>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-3">
          <img
            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face"
            alt="Amara Osei"
            className="w-9 h-9 rounded-full border-2 border-blue-500/20 object-cover shadow-sm"
          />
        </div>
      </div>
    </header>
  );
}

import { NavLink } from 'react-router-dom';
import { Home, Mail, FolderKanban, History, Settings, HelpCircle, LogOut } from 'lucide-react';
import { brand } from '../config/brand';

export default function Sidebar() {
  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Inbox', path: '/inbox', icon: Mail },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Audit Logs', path: '/audit-logs', icon: History },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="flex h-full w-72 shrink-0 select-none flex-col border-r border-slate-200/80 bg-white text-slate-600 shadow-[8px_0_30px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#0B1220] dark:text-slate-400">
      <div className="px-5 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <img
            src={brand.logoUrl}
            alt={`${brand.appName} logo`}
            className="h-12 w-12 rounded-[8px] object-cover shadow-sm shadow-slate-300/60 ring-1 ring-slate-200 dark:shadow-none dark:ring-slate-800"
          />
          <div className="min-w-0">
            <span className="block truncate text-lg font-extrabold leading-tight tracking-normal text-slate-950 dark:text-white">
              {brand.appName}
            </span>
            <span className="block truncate text-xs font-medium leading-tight text-slate-500 dark:text-slate-400">
              {brand.tagline}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 px-4 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/'} 
            className={({ isActive }) =>
              `flex min-h-12 items-center gap-3 rounded-[8px] px-3.5 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-[#1273DE] text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:bg-[#F1F7FF] hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900/80 dark:hover:text-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-slate-200/80 p-4 dark:border-slate-800">
        <div className="rounded-[8px] bg-[#F8FBFF] p-3 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <img
              src={brand.user.avatarUrl}
              alt={brand.user.name}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-800"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{brand.user.name}</p>
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{brand.user.role}</p>
            </div>
          </div>
        </div>

        <NavLink
          to="/help"
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-3 rounded-[8px] px-3.5 text-sm font-semibold transition-all duration-200 ${
              isActive 
                ? 'bg-[#F1F7FF] text-slate-950 dark:bg-slate-800 dark:text-white' 
                : 'text-slate-600 hover:bg-[#F1F7FF] hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'
            }`
          }
        >
          <HelpCircle className="h-5 w-5" />
          <span>Help</span>
        </NavLink>

        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('activeCountryId');
            window.location.href = '/login';
          }}
          className="flex min-h-11 w-full items-center gap-3 rounded-[8px] px-3.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

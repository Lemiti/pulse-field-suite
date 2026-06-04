import { NavLink } from 'react-router-dom';
import { Home, Mail, FolderKanban, History, BarChart3, Settings, HelpCircle, LogOut } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Inbox', path: '/inbox', icon: Mail },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Audit Logs', path: '/audit-logs', icon: History },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-80 bg-slate-50 dark:bg-[#0F172A] text-slate-600 dark:text-slate-400 flex flex-col h-full select-none border-r border-slate-200 dark:border-slate-800">
      {/* BRANDING HEADER */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-200 dark:border-slate-800">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">
          c
        </div>
        <div className="flex flex-col">
          <span className="text-slate-900 dark:text-white font-bold text-lg tracking-wide leading-tight">Client NGO</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Field Operations</span>
        </div>
      </div>

      {/* NAVIGATION LINKS */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/'} 
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* FOOTER SECTION */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
        {/* Help Link */}
        <NavLink
          to="/help"
          className={({ isActive }) =>
            `flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
              isActive 
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
            }`
          }
        >
          <HelpCircle className="w-5 h-5" />
          <span>Help</span>
        </NavLink>

        {/* Logout Capsule */}
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('activeCountryId');
            window.location.href = '/login';
          }}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

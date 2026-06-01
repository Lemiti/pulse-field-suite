import { NavLink } from 'react-router-dom';
import { Home, Mail, FolderKanban, History, Settings, HelpCircle, LogOut } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { name: 'Home', path: '/projects', icon: Home },
    { name: 'Inbox', path: '/inbox', icon: Mail },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Audit Logs', path: '/audit-logs', icon: History },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-80 bg-[#232936] text-[#9ca3af] flex flex-col h-full select-none">
      {/* BRANDING HEADER */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-700/50">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">
          c
        </div>
        <div className="flex flex-col">
          <span className="text-white font-bold text-lg tracking-wide leading-tight">Client NGO</span>
          <span className="text-xs text-gray-400 font-medium">Field Operations</span>
        </div>
      </div>

      {/* NAVIGATION LINKS */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/projects'}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                  : 'hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* FOOTER SECTION */}
      <div className="p-4 border-t border-slate-700/30 space-y-4">
        {/* Help Link */}
        <NavLink
          to="/help"
          className={({ isActive }) =>
            `flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
              isActive ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-slate-200'
            }`
          }
        >
          <HelpCircle className="w-5 h-5 text-slate-400" />
          <span>Help</span>
        </NavLink>

        {/* Logout Capsule */}
        <button
          onClick={() => {
            localStorage.removeItem('token');
            window.location.reload();
          }}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-bold bg-[#e0e7ff] text-[#1e1b4b] hover:bg-[#c7d2fe] transition-all duration-200"
        >
          <LogOut className="w-5 h-5 text-[#4338ca]" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

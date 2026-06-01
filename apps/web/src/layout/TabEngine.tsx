import { NavLink, useParams } from 'react-router-dom';

export interface TabDef {
  label: string;
  to: string;
}

// 🛡️ JWT DECODER: Lightweight extraction of claims role for dynamic tabs
function getUserRole(): string {
  const token = localStorage.getItem('token');
  if (!token) return 'FIELD_OFFICER';
  try {
    const parts = token.split('.');
    if (parts.length < 2) return 'FIELD_OFFICER';
    const payload = JSON.parse(atob(parts[1]));
    return payload.role || 'FIELD_OFFICER';
  } catch (e) {
    console.error("Failed to decode user role:", e);
    return 'FIELD_OFFICER';
  }
}

export default function TabEngine() {
  const { projectId } = useParams<{ projectId: string }>();
  const role = getUserRole();

  // Define tabs
  const tabs: TabDef[] = [
    { label: "Dashboard", to: "" },
    { label: "Calendar", to: "calendar" },
    { label: "Messages", to: "messages" },
    { label: "Note", to: "note" },
    { label: "Files", to: "files" },
  ];

  // Option C: Dynamically show/hide the Impact tab based on the active role
  if (role === 'ADMIN' || role === 'PROJECT_MANAGER') {
    tabs.push({ label: "Impact", to: "impact" });
  }

  return (
    <div className="flex border-b border-slate-200/80 mb-6 select-none shrink-0">
      {tabs.map((tab) => {
        const path = tab.to ? `/projects/${projectId}/${tab.to}` : `/projects/${projectId}`;
        return (
          <NavLink
            key={tab.label}
            to={path}
            end
            className={({ isActive }) =>
              `px-5 py-3 text-sm font-semibold border-b-2 -mb-[2px] transition-all duration-200 ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`
            }
          >
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}

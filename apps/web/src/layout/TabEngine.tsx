import { useLocation, Link } from 'react-router-dom';
import { getUserClaims } from '../lib/auth';

const PROJECT_TABS = ['Dashboard', 'Calendar', 'Messages', 'Note', 'Files', 'Impact', 'Settings'] as const;
const DONOR_HIDDEN_TABS = new Set(['Messages', 'Note', 'Calendar', 'Settings']);

export default function TabEngine() {
  const location = useLocation();
  const path = location.pathname;

  const claims = getUserClaims();
  const projectTabs =
    claims?.role === 'DONOR'
      ? PROJECT_TABS.filter((tab) => !DONOR_HIDDEN_TABS.has(tab))
      : [...PROJECT_TABS];

  const projectDirectoryTabs = ['Active', 'Archived', 'Templates'];
  const inboxTabs = ['Unread', 'Messages'];
  const globalTabs = ['Feed', 'Notifications'];
  const settingsTabs = ['Profile', 'Security'];
  const userRole = claims?.role?.toUpperCase();
  if (userRole === 'ADMIN') {
    settingsTabs.push('Workspace', 'Developer');
  } else if (userRole === 'PROJECT_MANAGER') {
    settingsTabs.push('Workspace');
  }

  let activeTabs: string[] = [...globalTabs];

  const isSingleProject = /^\/projects\/[a-zA-Z0-9-]+$/.test(path);

  if (isSingleProject) {
    activeTabs = projectTabs;
  } else if (path === '/projects') {
    activeTabs = projectDirectoryTabs;
  } else if (path.startsWith('/inbox')) {
    activeTabs = inboxTabs;
  } else if (path === '/settings') {
    activeTabs = settingsTabs;
  }

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || activeTabs[0];

  return (
    <div className="h-12 bg-white dark:bg-[#0B1220] border-b border-slate-200 dark:border-slate-800 px-8 flex items-center gap-6 flex-shrink-0 z-0 overflow-x-auto hide-scrollbar">
      {activeTabs.map((tab) => {
        const isActive = currentTab === tab;
        return (
          <Link
            key={tab}
            to={`${path}?tab=${tab}`}
            className={`text-sm font-bold relative h-full flex items-center px-1 transition-colors ${
              isActive
                ? 'text-blue-600 dark:text-blue-500'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {tab}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500 rounded-t-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

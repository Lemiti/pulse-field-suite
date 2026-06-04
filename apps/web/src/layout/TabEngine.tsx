import { useLocation, Link } from 'react-router-dom';
import { getUserClaims } from '../lib/auth';

const PROJECT_TABS = ['Dashboard', 'Calendar', 'Messages', 'Note', 'Files', 'Impact'] as const;
const DONOR_HIDDEN_TABS = new Set(['Messages', 'Note', 'Calendar']);

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

  let activeTabs: string[] = [...globalTabs];

  const isSingleProject = /^\/projects\/[a-zA-Z0-9-]+$/.test(path);

  if (isSingleProject) {
    activeTabs = projectTabs;
  } else if (path === '/projects') {
    activeTabs = projectDirectoryTabs;
  } else if (path.startsWith('/inbox')) {
    activeTabs = inboxTabs;
  }

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || activeTabs[0];

  return (
    <div className="z-0 flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-200/80 bg-white/90 px-6 dark:border-slate-800 dark:bg-[#0B1220]/90 md:px-8">
      {activeTabs.map((tab) => {
        const isActive = currentTab === tab;
        return (
          <Link
            key={tab}
            to={`${path}?tab=${tab}`}
            className={`relative flex h-8 items-center rounded-[8px] px-3 text-sm font-bold transition-colors ${
              isActive 
                ? 'bg-[#EAF4FF] text-[#1273DE] dark:bg-blue-950/50 dark:text-blue-300' 
                : 'text-slate-500 hover:bg-[#F1F7FF] hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab}
            {isActive && (
              <div className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-[#1273DE] dark:bg-blue-400" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

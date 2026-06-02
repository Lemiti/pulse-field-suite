import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import TabEngine from './TabEngine';

export default function MainLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0F172A] font-sans text-slate-900 dark:text-slate-100">
      {/* LEFT: Sidebar Navigation */}
      <Sidebar />

      {/* RIGHT: Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        
        {/* Top Branding & Controls */}
        <TopNav />
        
        {/* Dynamic Context Tabs */}
        <TabEngine />
        
        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <Outlet />
        </main>
        
      </div>
    </div>
  );
}
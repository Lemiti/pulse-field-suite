import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import TabEngine from './TabEngine';

export default function MainLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5FBFF] font-sans text-slate-950 antialiased dark:bg-[#0F172A] dark:text-slate-100">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <TabEngine />

        <main className="relative flex-1 overflow-y-auto px-6 py-7 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileSidebar } from './MobileSidebar';

export function AppLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-100">
      <Header onMenu={() => setOpen(true)} />
      <div className="flex h-[calc(100vh-76px)] overflow-hidden">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <MobileSidebar open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

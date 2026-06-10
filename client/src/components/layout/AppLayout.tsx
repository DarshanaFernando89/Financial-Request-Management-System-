import { Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileSidebar } from './MobileSidebar';
import { Button } from '../ui/Button';
import { useNotifications } from '../../hooks/useNotifications';

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <Header onMenu={() => setOpen(true)} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mb-4 flex justify-end">
            <Button
              aria-label="Notifications"
              variant="outline"
              className="relative h-14 min-h-14 w-14 rounded-full border-slate-200 bg-white px-0 text-university-maroon shadow-sm hover:bg-slate-50"
              icon={<Bell size={28} strokeWidth={2.4} />}
              onClick={() => navigate('/notifications')}
            >
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold leading-none text-white ring-2 ring-slate-100">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </div>
          <Outlet />
        </main>
      </div>
      <MobileSidebar open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

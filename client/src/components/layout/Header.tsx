import { Bell, LogOut, Menu, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { roleLabel } from '../../utils/roleLabels';
import { facultyName, systemTitle } from '../../utils/constants';
import type { Role } from '../../types/auth';

export function Header({ onMenu }: { onMenu: () => void }) {
  const { user, logout, switchRole } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  async function handleSwitch(role: Role) {
    await switchRole(role);
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-yellow-300 bg-university-gold shadow-sm">
      <div className="flex min-h-[76px] items-center gap-4 px-4 lg:px-6">
        <Button aria-label="Open menu" variant="ghost" className="h-10 w-10 px-0 lg:hidden" icon={<Menu size={21} />} onClick={onMenu} />
        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-university-maroon sm:flex">UoR</div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-university-ink md:text-xl">{systemTitle}</h1>
          <p className="truncate text-xs font-semibold text-university-maroon md:text-sm">{facultyName}</p>
        </div>
        <Button aria-label="Notifications" variant="ghost" className="relative h-10 w-10 px-0" icon={<Bell size={20} />} onClick={() => navigate('/notifications')}>
          {unreadCount > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-600" />}
        </Button>
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 hover:bg-yellow-200">
            <UserCircle size={28} className="text-university-maroon" />
            <span className="hidden text-left sm:block">
              <span className="block max-w-40 truncate text-sm font-bold text-slate-900">{user?.nameWithInitials}</span>
              <Badge tone="maroon">{roleLabel(user?.activeRole)}</Badge>
            </span>
          </summary>
          <div className="absolute right-0 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
            <p className="font-semibold text-slate-900">{user?.fullName}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            {user && user.roles.length > 1 && (
              <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                {user.roles.map((role) => (
                  <button
                    key={role}
                    className="block w-full rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50 disabled:font-semibold disabled:text-university-maroon"
                    disabled={role === user.activeRole}
                    onClick={() => void handleSwitch(role)}
                  >
                    {roleLabel(role)}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 border-t border-slate-100 pt-3">
              <Button variant="outline" className="w-full justify-start" icon={<LogOut size={16} />} onClick={() => void logout()}>
                Logout
              </Button>
            </div>
          </div>
        </details>
        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-university-maroon md:flex">FoE</div>
      </div>
    </header>
  );
}

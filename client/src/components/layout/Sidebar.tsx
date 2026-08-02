import { BarChart3, Bell, ClipboardCheck, CreditCard, FilePlus2, Files, History, LayoutDashboard, ListChecks, LogOut, ShieldCheck, UserCog, UserCircle } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { ADMIN_ROLES, APPROVER_ROLES, FINANCE_ROLES, REQUESTER_ROLES } from '../../utils/constants';
import { roleLabel } from '../../utils/roleLabels';
import type { Role } from '../../types/auth';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

type NavItem = { to: string; label: string; icon: React.ReactNode; roles?: Role[] };

const items: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/requests/new', label: 'New Request', icon: <FilePlus2 size={18} />, roles: REQUESTER_ROLES },
  { to: '/requests/my', label: 'My Requests', icon: <Files size={18} />, roles: REQUESTER_ROLES },
  { to: '/approvals/pending', label: 'Pending Requests', icon: <ClipboardCheck size={18} />, roles: APPROVER_ROLES },
  { to: '/approvals/history', label: 'Approval History', icon: <History size={18} />, roles: APPROVER_ROLES },
  { to: '/finance/pending-payments', label: 'Pending Payments', icon: <CreditCard size={18} />, roles: FINANCE_ROLES },
  { to: '/finance/payment-history', label: 'Payment History', icon: <History size={18} />, roles: FINANCE_ROLES },
  { to: '/admin/users', label: 'Users', icon: <UserCog size={18} />, roles: ADMIN_ROLES },
  { to: '/admin/roles', label: 'Roles', icon: <ShieldCheck size={18} />, roles: ADMIN_ROLES },
  { to: '/admin/approval-rules', label: 'Approval Rules', icon: <ListChecks size={18} />, roles: ADMIN_ROLES },
  { to: '/admin/reports', label: 'Reports', icon: <BarChart3 size={18} />, roles: ADMIN_ROLES },
  { to: '/notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { to: '/profile', label: 'Profile', icon: <UserCircle size={18} /> }
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout, switchRole } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const activeRole = user?.activeRole;
  const visible = items.filter((item) => !item.roles || (activeRole && item.roles.includes(activeRole)));

  async function handleSwitch(role: Role) {
    await switchRole(role);
    navigate('/');
    onNavigate?.();
  }

  async function handleLogout() {
    await logout();
    onNavigate?.();
  }

  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white">
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition',
                isActive ? 'bg-university-maroon text-white' : 'text-slate-700 hover:bg-slate-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="shrink-0">{item.icon}</span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.to === '/notifications' && unreadCount > 0 && (
                  <span
                    className={clsx(
                      'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none',
                      isActive ? 'bg-white text-university-maroon' : 'bg-red-600 text-white'
                    )}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-university-maroon text-sm font-bold text-white">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                user?.nameWithInitials?.slice(0, 2).toUpperCase() || 'U'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{user?.nameWithInitials}</p>
              <p className="truncate text-xs text-slate-500">{user?.department}</p>
              <Badge tone="gold" className="mt-2">{roleLabel(user?.activeRole)}</Badge>
            </div>
          </div>
          {user && user.roles.length > 1 && (
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Active role</span>
              <select
                value={user.activeRole || ''}
                onChange={(event) => void handleSwitch(event.target.value as Role)}
                className="focus-ring h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                {user.roles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Button
            variant="outline"
            className="mt-3 w-full justify-center border-red-200 text-red-700 hover:bg-red-50"
            icon={<LogOut size={16} />}
            onClick={() => void handleLogout()}
          >
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
}

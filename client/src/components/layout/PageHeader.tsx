import type { ReactNode } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  const { unreadCount } = useNotifications();

  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 text-left ${actions ? 'sm:grid-cols-[minmax(0,1fr)_auto_auto]' : ''}`}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-sm font-semibold text-university-maroon">{eyebrow}</p>}
        <h1 className="break-words text-2xl font-bold leading-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && (
        <div className="col-span-2 row-start-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:justify-end">
          {actions}
        </div>
      )}
      <Link
        to="/notifications"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        className={`button-hover focus-ring relative col-start-2 row-start-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-university-maroon shadow-sm transition hover:bg-slate-50 ${actions ? 'sm:col-start-3' : ''}`}
      >
        <Bell size={22} strokeWidth={2.2} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
    </div>
  );
}

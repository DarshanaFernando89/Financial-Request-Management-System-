import { CheckCheck, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationApi } from '../../api/notificationApi';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDate } from '../../utils/formatDate';
import { getNotificationAction } from '../../utils/notificationActions';

export function NotificationsPage() {
  const { notifications, refresh } = useNotifications();
  async function readAll() {
    await notificationApi.readAll();
    await refresh();
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <Button variant="outline" icon={<CheckCheck size={16} />} onClick={() => void readAll()}>Mark All Read</Button>
      </div>
      {notifications.length ? (
        <div className="space-y-3">
          {notifications.map((item) => {
            const action = getNotificationAction(item);
            return (
              <Card key={item._id} className={item.isRead ? 'shadow-none' : 'border-blue-200 bg-blue-50'}>
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <Link className="min-w-0 flex-1" to={`/notifications/${item._id}`}>
                    <h2 className="font-semibold text-slate-900 hover:text-university-maroon">{item.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                  </Link>
                  <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
                    <span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span>
                    {action && (
                      <Link to={action.to}>
                        <Button className="min-h-9 px-3 py-1.5" variant="outline" icon={<UserCheck size={16} />}>
                          {action.label}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No notifications found" />
      )}
    </div>
  );
}

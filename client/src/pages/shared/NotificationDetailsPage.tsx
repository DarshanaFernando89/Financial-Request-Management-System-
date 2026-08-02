import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { notificationApi } from '../../api/notificationApi';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatDate } from '../../utils/formatDate';
import { getNotificationAction } from '../../utils/notificationActions';
import type { Notification } from '../../types/notification';
import { useAuth } from '../../hooks/useAuth';
import { notifyNotificationsChanged } from '../../hooks/useNotifications';

export function NotificationDetailsPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [notification, setNotification] = useState<Notification | null>(null);
  useEffect(() => {
    notificationApi.get(id).then(async (item) => {
      setNotification(item);
      if (!item.isRead) {
        const updated = await notificationApi.read(item._id);
        setNotification({ ...item, ...updated, relatedRequest: item.relatedRequest, relatedAccountRequest: item.relatedAccountRequest });
        notifyNotificationsChanged();
      }
    });
  }, [id]);
  if (!notification) return null;
  const action = getNotificationAction(notification, user?.activeRole);
  return (
    <div className="space-y-5">
      <Card>
        <p className="text-sm text-slate-500">{formatDate(notification.createdAt)}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{notification.title}</h1>
        <p className="mt-3 text-slate-700">{notification.message}</p>
        {action && (
          <Link to={action.to}>
            <Button className="mt-5">{action.label}</Button>
          </Link>
        )}
      </Card>
    </div>
  );
}

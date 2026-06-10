import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { notificationApi } from '../../api/notificationApi';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatDate } from '../../utils/formatDate';
import { getNotificationAction } from '../../utils/notificationActions';
import type { Notification } from '../../types/notification';

export function NotificationDetailsPage() {
  const { id = '' } = useParams();
  const [notification, setNotification] = useState<Notification | null>(null);
  useEffect(() => {
    notificationApi.get(id).then(async (item) => {
      setNotification(item);
      if (!item.isRead) await notificationApi.read(item._id);
    });
  }, [id]);
  if (!notification) return null;
  const action = getNotificationAction(notification);
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

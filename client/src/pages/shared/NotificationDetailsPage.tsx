import { PageHeader } from '../../components/layout/PageHeader';
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
  const action = getNotificationAction(notification, user?.activeRole, user?.approvalRoles);
  return (
    <div className="space-y-5">
      <Card>
        <PageHeader title={notification.title} eyebrow={formatDate(notification.createdAt)} />
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

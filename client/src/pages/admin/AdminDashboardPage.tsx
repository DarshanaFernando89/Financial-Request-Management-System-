import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { StatusCard } from '../../components/ui/StatusCard';

export function AdminDashboardPage() {
  const [data, setData] = useState<any>({});
  const navigate = useNavigate();
  useEffect(() => {
    adminApi.dashboard().then(setData).catch(() => setData({}));
  }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard title="Users" value={data.users || 0} tone="blue" onClick={() => navigate('/admin/users')} />
        <StatusCard title="Requests" value={data.requests || 0} tone="gold" onClick={() => navigate('/admin/reports')} />
        <StatusCard title="Pending Payments" value={data.pendingPayments || 0} tone="green" onClick={() => navigate('/admin/reports?status=PAYMENT_PENDING')} />
      </div>
    </div>
  );
}

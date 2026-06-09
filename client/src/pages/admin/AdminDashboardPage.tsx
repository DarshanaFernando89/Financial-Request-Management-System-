import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { StatusCard } from '../../components/ui/StatusCard';

export function AdminDashboardPage() {
  const [data, setData] = useState<any>({});
  useEffect(() => {
    adminApi.dashboard().then(setData).catch(() => setData({}));
  }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard title="Users" value={data.users || 0} tone="blue" />
        <StatusCard title="Requests" value={data.requests || 0} tone="gold" />
        <StatusCard title="Account Requests" value={data.pendingAccountRequests || 0} tone="red" />
        <StatusCard title="Pending Payments" value={data.pendingPayments || 0} tone="green" />
      </div>
    </div>
  );
}

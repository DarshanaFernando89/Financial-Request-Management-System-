import { ArrowRight, Banknote, CheckCircle2, CircleAlert, Clock3, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { Card } from '../../components/ui/Card';
import { StatusCard } from '../../components/ui/StatusCard';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { statusLabel } from '../../utils/statusLabels';

type DashboardData = {
  users?: number;
  activeUsers?: number;
  requests?: number;
  pendingPayments?: number;
  statusCounts?: Array<{ _id: string; count: number; amount?: number }>;
  amountSummary?: {
    totalAmount: number;
    averageAmount: number;
    paidAmount: number;
    pendingPaymentAmount: number;
    approvedAmount: number;
  };
  monthlyTrend?: Array<{ _id: { year: number; month: number }; count: number; amount: number }>;
  requestTypeBreakdown?: Array<{ requestTypeId?: string; name: string; count: number; amount: number }>;
  recentRequests?: Array<any>;
};

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(year, month - 1, 1));
}

function BarList({
  items,
  valueLabel
}: {
  items: Array<{ label: string; value: number; secondary?: string }>;
  valueLabel: (value: number) => string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-slate-700">{item.label}</span>
            <span className="shrink-0 text-slate-500">{valueLabel(item.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-university-maroon"
              style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }}
            />
          </div>
          {item.secondary && <div className="text-xs text-slate-500">{item.secondary}</div>}
        </div>
      ))}
    </div>
  );
}

export function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData>({});
  const navigate = useNavigate();

  useEffect(() => {
    adminApi.dashboard().then(setData).catch(() => setData({}));
  }, []);

  const statusItems = useMemo(
    () =>
      (data.statusCounts || []).map((item) => ({
        label: statusLabel(item._id),
        value: item.count,
        secondary: formatCurrency(item.amount || 0)
      })),
    [data.statusCounts]
  );

  const trendItems = useMemo(
    () =>
      (data.monthlyTrend || []).map((item) => ({
        label: `${monthLabel(item._id.year, item._id.month)} ${item._id.year}`,
        value: item.count,
        secondary: formatCurrency(item.amount)
      })),
    [data.monthlyTrend]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">A quick view of requests, payments, and approval flow.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => navigate('/admin/reports')}
        >
          Open Reports <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          title="Users"
          value={data.users || 0}
          caption={`${data.activeUsers || 0} active accounts`}
          tone="blue"
          onClick={() => navigate('/admin/users')}
        />
        <StatusCard
          title="Requests"
          value={data.requests || 0}
          caption={`Total submitted claims`}
          tone="gold"
          onClick={() => navigate('/admin/reports')}
        />
        <StatusCard
          title="Pending Payments"
          value={data.pendingPayments || 0}
          caption={formatCurrency(data.amountSummary?.pendingPaymentAmount || 0)}
          tone="green"
          onClick={() => navigate('/admin/reports?status=PAYMENT_PENDING')}
        />
        <StatusCard
          title="Average Claim"
          value={formatCurrency(data.amountSummary?.averageAmount || 0)}
          caption={`Approved total ${formatCurrency(data.amountSummary?.approvedAmount || 0)}`}
          tone="gray"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Request Trend</h2>
              <p className="text-sm text-slate-500">Last six months of activity</p>
            </div>
            <Badge tone="blue">{trendItems.length} periods</Badge>
          </div>
          <BarList items={trendItems} valueLabel={(value) => `${value} requests`} />
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Financial Snapshot</h2>
              <p className="text-sm text-slate-500">Amount distribution across request states</p>
            </div>
            <Banknote size={18} className="text-university-maroon" />
          </div>
          <div className="space-y-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Value</div>
              <div className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(data.amountSummary?.totalAmount || 0)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-green-200 bg-green-50 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-green-700">
                  <CheckCircle2 size={14} /> Paid
                </div>
                <div className="mt-1 text-base font-bold text-slate-900">{formatCurrency(data.amountSummary?.paidAmount || 0)}</div>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  <Clock3 size={14} /> Pending
                </div>
                <div className="mt-1 text-base font-bold text-slate-900">{formatCurrency(data.amountSummary?.pendingPaymentAmount || 0)}</div>
              </div>
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                <CircleAlert size={14} /> Status variety
              </div>
              <div className="mt-1 text-base font-bold text-slate-900">{data.statusCounts?.length || 0} states tracked</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Status Breakdown</h2>
            <p className="text-sm text-slate-500">Request volume by current state</p>
          </div>
          <BarList items={statusItems} valueLabel={(value) => `${value} requests`} />
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Top Request Types</h2>
            <p className="text-sm text-slate-500">Most used types and total value</p>
          </div>
          <BarList
            items={(data.requestTypeBreakdown || []).map((item) => ({
              label: item.name,
              value: item.count,
              secondary: formatCurrency(item.amount)
            }))}
            valueLabel={(value) => `${value} requests`}
          />
        </Card>
      </div>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Recent Transactions</h2>
          <p className="text-sm text-slate-500">Latest requests moving through the system</p>
        </div>
        <Table
          rows={data.recentRequests || []}
          columns={[
            { key: 'requestId', header: 'Request', render: (row) => row.requestId },
            { key: 'title', header: 'Title', render: (row) => row.title },
            { key: 'requestType', header: 'Type', render: (row) => row.requestType?.name || '-' },
            { key: 'amount', header: 'Amount', render: (row) => formatCurrency(row.amount, row.currency) },
            { key: 'status', header: 'Status', render: (row) => <Badge tone={row.status === 'PAID' ? 'green' : row.status === 'PAYMENT_PENDING' ? 'gold' : 'blue'}>{statusLabel(row.status)}</Badge> },
            { key: 'date', header: 'Created', render: (row) => formatDate(row.createdAt) },
            { key: 'requester', header: 'Requester', render: (row) => row.requester?.nameWithInitials || '-' },
            { key: 'action', header: '', render: (row) => <button className="text-sm font-semibold text-university-maroon hover:underline" onClick={() => navigate(`/requests/${row._id}`)}>View</button> }
          ]}
        />
      </Card>
    </div>
  );
}

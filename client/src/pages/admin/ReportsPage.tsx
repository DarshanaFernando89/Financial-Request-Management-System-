import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { reportApi } from '../../api/reportApi';
import { ReportFilters } from '../../components/admin/ReportFilters';
import { RequestTable } from '../../components/request/RequestTable';
import { Button } from '../../components/ui/Button';
import { StatusCard } from '../../components/ui/StatusCard';
import type { SummaryReport } from '../../types/report';

export function ReportsPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  useEffect(() => {
    reportApi.summary(filters).then(setSummary).catch(() => setSummary(null));
  }, [filters]);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
      <ReportFilters onApply={setFilters} />
      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard title="Total Claims" value={summary?.totalAmount?.count || 0} tone="blue" />
        <StatusCard title="Total Amount" value={`LKR ${(summary?.totalAmount?.amount || 0).toLocaleString()}`} tone="gold" />
        <StatusCard title="Statuses" value={summary?.statusCounts?.length || 0} tone="green" />
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          icon={<Download size={16} />}
          onClick={() => void reportApi.exportFile('excel', filters)}
        >
          Export Excel
        </Button>
      </div>
      <RequestTable requests={summary?.recentRequests || []} />
    </div>
  );
}

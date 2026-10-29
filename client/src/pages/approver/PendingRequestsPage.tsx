import { PageHeader } from '../../components/layout/PageHeader';
import { approvalApi } from '../../api/approvalApi';
import { RequestTable } from '../../components/request/RequestTable';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';

export function PendingRequestsPage() {
  const { data, loading, error, retry } = useDashboardData(approvalApi.pending, 30000);
  return (
    <div className="space-y-5">
      <PageHeader title="Pending Requests" />
      {loading ? <p>Loading requests…</p> : error
        ? <Toast tone="red" message={error} action={<Button variant="outline" onClick={retry}>Try again</Button>} />
        : <RequestTable requests={data || []} reviewBase="/approvals/review" />}
    </div>
  );
}

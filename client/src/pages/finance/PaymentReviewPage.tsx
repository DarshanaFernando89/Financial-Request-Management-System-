import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { financeApi } from '../../api/financeApi';
import { ApprovalHistoryTable } from '../../components/request/ApprovalHistoryTable';
import { DocumentList } from '../../components/request/DocumentList';
import { RequestDetailsCard } from '../../components/request/RequestDetailsCard';
import { RequestTimeline } from '../../components/request/RequestTimeline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DateInput } from '../../components/ui/DateInput';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Textarea } from '../../components/ui/Textarea';
import type { FinancialRequest } from '../../types/request';

export function PaymentReviewPage() {
  const { id = '' } = useParams();
  const [request, setRequest] = useState<FinancialRequest | null>(null);
  const [form, setForm] = useState({ paidAt: new Date().toISOString().slice(0, 10), referenceNo: '', remarks: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    financeApi
      .get(id)
      .then(setRequest)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function markPaid(event: FormEvent) {
    event.preventDefault();
    if (!request) return;
    setError('');
    try {
      await financeApi.markPaid(request._id, {
        ...form,
        amount: request.amount
      });
      navigate('/finance/payment-history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment action failed.');
    }
  }

  async function sideAction(kind: 'info' | 'reject') {
    if (!request) return;
    try {
      if (kind === 'info') await financeApi.requestInfo(request._id, form.remarks);
      else await financeApi.reject(request._id, form.remarks);
      navigate('/finance/pending-payments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    }
  }

  if (loading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
  if (!request) return <p className="text-sm font-semibold text-red-600">{error || 'Request not found.'}</p>;

  return (
    <div className="space-y-5">
      <RequestDetailsCard request={request} />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 font-semibold text-slate-900">Documents</h2>
            <DocumentList documents={request.documents} />
          </Card>
          <Card>
            <h2 className="mb-4 font-semibold text-slate-900">Approval History</h2>
            <ApprovalHistoryTable history={request.approvalHistory} />
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 font-semibold text-slate-900">Timeline</h2>
            <RequestTimeline steps={request.workflowSteps} />
          </Card>
          <Card>
            <form className="space-y-3" onSubmit={(event) => void markPaid(event)}>
              <DateInput label="Payment date" required value={form.paidAt} onChange={(event) => setForm({ ...form, paidAt: event.target.value })} />
              <Input label="Payment reference number" required value={form.referenceNo} onChange={(event) => setForm({ ...form, referenceNo: event.target.value })} />
              <Textarea label="Remarks" value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />
              {error && <p className="text-sm font-medium text-red-600">{error}</p>}
              <div className="grid gap-2">
                <Button type="submit" icon={<CheckCircle2 size={16} />}>Mark as Paid</Button>
                <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={() => void sideAction('info')}>Request More Info</Button>
                <Button variant="danger" icon={<XCircle size={16} />} onClick={() => void sideAction('reject')}>Reject</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

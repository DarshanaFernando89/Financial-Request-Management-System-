import { RefreshCcw, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import { ApprovalHistoryTable } from '../../components/request/ApprovalHistoryTable';
import { ClarificationPanel } from '../../components/request/ClarificationPanel';
import { DocumentList } from '../../components/request/DocumentList';
import { PaymentSummaryCard } from '../../components/request/PaymentSummaryCard';
import { RequestDetailsCard } from '../../components/request/RequestDetailsCard';
import { RequestTimeline } from '../../components/request/RequestTimeline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import type { FinancialRequest } from '../../types/request';

export function RequestDetailsPage() {
  const { id = '' } = useParams();
  const [request, setRequest] = useState<FinancialRequest | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      setRequest(await requestApi.get(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load request.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  if (loading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
  if (error || !request) return <p className="text-sm font-semibold text-red-600">{error || 'Request not found.'}</p>;

  const currentRequest = request;
  const isRequester = typeof currentRequest.requester === 'string' ? currentRequest.requester === user?._id : currentRequest.requester?._id === user?._id;

  async function submitDraft() {
    await requestApi.submit(currentRequest._id);
    await load();
  }

  async function resubmit() {
    await requestApi.resubmit(currentRequest._id, {
      title: currentRequest.title,
      description: currentRequest.description,
      amount: currentRequest.amount,
      requestData: currentRequest.requestData
    });
    await load();
  }

  return (
    <div className="space-y-5">
      <RequestDetailsCard request={request} />
      {isRequester && request.status === 'DRAFT' && (
        <Card className="flex justify-end">
          <Button icon={<Send size={16} />} onClick={() => void submitDraft()}>Submit Request</Button>
        </Card>
      )}
      {isRequester && request.status === 'REJECTED' && (
        <Card className="flex justify-end">
          <Button icon={<RefreshCcw size={16} />} onClick={() => void resubmit()}>Edit and Resubmit</Button>
        </Card>
      )}
      {isRequester && request.status === 'INFO_REQUESTED' && (
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">Clarification Response</h2>
          <ClarificationPanel requestId={request._id} onDone={() => void load()} />
        </Card>
      )}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 font-semibold text-slate-900">Request Data</h2>
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              {Object.entries(request.requestData || {}).map(([key, value]) => (
                <div key={key} className="rounded-md bg-slate-50 p-3">
                  <dt className="font-semibold capitalize text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</dt>
                  <dd className="mt-1 text-slate-900">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </Card>
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
          {request.payment && <PaymentSummaryCard request={request} />}
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
      </div>
    </div>
  );
}

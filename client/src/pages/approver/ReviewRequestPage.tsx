import { CheckCircle2, RotateCcw, Send, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { approvalApi } from '../../api/approvalApi';
import { requestApi } from '../../api/requestApi';
import { ApprovalHistoryTable } from '../../components/request/ApprovalHistoryTable';
import { DocumentList } from '../../components/request/DocumentList';
import { RequestDetailsCard } from '../../components/request/RequestDetailsCard';
import { RequestDataCard } from '../../components/request/RequestDataCard';
import { RequestTimeline } from '../../components/request/RequestTimeline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Textarea } from '../../components/ui/Textarea';
import type { FinancialRequest } from '../../types/request';

export function ReviewRequestPage() {
  const { id = '' } = useParams();
  const [request, setRequest] = useState<FinancialRequest | null>(null);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
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

  async function action(kind: 'approve' | 'verify' | 'info' | 'reject') {
    if (!request) return;
    setError('');
    try {
      if (kind === 'approve') await approvalApi.approve(request._id, remarks);
      if (kind === 'verify') await approvalApi.verifyForward(request._id, remarks);
      if (kind === 'info') await approvalApi.requestInfo(request._id, remarks);
      if (kind === 'reject') await approvalApi.reject(request._id, remarks);
      navigate('/approvals/pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    }
  }

  if (loading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
  if (!request) return <p className="text-sm font-semibold text-red-600">{error || 'Request not found.'}</p>;

  const currentStep = request.workflowSteps.find((step) => step.stepIndex === request.currentStepIndex);
  const isVerification = currentStep?.stepType === 'VERIFICATION';

  return (
    <div className="space-y-5">
      <RequestDetailsCard request={request} />
      <RequestDataCard request={request} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
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
          <Card className="space-y-3">
            <Textarea label="Remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <div className="grid gap-2">
              {isVerification ? (
                <Button icon={<Send size={16} />} onClick={() => void action('verify')}>Verify & Forward</Button>
              ) : (
                <Button icon={<CheckCircle2 size={16} />} onClick={() => void action('approve')}>Approve</Button>
              )}
              <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={() => void action('info')}>Request More Info</Button>
              <Button variant="danger" icon={<XCircle size={16} />} onClick={() => void action('reject')}>Reject</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

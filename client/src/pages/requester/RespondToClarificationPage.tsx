import { Navigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ClarificationPanel } from '../../components/request/ClarificationPanel';

export function RespondToClarificationPage() {
  const { id } = useParams();
  if (!id) return <Navigate to="/requests/my" replace />;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Clarification Response</h1>
      <Card>
        <ClarificationPanel requestId={id} onDone={() => window.history.back()} />
      </Card>
    </div>
  );
}

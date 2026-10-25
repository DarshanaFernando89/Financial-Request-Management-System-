import { PageHeader } from '../../components/layout/PageHeader';
import { Navigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ClarificationPanel } from '../../components/request/ClarificationPanel';

export function RespondToClarificationPage() {
  const { id } = useParams();
  if (!id) return <Navigate to="/requests/my" replace />;
  return (
    <div className="space-y-5">
      <PageHeader title="Clarification Response" />
      <Card>
        <ClarificationPanel requestId={id} onDone={() => window.history.back()} />
      </Card>
    </div>
  );
}

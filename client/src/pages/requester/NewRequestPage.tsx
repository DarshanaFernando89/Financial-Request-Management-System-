import { PageHeader } from '../../components/layout/PageHeader';
import { RequestForm } from '../../components/request/RequestForm';

export function NewRequestPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="New Request" description="Submit a financial or examination-related claim" />
      <RequestForm />
    </div>
  );
}

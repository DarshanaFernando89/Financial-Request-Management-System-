import { RequestForm } from '../../components/request/RequestForm';

export function NewRequestPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Request</h1>
        <p className="text-sm text-slate-500">Submit a financial or examination-related claim</p>
      </div>
      <RequestForm />
    </div>
  );
}

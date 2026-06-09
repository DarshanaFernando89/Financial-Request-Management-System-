import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { RequestTypeForm } from '../../components/admin/RequestTypeForm';

export function CreateRequestTypePage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Create Request Type</h1>
      <RequestTypeForm onSubmit={async (payload) => {
        await adminApi.createRequestType(payload);
        navigate('/admin/request-types');
      }} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { RequestTypeForm } from '../../components/admin/RequestTypeForm';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { RequestType } from '../../types/request';

export function EditRequestTypePage() {
  const { id = '' } = useParams();
  const [types, setTypes] = useState<RequestType[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    adminApi.requestTypes().then(setTypes);
  }, []);
  const type = types.find((item) => item._id === id);
  if (!type) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Edit Request Type</h1>
      <RequestTypeForm initial={type} onSubmit={async (payload) => {
        await adminApi.updateRequestType(id, payload);
        navigate('/admin/request-types');
      }} />
    </div>
  );
}

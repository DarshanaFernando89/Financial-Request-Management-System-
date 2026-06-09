import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { RuleForm } from '../../components/admin/RuleForm';
import type { RequestType } from '../../types/request';

export function CreateApprovalRulePage() {
  const [types, setTypes] = useState<RequestType[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    adminApi.requestTypes().then(setTypes);
  }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Create Approval Rule</h1>
      <RuleForm requestTypes={types} onSubmit={async (payload) => {
        await adminApi.createRule(payload);
        navigate('/admin/approval-rules');
      }} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { RuleForm } from '../../components/admin/RuleForm';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { ApprovalRule } from '../../types/rule';
import type { RequestType } from '../../types/request';

export function EditApprovalRulePage() {
  const { id = '' } = useParams();
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [types, setTypes] = useState<RequestType[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    void Promise.all([adminApi.rules(), adminApi.requestTypes()]).then(([nextRules, nextTypes]) => {
      setRules(nextRules);
      setTypes(nextTypes);
    });
  }, []);
  const rule = rules.find((item) => item._id === id);
  if (!rule) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Edit Approval Rule</h1>
      <RuleForm initial={rule} requestTypes={types} onSubmit={async (payload) => {
        await adminApi.updateRule(id, payload);
        navigate('/admin/approval-rules');
      }} />
    </div>
  );
}

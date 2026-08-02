import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { RuleWithTypeForm } from '../../components/admin/RuleWithTypeForm';
import type { RequestType } from '../../types/request';

export function CreateApprovalRulePage() {
  const [types, setTypes] = useState<RequestType[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    adminApi.requestTypes().then(setTypes);
  }, []);

  function buildRequestTypeCode(name: string, existingCodes: string[]) {
    const base = name
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'REQUEST_TYPE';
    const codes = new Set(existingCodes);
    if (!codes.has(base)) return base;
    let suffix = 2;
    while (codes.has(`${base}_${suffix}`)) suffix += 1;
    return `${base}_${suffix}`;
  }

  async function ensureRequestType(name: string, description: string, requiredDocuments: string) {
    const currentTypes = await adminApi.requestTypes();
    setTypes(currentTypes);
    const existing = currentTypes.find((type) => type.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (existing) return existing;
    return adminApi.createRequestType({
      name,
      code: buildRequestTypeCode(name, currentTypes.map((type) => type.code)),
      description: description || undefined,
      requiredDocuments: requiredDocuments
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      fields: [],
      isActive: true
    });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Create Approval Rule</h1>
      <p className="text-sm text-slate-500">The request type will use the same name as the rule.</p>
      <RuleWithTypeForm onSubmit={async (payload) => {
        const requestType = await ensureRequestType(payload.name, payload.description, payload.requiredDocuments);
        await adminApi.createRule({
          name: payload.name,
          requestTypes: [requestType._id],
          minAmount: payload.minAmount,
          maxAmount: payload.maxAmount,
          workflowRoles: payload.workflowRoles,
          priority: payload.priority,
          isActive: true
        });
        navigate('/admin/approval-rules');
      }} />
    </div>
  );
}

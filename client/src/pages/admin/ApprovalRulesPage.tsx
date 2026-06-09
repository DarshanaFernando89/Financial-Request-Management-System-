import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { roleLabel } from '../../utils/roleLabels';
import type { ApprovalRule } from '../../types/rule';

export function ApprovalRulesPage() {
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  useEffect(() => {
    adminApi.rules().then(setRules);
  }, []);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Approval Rules</h1>
        <Link to="/admin/approval-rules/create"><Button icon={<Plus size={16} />}>Create Rule</Button></Link>
      </div>
      <Table
        rows={rules}
        columns={[
          { key: 'name', header: 'Rule', render: (row) => <Link className="font-semibold text-university-maroon" to={`/admin/approval-rules/${row._id}/edit`}>{row.name}</Link> },
          { key: 'range', header: 'Amount Range', render: (row) => `${row.minAmount} - ${row.maxAmount ?? 'No upper limit'}` },
          { key: 'types', header: 'Request Types', render: (row) => row.requestTypes?.map((type) => type.name).join(', ') },
          { key: 'roles', header: 'Workflow', render: (row) => row.workflowRoles.map(roleLabel).join(' -> ') },
          { key: 'status', header: 'Status', render: (row) => <Badge tone={row.isActive ? 'green' : 'gray'}>{row.isActive ? 'Active' : 'Inactive'}</Badge> }
        ]}
      />
    </div>
  );
}

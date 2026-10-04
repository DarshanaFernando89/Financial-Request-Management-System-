import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { availableWorkflowRoles, type WorkflowRoleOption } from '../utils/workflowRoles';
import { roleLabel } from '../utils/roleLabels';

export function useWorkflowRoles() {
  const [roles, setRoles] = useState<WorkflowRoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    adminApi.roles()
      .then((items) => { if (active) setRoles(availableWorkflowRoles(items)); })
      .catch(() => { if (active) setError('Unable to load workflow roles. Reopen this page to try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const label = (code: string) => roles.find((role) => role.code === code)?.displayName || roleLabel(code) || 'Unavailable role';
  return { roles, loading, error, label };
}

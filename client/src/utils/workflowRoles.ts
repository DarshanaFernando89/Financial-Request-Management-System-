export type WorkflowRoleOption = { code: string; displayName: string; isActive: boolean };

export function availableWorkflowRoles(roles: WorkflowRoleOption[]) {
  const excluded = new Set(['LECTURER', 'FINANCE_OFFICER', 'ADMIN', 'REQUESTER']);
  return roles.filter((role) => role.isActive && !excluded.has(role.code));
}

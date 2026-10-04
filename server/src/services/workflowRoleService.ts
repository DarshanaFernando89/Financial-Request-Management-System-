import { CustomRoleModel } from '../models/CustomRole.js';
import { APPROVER_ROLES, RETIRED_ROLE_CODES, ROLE_VALUES, ROLES } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';

export async function availableWorkflowRoleCodes() {
  const catalog = await CustomRoleModel.find();
  const disabled = new Set(catalog.filter((role) => !role.isActive).map((role) => role.code));
  const system = APPROVER_ROLES.filter((code) => !disabled.has(code));
  const custom = catalog.filter((role) => role.isActive && !ROLE_VALUES.includes(role.code as any) && !RETIRED_ROLE_CODES.includes(role.code));
  return [...system, ...custom.map((role) => role.code)];
}

export function assertAvailableWorkflowRoles(roles: unknown, available: string[], statusCode = 400) {
  if (!Array.isArray(roles) || !roles.length) throw new ApiError(statusCode, 'At least one workflow role is required.');
  if (roles.includes(ROLES.FINANCE_OFFICER)) throw new ApiError(statusCode, 'Finance Officer cannot be configured as a normal approval step.');
  if (roles.some((role) => typeof role !== 'string' || !available.includes(role))) {
    throw new ApiError(statusCode, 'The workflow contains an unavailable role. Select active roles from Role Management.');
  }
  if (new Set(roles).size !== roles.length) throw new ApiError(statusCode, 'Workflow roles must not be repeated.');
}

export async function validateWorkflowRoleFields(body: { workflowRoles?: unknown; approvingAuthorityRole?: unknown }, statusCode = 400) {
  const available = await availableWorkflowRoleCodes();
  if (body.workflowRoles !== undefined) assertAvailableWorkflowRoles(body.workflowRoles, available, statusCode);
  if (body.approvingAuthorityRole) assertAvailableWorkflowRoles([body.approvingAuthorityRole], available, statusCode);
  return available;
}

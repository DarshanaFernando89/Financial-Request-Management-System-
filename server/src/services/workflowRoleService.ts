import { ROLES } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { getRoleCatalog, roleCatalogMetadata } from './roleCatalogService.js';

export async function availableWorkflowRoleCodes() {
  return roleCatalogMetadata(await getRoleCatalog()).approvalRoles;
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

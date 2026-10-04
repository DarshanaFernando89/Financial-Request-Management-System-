import { CustomRoleModel } from '../models/CustomRole.js';
import { RETIRED_ROLE_CODES, ROLE_LABELS, ROLE_VALUES, ROLES, sanitizeAssignedRoles } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';

export type RoleCatalogItem = { code: string; displayName: string; isActive: boolean };

export function resolveRoleCatalog(custom: RoleCatalogItem[]) {
  const overrides = new Map(custom.map((role) => [role.code, role]));
  const system = ROLE_VALUES.filter((code) => code === ROLES.ADMIN || overrides.get(code)?.isActive !== false)
    .map((code) => ({ code, displayName: overrides.get(code)?.displayName || ROLE_LABELS[code], isActive: true }));
  return [...system, ...custom.filter((role) => role.isActive && !ROLE_VALUES.includes(role.code as any) && !RETIRED_ROLE_CODES.includes(role.code))];
}

export async function getRoleCatalog() {
  return resolveRoleCatalog(await CustomRoleModel.find());
}

export function roleCatalogMetadata(catalog: RoleCatalogItem[]) {
  return {
    roleLabels: Object.fromEntries(catalog.map((role) => [role.code, role.displayName])),
    approvalRoles: catalog.filter((role) => ![ROLES.LECTURER, ROLES.FINANCE_OFFICER, ROLES.ADMIN].includes(role.code as any)).map((role) => role.code)
  };
}

export function rolesFromCatalog(roles: string[] | undefined, catalog: RoleCatalogItem[]) {
  return sanitizeAssignedRoles(roles, catalog.map((role) => role.code));
}

export function validateAssignedRoles(roles: unknown, catalog: RoleCatalogItem[]) {
  if (!Array.isArray(roles) || !roles.length) throw new ApiError(400, 'At least one available role is required.');
  const assigned = rolesFromCatalog(roles, catalog);
  if (roles.some((role) => !assigned.includes(role))) throw new ApiError(400, 'Select active roles from Role Management.');
  return assigned;
}

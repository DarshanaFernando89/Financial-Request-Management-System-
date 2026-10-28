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
  // Older accounts may store several assignments. Keep their first non-retired
  // assignment, even if it is inactive, so disabling it never grants another role.
  const primary = roles?.map(String).find((role) => !RETIRED_ROLE_CODES.includes(role));
  return sanitizeAssignedRoles(primary ? [primary] : [], catalog.map((role) => role.code));
}

// Match the same primary assignment in database filters, including legacy records.
export function primaryRoleFilter(role: string) {
  return { $expr: { $eq: [{ $arrayElemAt: [{ $filter: {
    input: '$roles', as: 'role', cond: { $not: [{ $in: ['$$role', RETIRED_ROLE_CODES] }] }
  } }, 0] }, role] } };
}

export function validateAssignedRoles(roles: unknown, catalog: RoleCatalogItem[]) {
  if (!Array.isArray(roles) || roles.length !== 1) {
    throw new ApiError(400, 'Each account must have exactly one role. Create a separate account for another role.');
  }
  const assigned = rolesFromCatalog(roles, catalog);
  if (roles.some((role) => !assigned.includes(role))) throw new ApiError(400, 'Select active roles from Role Management.');
  return assigned;
}

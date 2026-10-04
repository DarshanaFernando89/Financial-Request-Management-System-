import { ROLES, sanitizeAssignedRoles } from './constants.js';

export function rolesAfterRemovingRequester(roles: string[]) {
  const supported = sanitizeAssignedRoles(roles);
  // Requester-only accounts retain submission access using the approved replacement.
  return supported.length || !roles.includes('REQUESTER') ? supported : [ROLES.LECTURER];
}

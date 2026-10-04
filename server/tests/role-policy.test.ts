import { describe, expect, it } from 'vitest';
import { ROLE_VALUES, sanitizeAssignedRoles } from '../src/utils/constants.js';
import { rolesAfterRemovingRequester } from '../src/utils/retiredRoleMigration.js';
import { canSubmit } from '../src/utils/permissions.js';
import { UserModel } from '../src/models/User.js';
import { RequestModel } from '../src/models/Request.js';
import { ROLES as clientRoles, visibleAssignedRoles } from '../../client/src/utils/constants.ts';
import { roleLabel } from '../../client/src/utils/roleLabels.ts';

describe('available roles across the app', () => {
  it.each([
    { stored: ['REQUESTER', 'LECTURER'], expected: ['LECTURER'] },
    { stored: ['DEAN', 'LECTURER', 'REQUESTER'], expected: ['DEAN', 'LECTURER'] },
    { stored: ['REQUESTER', 'LECTURER', 'HOD'], expected: ['LECTURER', 'HOD'] },
    { stored: ['REQUESTER'], expected: [] },
    { stored: ['LECTURER', 'LECTURER', 'REMOVED_ROLE'], expected: ['LECTURER'] }
  ])('uses the same role policy for UI and API: $stored', ({ stored, expected }) => {
    expect(sanitizeAssignedRoles(stored)).toEqual(expected);
    expect(visibleAssignedRoles(stored)).toEqual(expected);
  });

  it('does not offer, label, or authorize the removed role', () => {
    expect(clientRoles).toEqual(ROLE_VALUES);
    expect(ROLE_VALUES).not.toContain('REQUESTER');
    expect(roleLabel('REQUESTER')).toBe('');
    expect(canSubmit('REQUESTER')).toBe(false);
    expect(canSubmit('LECTURER')).toBe(true);
  });

  it('removes legacy roles from serialized users without deleting stored history', () => {
    const user = new UserModel({ roles: ['REQUESTER', 'LECTURER'] });
    expect(user.toJSON().roles).toEqual(['LECTURER']);
    expect([...user.roles]).toEqual(['REQUESTER', 'LECTURER']);
    const legacy = new RequestModel({
      requestId: 'legacy', requester: '507f1f77bcf86cd799439011', requestType: '507f1f77bcf86cd799439012',
      title: 'Historical claim', amount: 100, approvalHistory: [{ role: 'REQUESTER', action: 'CREATE_DRAFT' }]
    });
    expect(legacy.validateSync()).toBeUndefined();
  });
});

describe('approved account migration', () => {
  it.each([
    { before: ['REQUESTER'], after: ['LECTURER'] },
    { before: ['REQUESTER', 'DEPARTMENT_COORDINATOR'], after: ['LECTURER'] },
    { before: ['DEAN', 'LECTURER', 'REQUESTER'], after: ['DEAN', 'LECTURER'] },
    { before: ['REQUESTER', 'HOD'], after: ['HOD'] },
    { before: ['LECTURER'], after: ['LECTURER'] },
    { before: [], after: [] },
    { before: ['REMOVED_ROLE'], after: [] }
  ])('preserves supported assignments and uses the approved replacement: $before', ({ before, after }) => {
    const migrated = rolesAfterRemovingRequester(before);
    expect(migrated).toEqual(after);
    expect(rolesAfterRemovingRequester(migrated)).toEqual(after);
  });
});

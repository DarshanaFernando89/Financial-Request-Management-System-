import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_REQUEST_EMAIL_MESSAGE,
  getAccountRequestValidationError,
  normalizeAccountRequestPayload
} from '../src/utils/accountRequestValidation.js';
import { ROLES, STAFF_CATEGORIES } from '../src/utils/constants.js';

describe('account request validation', () => {
  it('normalizes and accepts official University of Ruhuna emails', () => {
    const payload = normalizeAccountRequestPayload({
      fullName: '  Test User ',
      nameWithInitials: ' T. User ',
      email: ' TEST.USER@UOR.LK ',
      staffCategory: STAFF_CATEGORIES.NON_ACADEMIC,
      department: ' Department ',
      faculty: ' Faculty ',
      requestedRole: ROLES.REQUESTER
    });

    expect(payload.email).toBe('test.user@uor.lk');
    expect(payload.fullName).toBe('Test User');
    expect(payload.nameWithInitials).toBe('T. User');
    expect(getAccountRequestValidationError(payload)).toBeUndefined();
  });

  it('rejects non-university account request emails', () => {
    const payload = normalizeAccountRequestPayload({
      fullName: 'Test User',
      nameWithInitials: 'T. User',
      email: 'test.user@example.com',
      staffCategory: STAFF_CATEGORIES.NON_ACADEMIC,
      department: 'Department',
      faculty: 'Faculty',
      requestedRole: ROLES.REQUESTER
    });

    expect(getAccountRequestValidationError(payload)).toBe(ACCOUNT_REQUEST_EMAIL_MESSAGE);
  });
});

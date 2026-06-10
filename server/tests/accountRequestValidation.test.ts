import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_REQUEST_EMAIL_MESSAGE,
  getAccountRequestValidationError,
  normalizeAccountRequestPayload
} from '../src/utils/accountRequestValidation.js';
import { ROLES } from '../src/utils/constants.js';

describe('account request validation', () => {
  it('normalizes and accepts official University of Ruhuna emails', () => {
    const payload = normalizeAccountRequestPayload({
      fullName: '  Test User ',
      email: ' TEST.USER@UOR.LK ',
      department: ' Department ',
      faculty: ' Faculty ',
      requestedRole: ROLES.REQUESTER
    });

    expect(payload.email).toBe('test.user@uor.lk');
    expect(payload.fullName).toBe('Test User');
    expect(getAccountRequestValidationError(payload)).toBeUndefined();
  });

  it('rejects non-university account request emails', () => {
    const payload = normalizeAccountRequestPayload({
      fullName: 'Test User',
      email: 'test.user@example.com',
      department: 'Department',
      faculty: 'Faculty',
      requestedRole: ROLES.REQUESTER
    });

    expect(getAccountRequestValidationError(payload)).toBe(ACCOUNT_REQUEST_EMAIL_MESSAGE);
  });
});

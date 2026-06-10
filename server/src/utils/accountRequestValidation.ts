import { ROLE_VALUES } from './constants.js';

export const ACCOUNT_REQUEST_EMAIL_DOMAIN = 'uor.lk';
export const ACCOUNT_REQUEST_EMAIL_MESSAGE = `Use your official University of Ruhuna email address ending in @${ACCOUNT_REQUEST_EMAIL_DOMAIN}.`;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AccountRequestInput = {
  fullName?: unknown;
  email?: unknown;
  department?: unknown;
  faculty?: unknown;
  requestedRole?: unknown;
  message?: unknown;
};

export type NormalizedAccountRequestInput = {
  fullName: string;
  email: string;
  department: string;
  faculty: string;
  requestedRole: string;
  message?: string;
};

function clean(value: unknown) {
  return String(value ?? '').trim();
}

export function normalizeAccountRequestPayload(input: AccountRequestInput): NormalizedAccountRequestInput {
  const message = clean(input.message);

  return {
    fullName: clean(input.fullName),
    email: clean(input.email).toLowerCase(),
    department: clean(input.department),
    faculty: clean(input.faculty),
    requestedRole: clean(input.requestedRole),
    ...(message ? { message } : {})
  };
}

export function isAccountRequestEmail(email: string) {
  return EMAIL_PATTERN.test(email) && email.endsWith(`@${ACCOUNT_REQUEST_EMAIL_DOMAIN}`);
}

export function getAccountRequestValidationError(payload: NormalizedAccountRequestInput) {
  if (!payload.fullName || !payload.email || !payload.department || !payload.faculty || !payload.requestedRole) {
    return 'Full name, email, department, faculty, and requested role are required.';
  }

  if (!isAccountRequestEmail(payload.email)) return ACCOUNT_REQUEST_EMAIL_MESSAGE;

  if (!ROLE_VALUES.includes(payload.requestedRole as any)) return 'Requested role is invalid.';

  return undefined;
}

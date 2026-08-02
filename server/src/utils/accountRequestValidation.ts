import { ROLE_VALUES, STAFF_CATEGORIES } from './constants.js';

export const ACCOUNT_REQUEST_EMAIL_DOMAIN = 'uor.lk';
export const ACCOUNT_REQUEST_EMAIL_MESSAGE = `Use your official University of Ruhuna email address ending in @${ACCOUNT_REQUEST_EMAIL_DOMAIN}.`;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AccountRequestInput = {
  fullName?: unknown;
  nameWithInitials?: unknown;
  email?: unknown;
  employeeNo?: unknown;
  indexNo?: unknown;
  staffCategory?: unknown;
  department?: unknown;
  faculty?: unknown;
  contactNo?: unknown;
  address?: unknown;
  requestedRole?: unknown;
  message?: unknown;
};

export type NormalizedAccountRequestInput = {
  fullName: string;
  nameWithInitials: string;
  email: string;
  employeeNo?: string;
  indexNo?: string;
  staffCategory: string;
  department: string;
  faculty: string;
  contactNo?: string;
  address?: string;
  requestedRole: string;
  message?: string;
};

function clean(value: unknown) {
  return String(value ?? '').trim();
}

export function normalizeAccountRequestPayload(input: AccountRequestInput): NormalizedAccountRequestInput {
  const message = clean(input.message);
  const employeeNo = clean(input.employeeNo);
  const indexNo = clean(input.indexNo);
  const contactNo = clean(input.contactNo);
  const address = clean(input.address);

  return {
    fullName: clean(input.fullName),
    nameWithInitials: clean(input.nameWithInitials),
    email: clean(input.email).toLowerCase(),
    ...(employeeNo ? { employeeNo } : {}),
    ...(indexNo ? { indexNo } : {}),
    staffCategory: clean(input.staffCategory),
    department: clean(input.department),
    faculty: clean(input.faculty),
    ...(contactNo ? { contactNo } : {}),
    ...(address ? { address } : {}),
    requestedRole: clean(input.requestedRole),
    ...(message ? { message } : {})
  };
}

export function isAccountRequestEmail(email: string) {
  return EMAIL_PATTERN.test(email) && email.endsWith(`@${ACCOUNT_REQUEST_EMAIL_DOMAIN}`);
}

export function getAccountRequestValidationError(payload: NormalizedAccountRequestInput) {
  if (!payload.fullName || !payload.nameWithInitials || !payload.email || !payload.staffCategory || !payload.department || !payload.faculty || !payload.requestedRole) {
    return 'Full name, name with initials, email, staff category, department, faculty, and requested role are required.';
  }

  if (!isAccountRequestEmail(payload.email)) return ACCOUNT_REQUEST_EMAIL_MESSAGE;

  if (!ROLE_VALUES.includes(payload.requestedRole as any)) return 'Requested role is invalid.';

  if (!Object.values(STAFF_CATEGORIES).includes(payload.staffCategory as any)) return 'Staff category is invalid.';

  return undefined;
}

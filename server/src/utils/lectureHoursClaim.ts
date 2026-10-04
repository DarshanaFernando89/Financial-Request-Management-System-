import { ApiError } from './ApiError.js';
import { REQUEST_STATUSES, REQUEST_TYPE_CODES } from './constants.js';

const requiredFields = ['batch', 'module', 'timeSlots'] as const;
type FieldDefinition = { name: string; type?: string; options?: string[] };

function normalize(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function isLectureHoursPayment(requestTypeCode?: string, requestTypeName?: string) {
  return requestTypeCode === REQUEST_TYPE_CODES.LECTURE_HOURS || normalize(requestTypeName) === 'lecture hours payment';
}

export function lectureHoursClaimKey(requestTypeCode: string | undefined, requestData: Record<string, unknown> = {}, requestTypeName?: string) {
  if (!isLectureHoursPayment(requestTypeCode, requestTypeName)) return undefined;
  const values = requiredFields.map((field) => normalize(requestData[field]));
  if (values.some((value) => !value)) {
    throw new ApiError(400, 'Batch, module, and time slots are required for a Lecture Hours Payment request.');
  }
  return values.join('|');
}

export function calculateLectureHours(timeSlots: unknown) {
  const value = String(timeSlots ?? '');
  const matches = [...value.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\s*(?:-|–|to)\s*([01]?\d|2[0-3]):([0-5]\d)\b/gi)];
  if (!matches.length) {
    throw new ApiError(400, 'Enter at least one time slot using the format 08:00-10:00.');
  }
  const minutes = matches.reduce((total, match) => {
    const start = Number(match[1]) * 60 + Number(match[2]);
    const end = Number(match[3]) * 60 + Number(match[4]);
    if (end <= start) throw new ApiError(400, 'Each time slot must end after it starts.');
    return total + end - start;
  }, 0);
  return Number((minutes / 60).toFixed(2));
}

export function prepareLectureHoursClaim(
  requestTypeCode: string | undefined,
  requestTypeName: string | undefined,
  fields: FieldDefinition[] | undefined,
  requestData: Record<string, unknown> = {}
) {
  if (!isLectureHoursPayment(requestTypeCode, requestTypeName)) return { requestData };
  lectureHoursClaimKey(requestTypeCode, requestData, requestTypeName);
  const normalizedData = { ...requestData };

  for (const fieldName of ['batch', 'module']) {
    const field = fields?.find((item) => item.name === fieldName);
    const value = String(requestData[fieldName] ?? '');
    if (field?.type !== 'select' || !field.options?.length) {
      throw new ApiError(422, `No ${fieldName === 'batch' ? 'batches' : 'modules'} have been configured. Please contact the administrator.`);
    }
    const configuredValue = field.options.find((option) => normalize(option) === normalize(value));
    if (!configuredValue) {
      throw new ApiError(422, `Select an available ${fieldName}.`);
    }
    normalizedData[fieldName] = configuredValue;
  }

  const lectureHours = calculateLectureHours(normalizedData.timeSlots);
  const ratePerHour = Number(normalizedData.ratePerHour);
  if (!Number.isFinite(ratePerHour) || ratePerHour <= 0) throw new ApiError(400, 'Rate per hour must be positive.');
  return { requestData: { ...normalizedData, lectureHours }, amount: Number((lectureHours * ratePerHour).toFixed(2)) };
}

export function isApprovedLectureHoursClaim(status: string) {
  return [REQUEST_STATUSES.APPROVED, REQUEST_STATUSES.PAYMENT_PENDING, REQUEST_STATUSES.PAID].includes(status as any);
}

export function duplicateLectureHoursClaimMessage(status: string) {
  return isApprovedLectureHoursClaim(status)
    ? 'Payment for these lecture hours has already been approved.'
    : 'You have already submitted a request for these lecture hours.';
}

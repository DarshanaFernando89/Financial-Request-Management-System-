import { ApiError } from './ApiError.js';
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS, REQUEST_TYPE_CODES } from './constants.js';

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
  if (Array.isArray(requestData.lectureTimeSlots) && requestData.lectureTimeSlots.length) {
    const slots = requestData.lectureTimeSlots.map((slot) => [
      normalize(slot?.batch ?? requestData.batch), normalize(slot?.module ?? requestData.module),
      normalize(slot?.date), normalize(slot?.startTime), normalize(slot?.endTime)
    ]).sort((a, b) => a[2].localeCompare(b[2]) || a[3].localeCompare(b[3]) || a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
    if (slots.some((slot) => slot.some((value) => !value))) {
      throw new ApiError(400, 'Batch, module, date, start time, and end time are required for every lecture time slot.');
    }
    const [first] = slots;
    if (slots.every((slot) => slot[0] === first[0] && slot[1] === first[1])) {
      return `${first[0]}|${first[1]}|${slots.map((slot) => `${slot[2]} ${slot[3]}-${slot[4]}`).join('; ')}`;
    }
    return `slots|${JSON.stringify(slots)}`;
  }
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

export function lectureHoursSlotKeys(requestData: Record<string, unknown> = {}) {
  const keys: string[] = [];
  function addSlot(date: unknown, batch: unknown, module: unknown, startTime: unknown, endTime: unknown) {
    function time(value: unknown) {
      const match = String(value ?? '').trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
      return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '';
    }
    const values = [normalize(date), normalize(batch), normalize(module), time(startTime), time(endTime)];
    if (values.every(Boolean)) keys.push(JSON.stringify(values));
  }
  if (Array.isArray(requestData.lectureTimeSlots)) {
    for (const slot of requestData.lectureTimeSlots) {
      if (!slot || typeof slot !== 'object') continue;
      addSlot(slot.date, slot.batch ?? requestData.batch, slot.module ?? requestData.module, slot.startTime, slot.endTime);
    }
  } else if (typeof requestData.timeSlots === 'string') {
    for (const entry of requestData.timeSlots.split(/[;\n]+/)) {
      const match = entry.trim().match(/^(.*?)\s+([01]?\d|2[0-3]):([0-5]\d)\s*(?:-|\u2013|to)\s*([01]?\d|2[0-3]):([0-5]\d)$/i);
      if (match) addSlot(match[1], requestData.batch, requestData.module, `${match[2]}:${match[3]}`, `${match[4]}:${match[5]}`);
    }
  }
  return [...new Set(keys)];
}

export function lectureHoursClaimsShareSlot(first: Record<string, unknown>, second: Record<string, unknown>) {
  const keys = new Set(lectureHoursSlotKeys(first));
  return lectureHoursSlotKeys(second).some((key) => keys.has(key));
}

function configuredLectureSelection(fieldName: 'batch' | 'module', value: unknown, fields: FieldDefinition[] | undefined) {
  const field = fields?.find((item) => item.name === fieldName);
  if (field?.type !== 'select' || !field.options?.length) {
    throw new ApiError(422, `No ${fieldName === 'batch' ? 'batches' : 'modules'} have been configured. Please contact the administrator.`);
  }
  const configuredValue = field.options.find((option) => normalize(option) === normalize(value));
  if (!configuredValue) throw new ApiError(422, `Select an available ${fieldName}.`);
  return configuredValue;
}

function prepareLectureTimeSlots(input: unknown, fields: FieldDefinition[] | undefined, legacyData: Record<string, unknown>) {
  if (!Array.isArray(input) || !input.length) throw new ApiError(400, 'Add at least one lecture time slot.');
  const slots = input.map((slot, index) => {
    if (!slot || typeof slot !== 'object') throw new ApiError(400, `Invalid lecture time slot ${index + 1}.`);
    const { date, startTime, endTime } = slot;
    const parsedDate = typeof date === 'string' ? new Date(`${date}T00:00:00Z`) : new Date(NaN);
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      throw new ApiError(400, `Select a valid date for slot ${index + 1}.`);
    }
    if (![startTime, endTime].every((time) => typeof time === 'string' && /^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/.test(time))) {
      throw new ApiError(400, `Select start and end times in 15-minute intervals for slot ${index + 1}.`);
    }
    const hours = calculateLectureHours(`${startTime}-${endTime}`);
    const ratePerHour = Number(slot.ratePerHour);
    if (!['string', 'number'].includes(typeof slot.ratePerHour) || !Number.isFinite(ratePerHour) || ratePerHour <= 0) {
      throw new ApiError(400, `Enter a positive rate per hour for slot ${index + 1}.`);
    }
    const amount = Number((hours * ratePerHour).toFixed(2));
    if (!Number.isFinite(amount)) throw new ApiError(400, `Invalid amount for slot ${index + 1}.`);
    const batch = configuredLectureSelection('batch', slot.batch ?? legacyData.batch, fields);
    const module = configuredLectureSelection('module', slot.module ?? legacyData.module, fields);
    return { date, batch, module, startTime, endTime, ratePerHour, hours, amount };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  for (let index = 1; index < slots.length; index++) {
    const slot = slots[index];
    const previous = slots[index - 1];
    if (slot.date === previous.date && slot.startTime < previous.endTime) {
      throw new ApiError(400, 'Lecture time slots on the same date must not overlap.');
    }
  }
  const amount = Number(slots.reduce((total, slot) => total + slot.amount, 0).toFixed(2));
  if (!Number.isFinite(amount)) throw new ApiError(400, 'Invalid total lecture claim amount.');
  return {
    slots,
    timeSlots: slots.map((slot) => `${slot.date} ${slot.startTime}-${slot.endTime}`).join('; '),
    lectureHours: slots.reduce((total, slot) => total + slot.hours, 0),
    amount
  };
}

export function prepareLectureHoursClaim(
  requestTypeCode: string | undefined,
  requestTypeName: string | undefined,
  fields: FieldDefinition[] | undefined,
  requestData: Record<string, unknown> = {}
) {
  if (!isLectureHoursPayment(requestTypeCode, requestTypeName)) return { requestData };
  const normalizedData = { ...requestData };
  const slotPayments = requestData.lectureTimeSlots === undefined ? undefined : prepareLectureTimeSlots(requestData.lectureTimeSlots, fields, requestData);
  if (slotPayments) {
    delete normalizedData.batch;
    delete normalizedData.module;
    delete normalizedData.ratePerHour;
    normalizedData.timeSlots = slotPayments.timeSlots;
    normalizedData.lectureTimeSlots = slotPayments.slots;
    lectureHoursClaimKey(requestTypeCode, normalizedData, requestTypeName);
    return {
      requestData: { ...normalizedData, lectureHours: slotPayments.lectureHours },
      amount: slotPayments.amount
    };
  }
  lectureHoursClaimKey(requestTypeCode, normalizedData, requestTypeName);
  for (const fieldName of ['batch', 'module'] as const) {
    normalizedData[fieldName] = configuredLectureSelection(fieldName, requestData[fieldName], fields);
  }
  const lectureHours = calculateLectureHours(normalizedData.timeSlots);
  const ratePerHour = Number(normalizedData.ratePerHour);
  if (!Number.isFinite(ratePerHour) || ratePerHour <= 0) throw new ApiError(400, 'Rate per hour must be positive.');
  return { requestData: { ...normalizedData, lectureHours }, amount: Number((lectureHours * ratePerHour).toFixed(2)) };
}

export function isApprovedLectureHoursClaim(status: string) {
  return [REQUEST_STATUSES.APPROVED, REQUEST_STATUSES.PAYMENT_PENDING, REQUEST_STATUSES.PAID].includes(status as any);
}

export function duplicateLectureHoursClaimMessage(status: string, requestId?: string) {
  const paymentStatus = status === REQUEST_STATUSES.PAID ? 'Paid' : `Pending (${REQUEST_STATUS_LABELS[status] || status})`;
  return `A payment request for these lecture hours has already been submitted.${requestId ? ` Request ID: ${requestId}.` : ''} Payment status: ${paymentStatus}.`;
}

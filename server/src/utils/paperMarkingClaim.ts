import { ApiError } from './ApiError.js';
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS, REQUEST_TYPE_CODES } from './constants.js';
import { PAPER_MARKING_BATCHES, PAPER_MARKING_MODULE_RATES } from './paperMarkingCatalog.js';

type FieldDefinition = {
  name: string;
  type?: string;
  options?: string[];
  validationRules?: { ratePerPaperByModule?: Record<string, number> };
};

function normalize(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsedDate = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

export function isPaperMarkingPayment(requestTypeCode?: string, requestTypeName?: string) {
  return requestTypeCode === REQUEST_TYPE_CODES.PAPER_MARKING || normalize(requestTypeName) === 'paper marking';
}

export function paperMarkingClaimKeyForData(requestData: Record<string, unknown> = {}) {
  const module = normalize(requestData.module) || normalize(requestData.courseName);
  const examDate = String(requestData.examDate ?? '').trim();
  if (!module || !isValidDate(examDate)) return undefined;
  return `${module}|${examDate}`;
}

export function paperMarkingClaimKey(requestTypeCode: string | undefined, requestData: Record<string, unknown> = {}, requestTypeName?: string) {
  if (!isPaperMarkingPayment(requestTypeCode, requestTypeName)) return undefined;
  const key = paperMarkingClaimKeyForData(requestData);
  if (!key) throw new ApiError(400, 'Module and a valid exam date are required for a Paper Marking request.');
  return key;
}

export function preparePaperMarkingClaim(
  requestTypeCode: string | undefined,
  requestTypeName: string | undefined,
  fields: FieldDefinition[] | undefined,
  requestData: Record<string, unknown> = {}
) {
  if (!isPaperMarkingPayment(requestTypeCode, requestTypeName)) return { requestData };

  const moduleValue = String(requestData.module ?? '').trim() || String(requestData.courseName ?? '').trim();
  const moduleField = String(requestData.module ?? '').trim() ? 'module' : 'courseName';
  const moduleDefinition = fields?.find((field) => field.name === moduleField);
  const configuredModule = moduleDefinition?.options?.find((option) => normalize(option) === normalize(moduleValue));
  const module = configuredModule || '';
  const batch = String(requestData.batch ?? '').trim();
  const batchOptions = fields?.find((field) => field.name === 'batch')?.options || PAPER_MARKING_BATCHES;
  const examDate = String(requestData.examDate ?? '').trim();
  const paperCount = Number(requestData.numberOfPapers);

  if (!module) throw new ApiError(400, 'Module is required for a Paper Marking request.');
  const configuredBatch = batchOptions.find((option) => normalize(option) === normalize(batch));
  if (!configuredBatch) {
    throw new ApiError(400, 'Select an available batch for a Paper Marking request.');
  }
  if (!isValidDate(examDate)) {
    throw new ApiError(400, 'Select a valid exam date for a Paper Marking request.');
  }
  if (!Number.isInteger(paperCount) || paperCount <= 0) throw new ApiError(400, 'Total papers must be a positive whole number.');
  const rates: Record<string, number> = moduleDefinition?.validationRules?.ratePerPaperByModule || PAPER_MARKING_MODULE_RATES;
  const ratePerPaper = Number(rates[module]);
  if (!Number.isFinite(ratePerPaper) || ratePerPaper <= 0) throw new ApiError(400, 'Rate per paper must be positive.');

  const amount = Number((paperCount * ratePerPaper).toFixed(2));
  if (!Number.isFinite(amount)) throw new ApiError(400, 'Invalid total paper-marking claim amount.');

  return {
    requestData: { ...requestData, batch: configuredBatch, [moduleField]: module, examDate, numberOfPapers: paperCount, ratePerPaper },
    amount
  };
}

export function duplicatePaperMarkingClaimMessage(status: string, requestId?: string) {
  const paymentStatus = status === REQUEST_STATUSES.PAID ? 'Paid' : `Pending (${REQUEST_STATUS_LABELS[status] || status})`;
  return `A paper-marking payment request for this module and exam date has already been submitted.${requestId ? ` Request ID: ${requestId}.` : ''} Payment status: ${paymentStatus}.`;
}

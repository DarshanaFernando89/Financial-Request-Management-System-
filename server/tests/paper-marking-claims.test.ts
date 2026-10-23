import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOne, find, lean } = vi.hoisted(() => ({ findOne: vi.fn(), find: vi.fn(), lean: vi.fn() }));
vi.mock('../src/models/Request.js', () => ({ RequestModel: { findOne, find } }));

import { assertNoDuplicatePaperMarkingClaim } from '../src/services/paperMarkingClaimService.js';
import { paperMarkingClaimKey, preparePaperMarkingClaim } from '../src/utils/paperMarkingClaim.js';
import { PAPER_MARKING_BATCHES, PAPER_MARKING_MODULE_RATES } from '../src/utils/paperMarkingCatalog.js';

const requestData = {
  courseName: 'EE5202',
  batch: 'E/20',
  examDate: '2026-10-04',
  numberOfPapers: '120',
  ratePerPaper: '1'
};
const fields = [
  {
    name: 'courseName',
    type: 'select',
    options: Object.keys(PAPER_MARKING_MODULE_RATES),
    validationRules: { ratePerPaperByModule: PAPER_MARKING_MODULE_RATES }
  },
  { name: 'batch', type: 'select', options: PAPER_MARKING_BATCHES }
];

beforeEach(() => {
  vi.clearAllMocks();
  findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
  find.mockReturnValue({ select: vi.fn().mockReturnValue({ populate: vi.fn().mockReturnValue({ lean }) }) });
  lean.mockResolvedValue([]);
});

describe('paper-marking claim preparation', () => {
  it('normalizes claim data and calculates the total from papers and rate', () => {
    expect(preparePaperMarkingClaim('PAPER_MARKING', 'Paper Marking', fields, requestData)).toEqual({
      requestData: { ...requestData, courseName: 'EE5202', batch: 'E/20', examDate: '2026-10-04', numberOfPapers: 120, ratePerPaper: 500 },
      amount: 60000
    });
    expect(paperMarkingClaimKey('PAPER_MARKING', requestData)).toBe('ee5202|2026-10-04');
  });

  it.each([
    [{ ...requestData, courseName: '' }, 'Module is required'],
    [{ ...requestData, batch: '' }, 'available batch'],
    [{ ...requestData, examDate: '2026-02-30' }, 'valid exam date'],
    [{ ...requestData, numberOfPapers: 0 }, 'positive whole number'],
    [{ ...requestData, numberOfPapers: 10.5 }, 'positive whole number'],
    [{ ...requestData, courseName: 'Unknown module' }, 'Module is required']
  ])('rejects invalid paper-marking data', (data, message) => {
    expect(() => preparePaperMarkingClaim('PAPER_MARKING', 'Paper Marking', fields, data)).toThrow(message);
  });

  it('does not alter data for other request types', () => {
    expect(preparePaperMarkingClaim('TRAVEL_FUEL', 'Travel / Fuel Claims', [], requestData)).toEqual({ requestData });
  });
});

describe('paper-marking duplicate claim service', () => {
  const input = { requesterId: 'lecturer-1', requestTypeCode: 'PAPER_MARKING', requestData };

  it('returns a normalized duplicate key and checks only active claims by the same requester', async () => {
    await expect(assertNoDuplicatePaperMarkingClaim({ ...input, excludeRequestId: 'current-draft' }))
      .resolves.toBe('ee5202|2026-10-04');
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      requester: 'lecturer-1',
      paperMarkingClaimKey: 'ee5202|2026-10-04',
      status: { $nin: ['REJECTED', 'CANCELLED'] },
      _id: { $ne: 'current-draft' }
    }));
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      requester: 'lecturer-1',
      status: { $nin: ['REJECTED', 'CANCELLED'] },
      'requestData.examDate': { $exists: true }
    }));
  });

  it('rejects a duplicate keyed claim with a useful conflict response', async () => {
    findOne.mockReturnValue({ select: vi.fn().mockResolvedValue({ status: 'PAID', requestId: '26200040' }) });
    await expect(assertNoDuplicatePaperMarkingClaim(input)).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('Request ID: 26200040. Payment status: Paid.')
    });
  });

  it('detects legacy claims by case-insensitive module and exact date', async () => {
    lean.mockResolvedValue([{
      requestId: '26200041',
      status: 'UNDER_REVIEW',
      requestType: { code: 'PAPER_MARKING' },
      requestData: { courseName: ' ee5202 ', examDate: '2026-10-04' }
    }]);
    await expect(assertNoDuplicatePaperMarkingClaim(input)).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('Request ID: 26200041.')
    });
  });

  it.each([
    { courseName: 'EE5203', examDate: '2026-10-04' },
    { courseName: 'EE5202', examDate: '2026-10-05' }
  ])('allows a claim when the module or exam date differs: %j', async (differentClaim) => {
    lean.mockResolvedValue([{
      requestId: '26200042',
      status: 'PAID',
      requestType: { name: 'Paper Marking' },
      requestData: differentClaim
    }]);
    await expect(assertNoDuplicatePaperMarkingClaim(input)).resolves.toBe('ee5202|2026-10-04');
  });

  it('does not query for unrelated claim types', async () => {
    await expect(assertNoDuplicatePaperMarkingClaim({ ...input, requestTypeCode: 'TRAVEL_FUEL' })).resolves.toBeUndefined();
    expect(findOne).not.toHaveBeenCalled();
    expect(find).not.toHaveBeenCalled();
  });
});

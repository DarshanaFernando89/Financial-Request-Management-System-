import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOne, find, lean } = vi.hoisted(() => ({ findOne: vi.fn(), find: vi.fn(), lean: vi.fn() }));
vi.mock('../src/models/Request.js', () => ({ RequestModel: { findOne, find } }));

import { assertNoDuplicateLectureHoursClaim } from '../src/services/lectureHoursClaimService.js';
import { calculateLectureHours, prepareLectureHoursClaim } from '../src/utils/lectureHoursClaim.js';

const requestData = { batch: 'E/26', module: 'EE6101', timeSlots: 'Monday 08:00-10:00' };

beforeEach(() => {
  vi.clearAllMocks();
  findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
  find.mockReturnValue({ select: vi.fn().mockReturnValue({ populate: vi.fn().mockReturnValue({ lean }) }) });
  lean.mockResolvedValue([]);
});

describe('lecture-hours duplicate claim service', () => {
  it('calculates lecture hours from one or more entered time slots', () => {
    expect(calculateLectureHours('Monday 08:00-10:00; Wednesday 13:00-15:30')).toBe(4.5);
    expect(() => calculateLectureHours('Monday 10:00-08:00')).toThrow('must end after it starts');
  });

  it('only accepts administrator-configured batches and modules and derives the amount', () => {
    const prepared = prepareLectureHoursClaim('LECTURE_HOURS', 'Lecture Hours Payment', [
      { name: 'batch', type: 'select', options: ['E/26'] },
      { name: 'module', type: 'select', options: ['EE6101'] }
    ], { ...requestData, timeSlots: 'Monday 08:00-10:30', lectureHours: 99, ratePerHour: 1200 });
    expect(prepared).toEqual({
      requestData: { ...requestData, timeSlots: 'Monday 08:00-10:30', lectureHours: 2.5, ratePerHour: 1200 },
      amount: 3000
    });
    expect(() => prepareLectureHoursClaim('LECTURE_HOURS', 'Lecture Hours Payment', [
      { name: 'batch', type: 'select', options: ['E/26'] },
      { name: 'module', type: 'select', options: ['EE6101'] }
    ], { ...requestData, batch: 'E/25', ratePerHour: 1200 })).toThrow('Select an available batch');
  });

  it('requires batch, module, and time slots before querying the database', async () => {
    await expect(assertNoDuplicateLectureHoursClaim({ requesterId: 'lecturer-1', requestTypeCode: 'LECTURE_HOURS', requestData: { ...requestData, batch: '' } }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(findOne).not.toHaveBeenCalled();
  });

  it('does not create a duplicate key for other request types', async () => {
    await expect(assertNoDuplicateLectureHoursClaim({ requesterId: 'lecturer-1', requestTypeCode: 'PAPER_MARKING', requestData }))
      .resolves.toBeUndefined();
    expect(findOne).not.toHaveBeenCalled();
  });

  it('recognizes an existing Lecture Hours Payment type even when its administrator-defined code differs', async () => {
    findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
    await expect(assertNoDuplicateLectureHoursClaim({ requesterId: 'lecturer-1', requestTypeCode: '01', requestTypeName: 'Lecture Hours Payment', requestData }))
      .resolves.toBe('e/26|ee6101|monday 08:00-10:00');
  });

  it.each([
    ['SUBMITTED', 'Pending (Submitted)'],
    ['UNDER_REVIEW', 'Pending (Under Review)'],
    ['APPROVED', 'Pending (Approved)'],
    ['PAID', 'Paid'],
    ['PAYMENT_PENDING', 'Pending (Pending Payment)']
  ])('reports the appropriate duplicate message for %s', async (status, message) => {
    findOne.mockReturnValue({ select: vi.fn().mockResolvedValue({ status, requestId: '12000100' }) });
    await expect(assertNoDuplicateLectureHoursClaim({ requesterId: 'lecturer-1', requestTypeCode: 'LECTURE_HOURS', requestData, excludeRequestId: 'current-draft' }))
      .rejects.toMatchObject({ statusCode: 409, message: `A payment request for these lecture hours has already been submitted. Request ID: 12000100. Payment status: ${message}.` });
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      requester: 'lecturer-1',
      lectureHoursClaimKey: 'e/26|ee6101|monday 08:00-10:00',
      _id: { $ne: 'current-draft' }
    }));
  });

  const lectureSlot = { date: '2026-10-04', batch: 'E/26', module: 'EE6101', startTime: '08:00', endTime: '10:00', ratePerHour: 2000 };
  const slotInput = { requesterId: 'lecturer-1', requestTypeCode: 'LECTURE_HOURS', requestData: { lectureTimeSlots: [lectureSlot] } };

  it('blocks an individual matching slot inside a previous multi-slot request', async () => {
    lean.mockResolvedValue([{
      requestId: '26200037', status: 'UNDER_REVIEW', requestType: { code: 'LECTURE_HOURS' },
      requestData: { lectureTimeSlots: [{ ...lectureSlot, ratePerHour: 500 }, { ...lectureSlot, date: '2026-10-07' }] }
    }]);
    await expect(assertNoDuplicateLectureHoursClaim(slotInput)).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('Request ID: 26200037. Payment status: Pending') });
  });

  it('finds slots in old claims without a stored duplicate key', async () => {
    lean.mockResolvedValue([{
      requestId: '26200038', status: 'PAID', requestType: { name: 'Lecture Hours Payment', code: '01' },
      requestData: { batch: ' e/26 ', module: 'ee6101', timeSlots: '2026-10-04 8:00 to 10:00; 2026-10-07 13:00-15:00' }
    }]);
    await expect(assertNoDuplicateLectureHoursClaim(slotInput)).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('Request ID: 26200038. Payment status: Paid.') });
  });

  it.each([
    { date: '2026-10-05' }, { batch: 'E/21' }, { module: 'EE6102' }, { startTime: '08:15' }, { endTime: '10:15' }
  ])('allows a claim when an identity field differs: %j', async (difference) => {
    lean.mockResolvedValue([{
      requestId: '26200037', status: 'UNDER_REVIEW', requestType: { code: 'LECTURE_HOURS' },
      requestData: { lectureTimeSlots: [{ ...lectureSlot, ...difference }] }
    }]);
    await expect(assertNoDuplicateLectureHoursClaim(slotInput)).resolves.toBeDefined();
  });

  it('limits the check to the lecturer, excludes the current draft, and permits rejected or cancelled claims', async () => {
    await assertNoDuplicateLectureHoursClaim({ ...slotInput, excludeRequestId: 'current-draft' });
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      requester: 'lecturer-1', _id: { $ne: 'current-draft' }, status: { $nin: ['REJECTED', 'CANCELLED'] }
    }));
  });

  it('does not treat unrelated request types with matching data as lecture claims', async () => {
    lean.mockResolvedValue([{ requestId: '26200037', status: 'PAID', requestType: { code: 'TRAVEL_FUEL', name: 'Travel/Fuel' }, requestData: slotInput.requestData }]);
    await expect(assertNoDuplicateLectureHoursClaim(slotInput)).resolves.toBeDefined();
  });
});

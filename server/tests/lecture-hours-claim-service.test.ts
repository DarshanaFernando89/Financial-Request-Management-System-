import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOne } = vi.hoisted(() => ({ findOne: vi.fn() }));
vi.mock('../src/models/Request.js', () => ({ RequestModel: { findOne } }));

import { assertNoDuplicateLectureHoursClaim } from '../src/services/lectureHoursClaimService.js';
import { calculateLectureHours, prepareLectureHoursClaim } from '../src/utils/lectureHoursClaim.js';

const requestData = { batch: 'E/26', module: 'EE6101', timeSlots: 'Monday 08:00-10:00' };

beforeEach(() => vi.clearAllMocks());

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
    ['SUBMITTED', 'You have already submitted a request for these lecture hours.'],
    ['UNDER_REVIEW', 'You have already submitted a request for these lecture hours.'],
    ['PAID', 'Payment for these lecture hours has already been approved.'],
    ['PAYMENT_PENDING', 'Payment for these lecture hours has already been approved.']
  ])('reports the appropriate duplicate message for %s', async (status, message) => {
    findOne.mockReturnValue({ select: vi.fn().mockResolvedValue({ status, requestId: '12000100' }) });
    await expect(assertNoDuplicateLectureHoursClaim({ requesterId: 'lecturer-1', requestTypeCode: 'LECTURE_HOURS', requestData, excludeRequestId: 'current-draft' }))
      .rejects.toMatchObject({ statusCode: 409, message });
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      requester: 'lecturer-1',
      lectureHoursClaimKey: 'e/26|ee6101|monday 08:00-10:00',
      _id: { $ne: 'current-draft' }
    }));
  });
});

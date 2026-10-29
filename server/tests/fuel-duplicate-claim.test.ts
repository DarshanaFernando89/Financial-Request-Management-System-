import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOne } = vi.hoisted(() => ({ findOne: vi.fn() }));
vi.mock('../src/models/Request.js', () => ({ RequestModel: { findOne } }));

import { assertFuelTravelDate, findDuplicateFuelClaim, fuelDuplicateWarning } from '../src/services/fuelDuplicateClaimService.js';

beforeEach(() => {
  vi.clearAllMocks();
  findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(undefined) });
});

describe('fuel duplicate claim warning', () => {
  const input = {
    requesterId: 'lecturer-1',
    requestTypeId: 'fuel-type',
    requestTypeCode: 'TRAVEL_FUEL',
    requestTypeName: 'Travel / Fuel Claims',
    amount: 20000,
    travelDate: '2026-06-01'
  };

  it('checks only the same requester, fuel request type, amount, and travel date', async () => {
    await findDuplicateFuelClaim({ ...input, amount: 20000.004, excludeRequestId: 'current-request' });
    expect(findOne).toHaveBeenCalledWith({
      requester: 'lecturer-1',
      requestType: 'fuel-type',
      amount: 20000,
      'requestData.travelDate': '2026-06-01',
      status: { $nin: ['DRAFT', 'REJECTED', 'CANCELLED'] },
      _id: { $ne: 'current-request' }
    });
  });

  it('returns the previous request so the controller can persist a warning', async () => {
    const previousRequest = { _id: 'request-id', requestId: '12000065' };
    const select = vi.fn().mockResolvedValue(previousRequest);
    findOne.mockReturnValue({ select });
    await expect(findDuplicateFuelClaim(input)).resolves.toBe(previousRequest);
    expect(select).toHaveBeenCalledWith('_id requestId');
    expect(fuelDuplicateWarning()).toContain('same amount and travel date');
  });

  it('requires a valid travel date when submitting a fuel claim', () => {
    expect(() => assertFuelTravelDate('TRAVEL_FUEL', 'Travel / Fuel Claims', { travelDate: '2026-06-01' })).not.toThrow();
    expect(() => assertFuelTravelDate('TRAVEL_FUEL', 'Travel / Fuel Claims', {})).toThrow('Travel date is required');
    expect(() => assertFuelTravelDate('TRAVEL_FUEL', 'Travel / Fuel Claims', { travelDate: '2026-02-31' })).toThrow('Travel date is required');
    expect(() => assertFuelTravelDate('GENERAL_REIMBURSEMENT', 'General Reimbursements', {})).not.toThrow();
  });

  it('does not check unrelated request types or invalid amounts', async () => {
    await expect(findDuplicateFuelClaim({
      ...input,
      requestTypeCode: 'GENERAL_REIMBURSEMENT',
      requestTypeName: 'General Reimbursements'
    })).resolves.toBeUndefined();
    await expect(findDuplicateFuelClaim({ ...input, amount: 0 })).resolves.toBeUndefined();
    await expect(findDuplicateFuelClaim({ ...input, travelDate: undefined })).resolves.toBeUndefined();
    expect(findOne).not.toHaveBeenCalled();
  });
});

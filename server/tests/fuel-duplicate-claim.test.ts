import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOne } = vi.hoisted(() => ({ findOne: vi.fn() }));
vi.mock('../src/models/Request.js', () => ({ RequestModel: { findOne } }));

import { findDuplicateFuelClaim, fuelDuplicateWarning } from '../src/services/fuelDuplicateClaimService.js';

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
    amount: 20000
  };

  it('checks only the same requester, fuel request type, and amount', async () => {
    await findDuplicateFuelClaim({ ...input, amount: 20000.004, excludeRequestId: 'current-request' });
    expect(findOne).toHaveBeenCalledWith({
      requester: 'lecturer-1',
      requestType: 'fuel-type',
      amount: 20000,
      status: { $nin: ['DRAFT', 'REJECTED', 'CANCELLED'] },
      _id: { $ne: 'current-request' }
    });
  });

  it('returns the previous request so the controller can persist a warning', async () => {
    const previousRequest = { requestId: '12000065' };
    findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(previousRequest) });
    await expect(findDuplicateFuelClaim(input)).resolves.toBe(previousRequest);
    expect(fuelDuplicateWarning(previousRequest.requestId)).toContain('Similar request ID: 12000065.');
  });

  it('does not check unrelated request types or invalid amounts', async () => {
    await expect(findDuplicateFuelClaim({
      ...input,
      requestTypeCode: 'GENERAL_REIMBURSEMENT',
      requestTypeName: 'General Reimbursements'
    })).resolves.toBeUndefined();
    await expect(findDuplicateFuelClaim({ ...input, amount: 0 })).resolves.toBeUndefined();
    expect(findOne).not.toHaveBeenCalled();
  });
});

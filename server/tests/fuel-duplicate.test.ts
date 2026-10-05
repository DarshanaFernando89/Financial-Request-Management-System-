import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findById, typeSelect, find, select, sort, lean } = vi.hoisted(() => ({
  findById: vi.fn(),
  typeSelect: vi.fn(),
  find: vi.fn(),
  select: vi.fn(),
  sort: vi.fn(),
  lean: vi.fn()
}));

vi.mock('../src/models/RequestType.js', () => ({ RequestTypeModel: { findById } }));
vi.mock('../src/models/Request.js', () => ({ RequestModel: { find } }));

import { findDuplicateFuelRequests } from '../src/services/fuelDuplicateService.js';

describe('fuel duplicate lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockReturnValue({ select: typeSelect });
    typeSelect.mockResolvedValue({ code: 'TRAVEL_FUEL' });
    find.mockReturnValue({ select });
    select.mockReturnValue({ sort });
    sort.mockReturnValue({ lean });
    lean.mockResolvedValue([{ requestId: 'REQ-101' }]);
  });

  it('matches non-cancelled requests by requester, type, and exact amount, excluding the current request', async () => {
    await findDuplicateFuelRequests('requester-1', 'fuel-type-1', 12500, 'request-2');

    expect(find).toHaveBeenCalledWith({
      requester: 'requester-1',
      requestType: 'fuel-type-1',
      amount: 12500,
      status: { $ne: 'CANCELLED' },
      _id: { $ne: 'request-2' }
    });
  });

  it('does not query requests for non-fuel request types', async () => {
    typeSelect.mockResolvedValue({ code: 'LECTURE_HOURS' });

    await expect(findDuplicateFuelRequests('requester-1', 'lecture-type-1', 12500)).resolves.toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });
});
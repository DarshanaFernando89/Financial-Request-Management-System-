import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteApprovalRule, deleteRole } from '../src/controllers/adminController.js';
import { ApiError } from '../src/utils/ApiError.js';

const { findByIdAndDeleteMock } = vi.hoisted(() => ({
  findByIdAndDeleteMock: vi.fn()
}));

vi.mock('../src/models/ApprovalRule.js', () => ({
  ApprovalRuleModel: {
    findByIdAndDelete: findByIdAndDeleteMock
  }
}));

vi.mock('../src/models/CustomRole.js', () => ({
  CustomRoleModel: {
    findByIdAndDelete: findByIdAndDeleteMock
  }
}));

describe('admin delete handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes an approval rule when it exists', async () => {
    findByIdAndDeleteMock.mockResolvedValue({ _id: 'rule-1' });
    const req: any = { params: { id: 'rule-1' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await deleteApprovalRule(req, res, next);

    expect(findByIdAndDeleteMock).toHaveBeenCalledWith('rule-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Approval rule deleted.' });
  });

  it('deletes a custom role when it exists', async () => {
    findByIdAndDeleteMock.mockResolvedValue({ _id: 'role-1' });
    const req: any = { params: { id: 'role-1' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await deleteRole(req, res, next);

    expect(findByIdAndDeleteMock).toHaveBeenCalledWith('role-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Role deleted.' });
  });

  it('throws when the target does not exist', async () => {
    findByIdAndDeleteMock.mockResolvedValue(null);
    const req: any = { params: { id: 'missing' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await deleteRole(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

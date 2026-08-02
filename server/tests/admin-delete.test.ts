import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRole, deleteApprovalRule, deleteRole } from '../src/controllers/adminController.js';
import { ApiError } from '../src/utils/ApiError.js';

const { createMock, findByIdMock, findByIdAndDeleteMock, findOneAndUpdateMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findByIdMock: vi.fn(),
  findByIdAndDeleteMock: vi.fn(),
  findOneAndUpdateMock: vi.fn()
}));

vi.mock('../src/models/ApprovalRule.js', () => ({
  ApprovalRuleModel: {
    findByIdAndDelete: findByIdAndDeleteMock
  }
}));

vi.mock('../src/models/CustomRole.js', () => ({
  CustomRoleModel: {
    create: createMock,
    findById: findByIdMock,
    findByIdAndDelete: findByIdAndDeleteMock,
    findOneAndUpdate: findOneAndUpdateMock
  }
}));

async function flushAsyncHandler() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

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
    findByIdMock.mockResolvedValue({ _id: 'role-1', code: 'CUSTOM_ROLE' });
    findByIdAndDeleteMock.mockResolvedValue({ _id: 'role-1' });
    const req: any = { params: { id: 'role-1' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    deleteRole(req, res, next);
    await flushAsyncHandler();

    expect(findByIdMock).toHaveBeenCalledWith('role-1');
    expect(findByIdAndDeleteMock).toHaveBeenCalledWith('role-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Role deleted.' });
  });

  it('soft-deletes a system role except admin', async () => {
    const req: any = { params: { id: 'system-LECTURER' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    deleteRole(req, res, next);
    await flushAsyncHandler();

    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { code: 'LECTURER' },
      {
        code: 'LECTURER',
        displayName: 'Lecturer',
        description: 'System role',
        isActive: false
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Role deleted.' });
  });

  it('prevents deleting the admin role', async () => {
    const req: any = { params: { id: 'system-ADMIN' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    deleteRole(req, res, next);
    await flushAsyncHandler();

    expect(findByIdMock).not.toHaveBeenCalled();
    expect(findByIdAndDeleteMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('prevents creating the admin role', async () => {
    const req: any = { body: { displayName: 'Admin', code: 'ADMIN' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    createRole(req, res, next);
    await flushAsyncHandler();

    expect(createMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('throws when the target does not exist', async () => {
    findByIdMock.mockResolvedValue(null);
    const req: any = { params: { id: 'missing' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    deleteRole(req, res, next);
    await flushAsyncHandler();

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });
});

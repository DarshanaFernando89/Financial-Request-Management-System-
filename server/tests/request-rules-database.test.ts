import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { find, select, populate, sort, roles } = vi.hoisted(() => ({ find: vi.fn(), select: vi.fn(), populate: vi.fn(), sort: vi.fn(), roles: vi.fn() }));
vi.mock('../src/models/ApprovalRule.js', () => ({ ApprovalRuleModel: { find } }));
vi.mock('../src/models/CustomRole.js', () => ({ CustomRoleModel: { find: roles } }));
vi.mock('../src/middleware/authMiddleware.js', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => next(),
  requireActiveRole: (_req: any, _res: any, next: any) => next()
}));
import requestRoutes from '../src/routes/requestRoutes.js';
import { findMatchingRule, initializeWorkflow } from '../src/services/workflowService.js';

const app = express();
app.use('/api/requests', requestRoutes);

beforeEach(() => {
  vi.clearAllMocks();
  roles.mockResolvedValue([]);
  find.mockReturnValue({ select, sort });
  select.mockReturnValue({ populate });
  populate.mockReturnValue({ sort });
});

describe('database rule choices and routing', () => {
  it('uses active admin rules, populated active types, and excludes rules without usable types', async () => {
    const active = { _id: 'rule-1', name: 'Admin rule name', requestTypes: [{ _id: 'type-1', isActive: true }] };
    sort.mockResolvedValue([active, { _id: 'rule-empty', requestTypes: [] }]);
    const response = await request(app).get('/api/requests/rules/active');
    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([active]);
    expect(find).toHaveBeenCalledWith({ isActive: true });
    expect(populate).toHaveBeenCalledWith({ path: 'requestTypes', match: { isActive: true } });
  });

  it('constrains matching by the chosen rule, request type, and amount', async () => {
    sort.mockResolvedValue([{ _id: 'chosen-rule' }]);
    expect(await findMatchingRule('type-1', 30000, 'chosen-rule')).toEqual({ _id: 'chosen-rule' });
    expect(find).toHaveBeenCalledWith({
      _id: 'chosen-rule', isActive: true, requestTypes: 'type-1',
      minAmount: { $lte: 30000 }, $or: [{ maxAmount: null }, { maxAmount: { $gte: 30000 } }]
    });
  });

  it('rejects a stale selection instead of routing through a different rule', async () => {
    sort.mockResolvedValue([]);
    await expect(initializeWorkflow({ requestType: 'type-1', amount: 100, approvalRule: 'deleted-rule' }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  it('continues matching existing requests that have no saved rule selection', async () => {
    sort.mockResolvedValue([{ workflowRoles: ['HOD'], includeFinanceReview: false }]);
    const legacy: any = { requestType: 'type-1', amount: 100 };
    await initializeWorkflow(legacy);
    expect(find.mock.calls[0][0]).not.toHaveProperty('_id');
    expect(legacy.workflowSteps.map((step: any) => step.role)).toEqual(['HOD', 'FINANCE_OFFICER']);
  });

  it('initializes a selected rule with its active custom role in the exact configured position', async () => {
    roles.mockResolvedValue([{ code: '001', isActive: true }]);
    sort.mockResolvedValue([{ workflowRoles: ['001', 'HOD', 'DEAN'] }]);
    const claim: any = { requestType: 'type-1', amount: 100, approvalRule: 'custom-rule' };
    await initializeWorkflow(claim);
    expect(claim.workflowSteps.map((step: any) => step.role)).toEqual(['001', 'HOD', 'DEAN', 'FINANCE_OFFICER']);
    expect(claim.currentAssignedRole).toBe('001');
    expect(claim.status).toBe('UNDER_REVIEW');
  });
});

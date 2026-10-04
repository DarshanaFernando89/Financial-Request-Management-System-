import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApprovalRuleModel } from '../src/models/ApprovalRule.js';
import { RequestModel } from '../src/models/Request.js';
import { availableWorkflowRoles } from '../../client/src/utils/workflowRoles.ts';

const { catalog } = vi.hoisted(() => ({ catalog: vi.fn() }));
vi.mock('../src/models/CustomRole.js', () => ({ CustomRoleModel: { find: catalog } }));
import { availableWorkflowRoleCodes, validateWorkflowRoleFields } from '../src/services/workflowRoleService.js';
import { buildWorkflowSteps } from '../src/services/workflowService.js';
import demoRoutes from '../src/routes/demoRoutes.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';
import { createApprovalRule, updateApprovalRule } from '../src/controllers/adminController.js';

const custom = { code: '001', displayName: 'Department Coordinator', isActive: true };
beforeEach(() => catalog.mockResolvedValue([custom, { code: 'ARCHIVED', isActive: false }]));

describe('custom roles in approval rules', () => {
  it('offers active custom roles with their exact display names alongside approval roles', () => {
    const roles = availableWorkflowRoles([
      { code: 'HOD', displayName: 'Head of Department', isActive: true }, custom,
      { code: 'ARCHIVED', displayName: 'Archived reviewer', isActive: false },
      ...['REQUESTER', 'LECTURER', 'FINANCE_OFFICER', 'ADMIN'].map((code) => ({ code, displayName: code, isActive: true }))
    ]);
    expect(roles.map((role) => [role.code, role.displayName])).toEqual([
      ['HOD', 'Head of Department'], ['001', 'Department Coordinator']
    ]);
  });

  it('validates active custom codes and preserves the selected sequence before payment', async () => {
    const availableRoles = await validateWorkflowRoleFields({ workflowRoles: ['001', 'HOD', 'DEAN'] });
    const steps = buildWorkflowSteps({ workflowRoles: ['001', 'HOD', 'DEAN'], availableRoles });
    expect(steps.map((step) => step.role)).toEqual(['001', 'HOD', 'DEAN', 'FINANCE_OFFICER']);
    expect(steps[0].stepType).toBe('APPROVAL');
  });

  it.each(['ARCHIVED', 'UNKNOWN', 'REQUESTER', 'LECTURER', 'FINANCE_OFFICER', 'ADMIN'])(
    'rejects unavailable or ineligible workflow role %s', async (code) => {
      await expect(validateWorkflowRoleFields({ workflowRoles: [code] })).rejects.toMatchObject({ statusCode: 400 });
    }
  );

  it('rejects removed roles on submission instead of silently skipping a workflow step', async () => {
    catalog.mockResolvedValue([]);
    await expect(validateWorkflowRoleFields({ workflowRoles: ['001', 'HOD'] }, 422)).rejects.toMatchObject({ statusCode: 422 });
  });

  it('honors disabled system roles and rejects duplicate steps', async () => {
    catalog.mockResolvedValue([custom, { code: 'HOD', isActive: false }]);
    expect(await availableWorkflowRoleCodes()).toEqual(['DEAN', '001']);
    await expect(validateWorkflowRoleFields({ workflowRoles: ['001', '001'] })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('allows custom roles in saved rules and generated request steps', () => {
    const rule = new ApprovalRuleModel({ name: 'Custom approval', requestTypes: ['507f1f77bcf86cd799439011'], minAmount: 0, workflowRoles: ['001', 'HOD'] });
    expect(rule.validateSync()).toBeUndefined();
    const claim = new RequestModel({ requestId: 'custom-role', requester: '507f1f77bcf86cd799439011', requestType: '507f1f77bcf86cd799439012', title: 'Custom approval', amount: 100,
      currentAssignedRole: '001', workflowSteps: buildWorkflowSteps({ workflowRoles: ['001', 'HOD'], availableRoles: ['001', 'HOD'] }) });
    expect(claim.validateSync()).toBeUndefined();
  });

  it('saves and updates active custom roles through the database controllers', async () => {
    const app = express();
    app.use(express.json());
    app.post('/rules', createApprovalRule);
    app.put('/rules/:id', updateApprovalRule);
    app.use(errorMiddleware);
    const conflict = vi.spyOn(ApprovalRuleModel, 'find').mockResolvedValue([]);
    const create = vi.spyOn(ApprovalRuleModel, 'create').mockImplementation(async (body: any) => ({ populate: async () => body }) as any);
    const update = vi.spyOn(ApprovalRuleModel, 'findByIdAndUpdate').mockImplementation((_id: any, body: any) => ({ populate: async () => body }) as any);
    try {
      const payload = { name: 'Coordinator approval', requestTypes: ['507f1f77bcf86cd799439011'], minAmount: 0, workflowRoles: ['001', 'HOD'] };
      const saved = await request(app).post('/rules').send(payload);
      expect(saved.status).toBe(201);
      expect(saved.body.workflowRoles).toEqual(['001', 'HOD']);
      const edited = await request(app).put('/rules/507f1f77bcf86cd799439012').send({ ...payload, workflowRoles: ['HOD', '001'] });
      expect(edited.status).toBe(200);
      expect(edited.body.workflowRoles).toEqual(['HOD', '001']);
      const stale = await request(app).post('/rules').send({ ...payload, workflowRoles: ['ARCHIVED'] });
      expect(stale.status).toBe(400);
      expect(create).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledTimes(1);
    } finally {
      conflict.mockRestore();
      create.mockRestore();
      update.mockRestore();
    }
  });

  it('creates and edits a rule using a newly created role through the demo API', async () => {
    const app = express();
    app.locals.demoMode = true;
    app.use(express.json());
    app.use('/api', demoRoutes);
    app.use(errorMiddleware);
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@uor.lk', password: 'Password123!' });
    const token = login.body.token;
    const role = await request(app).post('/api/admin/roles').auth(token, { type: 'bearer' }).send({ code: 'CUSTOM_TEST', displayName: 'Custom Test Reviewer' });
    expect(role.status).toBe(201);
    const types = await request(app).get('/api/admin/request-types').auth(token, { type: 'bearer' });
    const saved = await request(app).post('/api/admin/approval-rules').auth(token, { type: 'bearer' }).send({ name: 'Custom Test Rule', requestTypes: [types.body.items[0]._id], minAmount: 0, workflowRoles: ['CUSTOM_TEST', 'HOD'] });
    expect(saved.status).toBe(201);
    expect(saved.body.workflowRoles).toEqual(['CUSTOM_TEST', 'HOD']);
    const edited = await request(app).put(`/api/admin/approval-rules/${saved.body._id}`).auth(token, { type: 'bearer' }).send({ workflowRoles: ['HOD', 'CUSTOM_TEST'] });
    expect(edited.status).toBe(200);
    expect(edited.body.workflowRoles).toEqual(['HOD', 'CUSTOM_TEST']);
  });
});

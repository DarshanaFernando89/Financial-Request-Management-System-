import bcrypt from 'bcryptjs';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { records, catalog, pending, claimById, recordApproval } = vi.hoisted(() => ({ records: new Map<string, any>(), catalog: vi.fn(), pending: vi.fn(), claimById: vi.fn(), recordApproval: vi.fn() }));
function query(user: any) { return Object.assign(Promise.resolve(user), { select: async () => user }); }
vi.mock('../src/models/User.js', () => ({ UserModel: {
  findById: (id: string) => query(records.get(String(id))),
  findOne: (filter: any) => query([...records.values()].find((user) => user.email === filter.email)),
  create: async (body: any) => {
    const user = { ...body, _id: 'created-user', updatedAt: new Date(), approvalRolePasswordHashes: new Map(body.approvalRolePasswordHashes) };
    records.set(user._id, user);
    return user;
  },
  findByIdAndUpdate: (id: string, updates: any) => {
    const user = records.get(String(id));
    if (user) Object.assign(user, updates, { updatedAt: new Date() });
    return query(user);
  }
} }));
vi.mock('../src/models/CustomRole.js', () => ({ CustomRoleModel: { find: catalog } }));
vi.mock('../src/services/auditService.js', () => ({ writeAuditLog: async () => {} }));
vi.mock('../src/models/Request.js', () => ({ RequestModel: { find: () => ({ populate: () => ({ sort: pending }) }), findOne: claimById } }));
vi.mock('../src/models/Approval.js', () => ({ ApprovalModel: { create: recordApproval } }));
vi.mock('../src/services/notificationService.js', () => ({ notifyRole: async () => {}, notifyUser: async () => {} }));

import authRoutes from '../src/routes/authRoutes.js';
import userRoutes from '../src/routes/userRoutes.js';
import approvalRoutes from '../src/routes/approvalRoutes.js';
import financeRoutes from '../src/routes/financeRoutes.js';
import { signAuthToken } from '../src/middleware/authMiddleware.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';
import { visibleAssignedRoles } from '../../client/src/utils/constants.ts';
import { roleLabel } from '../../client/src/utils/roleLabels.ts';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/approvals', approvalRoutes);
app.use('/finance', financeRoutes);
app.use(errorMiddleware);
let adminToken: string;
const password = 'Password123!';
const rolePassword = 'CustomApproval123!';
const newUser = { nameWithInitials: 'C. Reviewer', fullName: 'Custom Reviewer', email: 'custom@uor.lk', password,
  staffCategory: 'ACADEMIC', department: 'Engineering', faculty: 'Engineering', roles: ['001'] };

beforeEach(async () => {
  vi.clearAllMocks();
  records.clear();
  records.set('admin', { _id: 'admin', email: 'admin@uor.lk', roles: ['ADMIN'], isActive: true, updatedAt: new Date() });
  catalog.mockResolvedValue([{ code: '001', displayName: 'Department Coordinator', isActive: true }, { code: 'ARCHIVED', displayName: 'Archived reviewer', isActive: false }]);
  pending.mockResolvedValue([]);
  adminToken = signAuthToken({ userId: 'admin', email: 'admin@uor.lk', roles: ['ADMIN'], activeRole: 'ADMIN' });
});

describe('system and custom user role assignments', () => {
  it('creates, reads, and edits a custom-only user and preserves the role through login and profile', async () => {
    const created = await request(app).post('/users').auth(adminToken, { type: 'bearer' }).send(newUser);
    expect(created.status).toBe(201);
    expect(created.body.roles).toEqual(['001']);
    expect(created.body.roleLabels['001']).toBe('Department Coordinator');
    expect(created.body).not.toHaveProperty('passwordHash');
    const edited = await request(app).put('/users/created-user').auth(adminToken, { type: 'bearer' }).send({ fullName: 'Edited Custom Reviewer', roles: ['001'] });
    expect(edited.status).toBe(200);
    expect(edited.body.roles).toEqual(['001']);
    const login = await request(app).post('/auth/login').send({ email: newUser.email, password });
    expect(login.status).toBe(200);
    expect(login.body.requiresRoleSelection).toBe(false);
    expect(login.body.user.activeRole).toBe('001');
    const token = login.body.token;
    const session = await request(app).get('/auth/me').auth(token, { type: 'bearer' });
    const profile = await request(app).get('/users/me/profile').auth(token, { type: 'bearer' });
    expect(session.body.user.roles).toEqual(['001']);
    expect(profile.body.roles).toEqual(session.body.user.roles);
    expect(visibleAssignedRoles(profile.body.roles, Object.keys(profile.body.roleLabels))).toEqual(['001']);
    expect(roleLabel('001', profile.body.roleLabels)).toBe('Department Coordinator');
    expect((await request(app).get('/approvals/pending').auth(token, { type: 'bearer' })).status).toBe(200);
    expect((await request(app).get('/users').auth(token, { type: 'bearer' })).status).toBe(403);
    expect((await request(app).get('/finance/pending-payments').auth(token, { type: 'bearer' })).status).toBe(403);
  });

  it('assigns mixed roles and enforces the custom approval password when selecting the role', async () => {
    const created = await request(app).post('/users').auth(adminToken, { type: 'bearer' }).send({ ...newUser, roles: ['LECTURER', '001'], approvalRolePasswords: { '001': rolePassword } });
    expect(created.status).toBe(201);
    expect(created.body.roles).toEqual(['LECTURER', '001']);
    expect(created.body.approvalRolePasswordConfiguredRoles).toEqual(['001']);
    const fetched = await request(app).get('/users/created-user').auth(adminToken, { type: 'bearer' });
    expect(fetched.body.roles).toEqual(['LECTURER', '001']);
    const hash = records.get('created-user').approvalRolePasswordHashes.get('001');
    expect(await bcrypt.compare(rolePassword, hash)).toBe(true);
    const reassigned = await request(app).patch('/users/created-user/roles').auth(adminToken, { type: 'bearer' }).send({ roles: ['001', 'LECTURER'] });
    expect(reassigned.status).toBe(200);
    expect(records.get('created-user').approvalRolePasswordHashes.get('001')).toBe(hash);
    const login = await request(app).post('/auth/login').send({ email: newUser.email, password });
    expect(login.body.requiresRoleSelection).toBe(true);
    const token = login.body.token;
    expect((await request(app).post('/auth/select-role').auth(token, { type: 'bearer' }).send({ role: '001' })).status).toBe(400);
    expect((await request(app).post('/auth/select-role').auth(token, { type: 'bearer' }).send({ role: '001', approvalRolePassword: 'wrong' })).status).toBe(401);
    const selected = await request(app).post('/auth/select-role').auth(token, { type: 'bearer' }).send({ role: '001', approvalRolePassword: rolePassword });
    expect(selected.status).toBe(200);
    expect(selected.body.user.activeRole).toBe('001');
    expect((await request(app).get('/approvals/pending').auth(selected.body.token, { type: 'bearer' })).status).toBe(200);
    catalog.mockResolvedValue([{ code: '001', displayName: 'Department Coordinator', isActive: false }]);
    expect((await request(app).get('/approvals/pending').auth(selected.body.token, { type: 'bearer' })).status).toBe(403);
  });

  it.each(['REQUESTER', 'UNKNOWN', 'ARCHIVED'])('rejects assignment of unavailable role %s', async (code) => {
    const response = await request(app).post('/users').auth(adminToken, { type: 'bearer' }).send({ ...newUser, roles: ['LECTURER', code] });
    expect(response.status).toBe(400);
    expect(records.has('created-user')).toBe(false);
  });

  it('requires an approval password when adding a custom role to a multi-role user', async () => {
    await request(app).post('/users').auth(adminToken, { type: 'bearer' }).send({ ...newUser, roles: ['LECTURER'] });
    const missingPassword = await request(app).put('/users/created-user').auth(adminToken, { type: 'bearer' }).send({ roles: ['LECTURER', '001'] });
    expect(missingPassword.status).toBe(400);
    expect(records.get('created-user').roles).toEqual(['LECTURER']);
    const updated = await request(app).put('/users/created-user').auth(adminToken, { type: 'bearer' }).send({ roles: ['LECTURER', '001'], approvalRolePasswords: { '001': rolePassword } });
    expect(updated.status).toBe(200);
    expect(updated.body.roles).toEqual(['LECTURER', '001']);
  });

  it('lets a custom approver complete only the step assigned to their role', async () => {
    await request(app).post('/users').auth(adminToken, { type: 'bearer' }).send(newUser);
    const login = await request(app).post('/auth/login').send({ email: newUser.email, password });
    const claim = { _id: 'claim-1', requestId: 'claim-1', status: 'UNDER_REVIEW', requester: 'requester', currentAssignedRole: '001',
      currentStepIndex: 0, approvalHistory: [], save: vi.fn().mockResolvedValue(undefined), populate: async () => ({ requestId: 'claim-1' }), workflowSteps: [
        { stepIndex: 0, role: '001', stepType: 'APPROVAL', status: 'PENDING' },
        { stepIndex: 1, role: 'HOD', stepType: 'APPROVAL', status: 'WAITING' }
      ] };
    claimById.mockResolvedValue(claim);
    recordApproval.mockResolvedValue({});
    const approved = await request(app).post('/approvals/claim-1/approve').auth(login.body.token, { type: 'bearer' }).send({ remarks: 'Reviewed by custom role' });
    expect(approved.status).toBe(200);
    expect(claim.currentAssignedRole).toBe('HOD');
    expect(claim.workflowSteps[0].status).toBe('COMPLETED');
    expect(recordApproval).toHaveBeenCalledWith(expect.objectContaining({ role: '001', action: 'APPROVE' }));
    const otherRoleStep = await request(app).post('/approvals/claim-1/approve').auth(login.body.token, { type: 'bearer' }).send({});
    expect(otherRoleStep.status).toBe(403);
    expect(recordApproval).toHaveBeenCalledTimes(1);
  });
});

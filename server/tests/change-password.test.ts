import bcrypt from 'bcryptjs';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { users, change, reset, audit } = vi.hoisted(() => ({
  users: new Map<string, any>(), change: vi.fn(), reset: vi.fn(), audit: vi.fn()
}));
function query(value: any) { return Object.assign(Promise.resolve(value), { select: async () => value }); }
vi.mock('../src/models/User.js', () => ({ UserModel: {
  findById: (id: string) => query(users.get(id)),
  findOne: (filter: any) => query([...users.values()].find((user) => user.email === filter.email)),
  findOneAndUpdate: change,
  findByIdAndUpdate: reset
} }));
vi.mock('../src/models/CustomRole.js', () => ({ CustomRoleModel: {
  find: async () => [{ code: 'CUSTOM_REVIEWER', displayName: 'Custom reviewer', isActive: true }]
} }));
vi.mock('../src/services/auditService.js', () => ({ writeAuditLog: audit }));

import userRoutes from '../src/routes/userRoutes.js';
import authRoutes from '../src/routes/authRoutes.js';
import { signAuthToken } from '../src/middleware/authMiddleware.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';

const app = express();
app.use(express.json());
app.use('/users', userRoutes);
app.use('/auth', authRoutes);
app.use(errorMiddleware);
const currentPassword = 'CurrentPassword123!';
const newPassword = 'A new passphrase 123!';
const originalHash = bcrypt.hashSync(currentPassword, 10);
let testId = 0;
let user: any;

function tokenFor(account = user) {
  return signAuthToken({ userId: account._id, email: account.email, roles: account.roles,
    activeRole: account.roles[0], sessionVersion: account.sessionVersion });
}
function submit(body: any = {}, token = tokenFor()) {
  return request(app).patch('/users/me/password').auth(token, { type: 'bearer' })
    .send({ currentPassword, newPassword, confirmPassword: newPassword, ...body });
}

beforeEach(() => {
  vi.clearAllMocks();
  users.clear();
  user = { _id: `user-${++testId}`, email: 'person@example.com', roles: ['LECTURER'], isActive: true, passwordHash: originalHash };
  users.set(user._id, user);
  audit.mockResolvedValue(undefined);
  change.mockImplementation(async (filter, update) => {
    const target = users.get(filter._id);
    if (!target || target.passwordHash !== filter.passwordHash || !target.isActive) return null;
    Object.assign(target, update.$set);
    target.sessionVersion = (target.sessionVersion || 0) + update.$inc.sessionVersion;
    return target;
  });
  reset.mockImplementation(async (id, update) => {
    const target = users.get(id);
    if (!target) return null;
    Object.assign(target, update);
    return target;
  });
});

describe('self-service password changes', () => {
  it('accepts exactly 8 characters when confirmation matches', async () => {
    const password = 'Newpass8';
    expect((await submit({ newPassword: password, confirmPassword: password })).status).toBe(200);
    expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);
  });

  it('rejects 7 characters even when confirmation matches', async () => {
    const response = await submit({ newPassword: 'Pass123', confirmPassword: 'Pass123' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('New password must contain at least 8 characters.');
    expect(change).not.toHaveBeenCalled();
  });

  it.each(['Otherpw8', '', null, 123])('requires matching confirmation for an 8-character password: %j', async (confirmation) => {
    const response = await submit({ newPassword: 'Newpass8', confirmPassword: confirmation });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('New password and confirmation do not match.');
    expect(change).not.toHaveBeenCalled();
  });

  it.each(['LECTURER', 'HOD', 'DEAN', 'FINANCE_OFFICER', 'ADMIN', 'CUSTOM_REVIEWER'])('allows %s to change their own password', async (role) => {
    user.roles = [role];
    const response = await submit();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Password changed successfully. Please sign in with your new password.' });
    expect(await bcrypt.compare(newPassword, user.passwordHash)).toBe(true);
    expect(await bcrypt.compare(currentPassword, user.passwordHash)).toBe(false);
    expect(user.sessionVersion).toBe(1);
    expect(audit).toHaveBeenCalledWith({ actor: user._id, actorRole: role, action: 'CHANGE_PASSWORD', entityType: 'User', entityId: user._id });
    expect(JSON.stringify(audit.mock.calls)).not.toContain(newPassword);
  });

  it('rejects an incorrect current password without modifying the account', async () => {
    const response = await submit({ currentPassword: 'IncorrectPassword' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Current password is incorrect.');
    expect(change).not.toHaveBeenCalled();
    expect(user.passwordHash).toBe(originalHash);
  });

  it.each([
    { currentPassword: '' }, { currentPassword: { $ne: null } },
    { newPassword: 'short', confirmPassword: 'short' },
    { newPassword: 123 }, { confirmPassword: 'different' },
    { newPassword: 'x'.repeat(73), confirmPassword: 'x'.repeat(73) },
    { newPassword: '😊'.repeat(19), confirmPassword: '😊'.repeat(19) }
  ])('rejects invalid input: %j', async (body) => {
    expect((await submit(body)).status).toBe(400);
    expect(change).not.toHaveBeenCalled();
  });

  it('rejects reusing the current password', async () => {
    expect((await submit({ newPassword: currentPassword, confirmPassword: currentPassword })).status).toBe(400);
    expect(change).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    expect((await request(app).patch('/users/me/password').send({ currentPassword, newPassword, confirmPassword: newPassword })).status).toBe(401);
    expect(change).not.toHaveBeenCalled();
  });

  it('ignores another user ID and protected fields supplied in the body', async () => {
    const other = { ...user, _id: 'other-user' };
    users.set(other._id, other);
    expect((await submit({ userId: other._id, _id: other._id, roles: ['ADMIN'], sessionVersion: 0 })).status).toBe(200);
    expect(change.mock.calls[0][0]._id).toBe(user._id);
    expect(other.passwordHash).toBe(originalHash);
    expect(user.roles).toEqual(['LECTURER']);
  });

  it('invalidates old sessions and permits login only with the new password', async () => {
    const oldToken = tokenFor();
    expect((await submit({}, oldToken)).status).toBe(200);
    expect((await request(app).get('/auth/me').auth(oldToken, { type: 'bearer' })).status).toBe(401);
    expect((await request(app).post('/auth/login').send({ email: user.email, password: currentPassword })).status).toBe(401);
    const login = await request(app).post('/auth/login').send({ email: user.email, password: newPassword });
    expect(login.status).toBe(200);
    expect((await request(app).get('/auth/me').auth(login.body.token, { type: 'bearer' })).status).toBe(200);
  });

  it('does not overwrite a concurrent password reset', async () => {
    change.mockResolvedValue(null);
    expect((await submit()).status).toBe(409);
    expect(change.mock.calls[0][0]).toMatchObject({ _id: user._id, passwordHash: originalHash, isActive: true });
    expect(audit).not.toHaveBeenCalled();
  });

  it('rate limits repeated failed attempts for the same account', async () => {
    const token = tokenFor();
    for (let index = 0; index < 10; index++) {
      expect((await submit({ confirmPassword: 'mismatch' }, token)).status).toBe(400);
    }
    const blocked = await submit({}, token);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(change).not.toHaveBeenCalled();
  });

  it('keeps the admin default reset working after a self-service change', async () => {
    expect((await submit()).status).toBe(200);
    const admin = { ...user, _id: 'admin-user', email: 'admin@example.com', roles: ['ADMIN'] };
    users.set(admin._id, admin);
    const response = await request(app).patch(`/users/${user._id}/reset-password`).auth(tokenFor(admin), { type: 'bearer' }).send({});
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Password reset successfully.');
    expect(await bcrypt.compare('Password123!', user.passwordHash)).toBe(true);
    expect(user.sessionVersion).toBe(1);
    expect((await request(app).post('/auth/login').send({ email: user.email, password: 'Password123!' })).status).toBe(200);
  });

  it('keeps the admin reset endpoint restricted to admins', async () => {
    expect((await request(app).patch(`/users/${user._id}/reset-password`).auth(tokenFor(), { type: 'bearer' }).send({})).status).toBe(403);
    expect(reset).not.toHaveBeenCalled();
  });
});

import bcrypt from 'bcryptjs';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { accounts, findOne, find, findById, reset, insertMany, count } = vi.hoisted(() => ({
  accounts: new Map<string, any>(), findOne: vi.fn(), find: vi.fn(), findById: vi.fn(), reset: vi.fn(), insertMany: vi.fn(), count: vi.fn()
}));
vi.mock('../src/models/User.js', () => ({ UserModel: { findOne, find, findById, findByIdAndUpdate: reset, countDocuments: count } }));
vi.mock('../src/models/Notification.js', () => ({ NotificationModel: { insertMany } }));
vi.mock('../src/models/CustomRole.js', () => ({ CustomRoleModel: { find: async () => [] } }));
import authRoutes from '../src/routes/authRoutes.js';
import userRoutes from '../src/routes/userRoutes.js';
import { signAuthToken } from '../src/middleware/authMiddleware.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';
import { getNotificationAction } from '../../client/src/utils/notificationActions.ts';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use(errorMiddleware);
const adminId = '000000000000000000000001';
const lecturerId = '000000000000000000000002';
const lecturerEmail = 'lecturer+claims@uor.lk';
function query(value: any) {
  return Object.assign(Promise.resolve(value), {
    select: async () => value,
    sort: () => ({ skip: () => ({ limit: async () => value }) })
  });
}
function token(id = adminId) {
  const user = accounts.get(id);
  return signAuthToken({ userId: id, email: user.email, roles: user.roles, activeRole: user.roles[0] });
}
function notification(overrides: any = {}) {
  return { _id: 'notification-1', type: 'PASSWORD_RESET', title: 'Password reset requested',
    message: `${lecturerEmail} requested a password reset.`, isRead: false, createdAt: '', relatedUser: lecturerId, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  accounts.clear();
  accounts.set(adminId, { _id: adminId, email: 'admin@uor.lk', roles: ['ADMIN'], isActive: true });
  accounts.set(lecturerId, { _id: lecturerId, fullName: 'Test Lecturer', email: lecturerEmail, roles: ['LECTURER'], isActive: true, passwordHash: 'unchanged-hash' });
  findOne.mockImplementation(({ email }) => query([...accounts.values()].find((user) => user.email === email)));
  findById.mockImplementation((id) => query(accounts.get(id)));
  find.mockImplementation((filter) => query(filter.$expr
    ? [accounts.get(adminId)]
    : [...accounts.values()].filter((user) => !filter.email || user.email === filter.email)));
  count.mockResolvedValue(1);
  insertMany.mockResolvedValue([]);
  reset.mockImplementation(async (id, update) => {
    const user = accounts.get(id);
    if (!user) return null;
    Object.assign(user, update);
    return user;
  });
});

describe('password-reset notification actions', () => {
  it('links normalized reset requests to the exact user for each admin', async () => {
    const response = await request(app).post('/auth/forgot-password').send({ email: ` ${lecturerEmail.toUpperCase()} ` });
    expect(response.status).toBe(200);
    expect(findOne).toHaveBeenCalledWith({ email: lecturerEmail });
    expect(insertMany).toHaveBeenCalledWith([expect.objectContaining({
      user: adminId, type: 'PASSWORD_RESET', relatedUser: lecturerId,
      title: 'Password reset requested', message: `${lecturerEmail} requested a password reset.`
    })]);
    expect(getNotificationAction(notification(insertMany.mock.calls[0][0][0]), 'ADMIN')).toEqual({
      label: 'Reset Password', to: `/admin/users?resetPassword=${lecturerId}`, openDirectly: true
    });
    expect(reset).not.toHaveBeenCalled();
  });

  it('returns the same public response for an unknown email without creating an unusable reset action', async () => {
    const known = await request(app).post('/auth/forgot-password').send({ email: lecturerEmail });
    insertMany.mockClear();
    const unknown = await request(app).post('/auth/forgot-password').send({ email: 'missing@uor.lk' });
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(insertMany).not.toHaveBeenCalled();
  });

  it.each([null, '', { $ne: null }, 'invalid'])('rejects invalid request emails: %j', async (email) => {
    expect((await request(app).post('/auth/forgot-password').send({ email })).status).toBe(400);
    expect(findOne).not.toHaveBeenCalled();
    expect(insertMany).not.toHaveBeenCalled();
  });

  it('supports old notifications and resolves an exact email instead of a partial search', async () => {
    const action = getNotificationAction(notification({ type: 'ADMIN', relatedUser: undefined }), 'ADMIN');
    expect(action?.to).toBe(`/admin/users?resetPasswordEmail=${encodeURIComponent(lecturerEmail)}`);
    const response = await request(app).get('/users').query({ email: lecturerEmail }).auth(token(), { type: 'bearer' });
    expect(response.status).toBe(200);
    expect(find).toHaveBeenCalledWith({ email: lecturerEmail });
    expect(response.body.items.map((user: any) => user._id)).toEqual([lecturerId]);
    expect(reset).not.toHaveBeenCalled();
  });

  it('keeps the account unchanged until the admin explicitly confirms the existing reset endpoint', async () => {
    const details = await request(app).get(`/users/${lecturerId}`).auth(token(), { type: 'bearer' });
    expect(details.status).toBe(200);
    expect(details.body.email).toBe(lecturerEmail);
    expect(details.body).not.toHaveProperty('passwordHash');
    expect(reset).not.toHaveBeenCalled();
    const response = await request(app).patch(`/users/${lecturerId}/reset-password`).auth(token(), { type: 'bearer' }).send({ password: 'Password123!' });
    expect(response.status).toBe(200);
    expect(await bcrypt.compare('Password123!', accounts.get(lecturerId).passwordHash)).toBe(true);
  });

  it('does not allow non-admins to follow or execute the reset action', async () => {
    expect(getNotificationAction(notification(), 'LECTURER')).toBeUndefined();
    expect((await request(app).get(`/users/${lecturerId}`).auth(token(lecturerId), { type: 'bearer' })).status).toBe(403);
    expect((await request(app).patch(`/users/${lecturerId}/reset-password`).auth(token(lecturerId), { type: 'bearer' }).send({})).status).toBe(403);
    expect(reset).not.toHaveBeenCalled();
  });

  it('reports deleted notification targets without resetting another account', async () => {
    accounts.delete(lecturerId);
    expect((await request(app).get(`/users/${lecturerId}`).auth(token(), { type: 'bearer' })).status).toBe(404);
    expect(reset).not.toHaveBeenCalled();
  });

  it('does not guess a reset target from an unrecognized old notification message', () => {
    expect(getNotificationAction(notification({ relatedUser: undefined, message: 'Unknown target' }), 'ADMIN'))
      .toEqual({ label: 'View Users', to: '/admin/users' });
  });
});

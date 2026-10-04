import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findById, findByIdAndUpdate, exists } = vi.hoisted(() => ({
  findById: vi.fn(), findByIdAndUpdate: vi.fn(), exists: vi.fn()
}));
vi.mock('../src/models/User.js', () => ({ UserModel: { findById, findByIdAndUpdate, exists } }));

import userRoutes from '../src/routes/userRoutes.js';
import authRoutes from '../src/routes/authRoutes.js';
import { signAuthToken } from '../src/middleware/authMiddleware.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use(errorMiddleware);
let user: any;
let token: string;

beforeEach(() => {
  vi.clearAllMocks();
  user = {
    _id: 'user-1', fullName: 'Original Name', nameWithInitials: 'O. Name', email: 'original@uor.lk',
    roles: ['ADMIN'], department: 'Original Department', isActive: true, contactNo: '+94710000001',
    profileImageUrl: 'original-image', updatedAt: new Date()
  };
  findById.mockImplementation(async () => user);
  exists.mockResolvedValue(null);
  findByIdAndUpdate.mockImplementation(async (_id, updates) => Object.assign(user, updates));
  token = signAuthToken({ userId: user._id, email: user.email, roles: user.roles, activeRole: 'ADMIN' });
});

function update(body: unknown) {
  return request(app).put('/api/users/me/profile').auth(token, { type: 'bearer' }).send(body);
}

describe('editable profile details', () => {
  it('saves normalized name and email and refreshes the existing authenticated session', async () => {
    const response = await update({ fullName: '  Updated Full Name  ', email: ' Updated@UOR.LK ', contactNo: '+94712223344' });
    expect(response.status).toBe(200);
    expect(response.body.fullName).toBe('Updated Full Name');
    expect(response.body.email).toBe('updated@uor.lk');
    expect(response.body.contactNo).toBe('+94712223344');
    expect(response.body.profileImageUrl).toBe('original-image');
    expect(response.body.nameWithInitials).toBe('O. Name');
    expect(exists).toHaveBeenCalledWith({ email: 'updated@uor.lk', _id: { $ne: 'user-1' } });
    const refreshed = await request(app).get('/api/auth/me').auth(token, { type: 'bearer' });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.user.fullName).toBe('Updated Full Name');
    expect(refreshed.body.user.email).toBe('updated@uor.lk');
  });

  it.each([
    { fullName: '   ' }, { email: 'invalid-email' }, { email: '' },
    { email: { $ne: null } }, { fullName: 123 }, { contactNo: 'not-a-phone' }
  ])('rejects invalid profile fields before writing: %j', async (body) => {
    expect((await update(body)).status).toBe(400);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
    expect(user.email).toBe('original@uor.lk');
  });

  it('rejects another account\'s email and preserves the current profile', async () => {
    exists.mockResolvedValue({ _id: 'other-user' });
    const response = await update({ fullName: 'New Name', email: 'taken@uor.lk' });
    expect(response.status).toBe(409);
    expect(response.body.message).toBe('This email address is already used by another account.');
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
    expect(user.fullName).toBe('Original Name');
  });

  it('reports an email uniqueness race as a conflict', async () => {
    findByIdAndUpdate.mockRejectedValue({ code: 11000, keyPattern: { email: 1 } });
    expect((await update({ email: 'taken@uor.lk' })).status).toBe(409);
  });

  it('accepts an unchanged email and ignores protected fields', async () => {
    const response = await update({ email: user.email, roles: ['DEAN'], _id: 'other-user', department: 'New Department', nameWithInitials: 'New Initials' });
    expect(response.status).toBe(200);
    expect(findByIdAndUpdate.mock.calls[0][0]).toBe('user-1');
    expect(response.body.roles).toEqual(['ADMIN']);
    expect(response.body.department).toBe('Original Department');
    expect(response.body.nameWithInitials).toBe('O. Name');
  });

  it('requires authentication', async () => {
    expect((await request(app).put('/api/users/me/profile').send({ fullName: 'New Name' })).status).toBe(401);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

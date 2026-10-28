import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import demoRoutes from '../src/routes/demoRoutes.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';
import { UserModel } from '../src/models/User.js';

const app = express();
app.locals.demoMode = true;
app.use(express.json());
app.use('/api', demoRoutes);
app.use(errorMiddleware);

describe('single-role accounts in demo mode', () => {
  it.each([
    ['admin@uor.lk', 'ADMIN'], ['lecturer@uor.lk', 'LECTURER'],
    ['hod@uor.lk', 'HOD'], ['dean@uor.lk', 'DEAN'], ['finance@uor.lk', 'FINANCE_OFFICER']
  ])('signs %s directly into %s', async (email, role) => {
    const login = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
    expect(login.status).toBe(200);
    expect(login.body.user.roles).toEqual([role]);
    expect(login.body.user.activeRole).toBe(role);
    expect(login.body).not.toHaveProperty('requiresRoleSelection');
    const session = await request(app).get('/api/auth/me').auth(login.body.token, { type: 'bearer' });
    expect(session.body.user.activeRole).toBe(role);
    expect((await request(app).post('/api/auth/select-role').auth(login.body.token, { type: 'bearer' }).send({ role: 'LECTURER' })).status).toBe(410);
    if (role !== 'LECTURER') {
      expect((await request(app).post('/api/requests').auth(login.body.token, { type: 'bearer' }).send({ title: 'Use staff account' })).status).toBe(403);
    }
  });

  it('rejects multiple assignments on user creation and editing', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@uor.lk', password: 'Password123!' });
    const body = { email: 'multi-test@uor.lk', roles: ['LECTURER', 'HOD'] };
    expect((await request(app).post('/api/users').auth(login.body.token, { type: 'bearer' }).send(body)).status).toBe(400);
    expect((await request(app).put('/api/users/demo-hod').auth(login.body.token, { type: 'bearer' }).send(body)).status).toBe(400);
  });
});

describe('stored role validation', () => {
  it('serializes a populated requester summary when roles are not selected', () => {
    const requester = UserModel.hydrate({ nameWithInitials: 'A. Staff' }, { nameWithInitials: 1 });
    expect(requester.toJSON()).toMatchObject({ nameWithInitials: 'A. Staff' });
    expect(requester.toJSON()).not.toHaveProperty('roles');
  });

  it.each([{ roles: [] }, { roles: ['LECTURER', 'HOD'] }])('rejects an invalid role assignment $roles', async ({ roles }) => {
    const user = new UserModel({ roles });
    await expect(user.validate(['roles'])).rejects.toThrow('Each account must have exactly one role.');
  });
});

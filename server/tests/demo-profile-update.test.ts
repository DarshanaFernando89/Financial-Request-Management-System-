import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import demoRoutes from '../src/routes/demoRoutes.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';

const app = express();
app.locals.demoMode = true;
app.use(express.json());
app.use('/api', demoRoutes);
app.use(errorMiddleware);

describe('demo profile updates', () => {
  it('updates name and email, keeps other profile fields, and supports login with the new email', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@uor.lk', password: 'Password123!' });
    const token = login.body.token;
    const original = await request(app).get('/api/users/me/profile').auth(token, { type: 'bearer' });
    const saved = await request(app).put('/api/users/me/profile').auth(token, { type: 'bearer' })
      .send({ fullName: 'Updated Demo Administrator', email: ' Updated.Admin@UOR.LK ' });
    expect(saved.status).toBe(200);
    expect(saved.body.fullName).toBe('Updated Demo Administrator');
    expect(saved.body.email).toBe('updated.admin@uor.lk');
    expect(saved.body.contactNo).toBe(original.body.contactNo);
    const refreshed = await request(app).get('/api/auth/me').auth(token, { type: 'bearer' });
    expect(refreshed.body.user.email).toBe('updated.admin@uor.lk');
    expect((await request(app).post('/api/auth/login').send({ email: 'updated.admin@uor.lk', password: 'Password123!' })).status).toBe(200);

    const conflict = await request(app).put('/api/users/me/profile').auth(token, { type: 'bearer' }).send({ email: 'lecturer@uor.lk' });
    expect(conflict.status).toBe(409);
    const invalid = await request(app).put('/api/users/me/profile').auth(token, { type: 'bearer' }).send({ fullName: '   ' });
    expect(invalid.status).toBe(400);
  });
});

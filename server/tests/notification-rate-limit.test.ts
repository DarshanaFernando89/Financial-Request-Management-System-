import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';

describe('notification polling rate limits', () => {
  it('keeps profile access available after polling is throttled, while limiting both budgets', async () => {
    app.locals.demoMode = true;
    const login = await request(app).post('/api/auth/login')
      .send({ email: 'admin@uor.lk', password: 'Password123!' });
    expect(login.status).toBe(200);
    const token = login.body.token;

    for (let index = 0; index < 500; index++) {
      const poll = await request(app).get('/api/notifications').auth(token, { type: 'bearer' });
      expect(poll.status).toBe(200);
    }
    const blockedPoll = await request(app).get('/api/notifications/').auth(token, { type: 'bearer' });
    expect(blockedPoll.status).toBe(429);
    expect(Number(blockedPoll.headers['retry-after'])).toBeGreaterThan(0);
    expect(blockedPoll.body.message).toContain('Too many requests');

    const profile = await request(app).get('/api/users/me/profile').auth(token, { type: 'bearer' });
    expect(profile.status).toBe(200);
    expect(profile.body.email).toBe('admin@uor.lk');
    expect(Number(profile.headers['ratelimit-remaining'])).toBe(498);

    // Writes stay in the normal budget even when the polling budget is exhausted.
    const markRead = await request(app).patch('/api/notifications/read-all').auth(token, { type: 'bearer' });
    expect(markRead.status).toBe(200);
    expect(Number(markRead.headers['ratelimit-remaining'])).toBe(497);
    for (let index = 0; index < 497; index++) {
      expect((await request(app).get('/api/health')).status).toBe(200);
    }
    const blockedProfile = await request(app).get('/api/users/me/profile').auth(token, { type: 'bearer' });
    expect(blockedProfile.status).toBe(429);
    expect(blockedProfile.body.message).toContain('Too many requests');
  }, 20000);
});

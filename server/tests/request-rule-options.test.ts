import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import demoRoutes from '../src/routes/demoRoutes.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';

const app = express();
app.locals.demoMode = true;
app.use(express.json());
app.use('/api', demoRoutes);
app.use(errorMiddleware);
let token: string;

beforeAll(async () => {
  const login = await request(app).post('/api/auth/login').send({ email: 'admin@uor.lk', password: 'Password123!' });
  token = login.body.token;
});

function options() {
  return request(app).get('/api/requests/rules/active').auth(token, { type: 'bearer' });
}

describe('requester rule choices in demo mode', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/requests/rules/active')).status).toBe(401);
  });

  it('shows the same rule names as admin and keeps the linked forms', async () => {
    const admin = await request(app).get('/api/admin/approval-rules').auth(token, { type: 'bearer' });
    const response = await options();
    expect(response.status).toBe(200);
    expect(response.body.items.map((rule: any) => rule.name)).toEqual(admin.body.items.map((rule: any) => rule.name));
    const academic = response.body.items.find((rule: any) => rule.name === 'Small academic claims');
    expect(academic.requestTypes.map((type: any) => type.name)).toEqual(['Lecture Hours Payment', 'Paper Marking']);
    expect(academic.requestTypes[0].fields.length).toBeGreaterThan(0);
    expect(academic.requestTypes[0].requiredDocuments.length).toBeGreaterThan(0);
    expect(response.body.items.some((rule: any) => rule.requestTypes.some((type: any) => type.name === 'General Reimbursements'))).toBe(false);
  });

  it('rejects an amount or request type outside the selected rule', async () => {
    for (const payload of [
      { requestType: 'type-lecture-hours', approvalRule: 'rule-small-academic', amount: 30000 },
      { requestType: 'type-travel-fuel', approvalRule: 'rule-small-academic', amount: 100 },
      { requestType: 'type-lecture-hours', approvalRule: 'missing-rule', amount: 100 }
    ]) {
      const response = await request(app).post('/api/requests').auth(token, { type: 'bearer' })
        .send({ ...payload, title: 'Invalid rule selection', submit: false });
      expect(response.status).toBe(422);
    }
  });

  it('updates choices after admin edits and preserves the chosen rule for drafts and submission', async () => {
    const createdType = await request(app).post('/api/admin/request-types').auth(token, { type: 'bearer' })
      .send({ name: 'Test claim form', code: 'TEST_CLAIM', fields: [], requiredDocuments: [], isActive: true });
    const typeId = createdType.body._id;
    const createdRule = await request(app).post('/api/admin/approval-rules').auth(token, { type: 'bearer' })
      .send({ name: 'Exact admin claim name', requestTypes: [typeId], minAmount: 100, maxAmount: 500, workflowRoles: ['DEAN'], isActive: true });
    const ruleId = createdRule.body._id;
    const updateRule = (body: any) => request(app).put(`/api/admin/approval-rules/${ruleId}`).auth(token, { type: 'bearer' }).send(body);
    const choice = async () => (await options()).body.items.find((rule: any) => rule._id === ruleId);

    expect((await choice()).name).toBe('Exact admin claim name');
    await updateRule({ name: 'Renamed admin claim' });
    expect((await choice()).name).toBe('Renamed admin claim');

    const draft = await request(app).post('/api/requests').auth(token, { type: 'bearer' })
      .send({ approvalRule: ruleId, requestType: typeId, amount: 200, title: 'Draft using selected rule', submit: false });
    expect(draft.status).toBe(201);
    expect(draft.body.approvalRule).toBe(ruleId);

    await updateRule({ isActive: false });
    expect(await choice()).toBeUndefined();
    expect((await request(app).post(`/api/requests/${draft.body._id}/submit`).auth(token, { type: 'bearer' })).status).toBe(422);
    await updateRule({ isActive: true });
    const submitted = await request(app).post(`/api/requests/${draft.body._id}/submit`).auth(token, { type: 'bearer' });
    expect(submitted.status).toBe(200);
    expect(submitted.body.workflowSteps.map((step: any) => step.role)).toEqual(['DEAN', 'FINANCE_OFFICER']);

    for (const amount of [100, 500]) {
      const multipart = await request(app).post('/api/requests').auth(token, { type: 'bearer' })
        .field('approvalRule', ruleId).field('requestType', typeId).field('amount', String(amount))
        .field('title', 'Multipart request at range boundary').field('submit', 'true');
      expect(multipart.status).toBe(201);
      expect(multipart.body.approvalRule).toBe(ruleId);
      expect(multipart.body.currentAssignedRole).toBe('DEAN');
    }

    await request(app).put(`/api/admin/request-types/${typeId}`).auth(token, { type: 'bearer' }).send({ isActive: false });
    expect(await choice()).toBeUndefined();
    await request(app).put(`/api/admin/request-types/${typeId}`).auth(token, { type: 'bearer' }).send({ isActive: true });
    expect(await choice()).toBeDefined();
    expect((await request(app).delete(`/api/admin/approval-rules/${ruleId}`).auth(token, { type: 'bearer' })).status).toBe(200);
    expect(await choice()).toBeUndefined();
    expect((await request(app).post('/api/requests').auth(token, { type: 'bearer' })
      .send({ approvalRule: ruleId, requestType: typeId, amount: 200, title: 'Stale selection', submit: false })).status).toBe(422);
  });
});

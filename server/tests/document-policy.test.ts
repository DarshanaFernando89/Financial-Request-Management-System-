import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import demoRoutes from '../src/routes/demoRoutes.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';
import { documentPolicy, validateDocumentSettings, assertAcceptedDocuments, DEFAULT_FILE_TYPES } from '../src/utils/documentPolicy.js';
import { ApprovalRuleModel } from '../src/models/ApprovalRule.js';
import { validateDocumentFiles } from '../../client/src/utils/documentPolicy.ts';

describe('supporting document settings', () => {
  it('preserves legacy requirements and distinguishes no documents from inherited documents', () => {
    const type = { requiredDocuments: ['Old receipt'] };
    expect(documentPolicy(undefined, type)).toEqual({ requiredDocuments: ['Old receipt'], acceptedFileTypes: DEFAULT_FILE_TYPES });
    expect(documentPolicy({ requiredDocuments: null }, type).requiredDocuments).toEqual(['Old receipt']);
    expect(documentPolicy({ requiredDocuments: [] }, type).requiredDocuments).toEqual([]);
    expect(documentPolicy({ requiredDocuments: ['New receipt'] }, type).requiredDocuments).toEqual(['New receipt']);
    const legacy = new ApprovalRuleModel({ name: 'Legacy', requestTypes: [], minAmount: 0, workflowRoles: ['HOD'] });
    expect(legacy.requiredDocuments).toBeUndefined();
    expect(legacy.acceptedFileTypes).toBeUndefined();
  });

  it.each([{ acceptedFileTypes: [] }, { acceptedFileTypes: null }, { acceptedFileTypes: ['.exe'] }, { requiredDocuments: 'Invoice' }, { requiredDocuments: [' '] }])('rejects invalid settings %j', (body) => {
    expect(() => validateDocumentSettings(body as any)).toThrow();
  });

  it('normalizes names and extensions and requires the filename and MIME type to agree', () => {
    const settings = { requiredDocuments: [' Receipt ', 'Receipt'], acceptedFileTypes: ['.PDF', '.pdf'] };
    validateDocumentSettings(settings);
    expect(settings).toEqual({ requiredDocuments: ['Receipt'], acceptedFileTypes: ['.pdf'] });
    const policy = documentPolicy(settings);
    expect(() => assertAcceptedDocuments([{ originalName: 'Receipt.PDF', mimeType: 'application/pdf' }], policy)).not.toThrow();
    expect(() => assertAcceptedDocuments([{ originalName: 'Receipt.pdf', mimeType: 'image/png' }], policy)).toThrow('not accepted');
    expect(() => assertAcceptedDocuments([{ originalName: 'Receipt.exe', mimeType: 'application/pdf' }], policy)).toThrow('not accepted');
  });

  it('checks selected file extensions and size in the requester form', () => {
    expect(validateDocumentFiles([{ name: 'receipt.PDF', size: 50 } as File], ['.pdf'])).toBe('');
    expect(validateDocumentFiles([{ name: 'receipt.png', size: 50 } as File], ['.pdf'])).toContain('not accepted');
    expect(validateDocumentFiles([{ name: 'receipt.pdf', size: 10 * 1024 * 1024 + 1 } as File], ['.pdf'])).toContain('10 MB');
  });
});

const app = express();
app.locals.demoMode = true;
app.use(express.json());
app.use('/api', demoRoutes);
app.use(errorMiddleware);
let adminToken: string;
let lecturerToken: string;
let hodToken: string;
let typeId: string;
let ruleId: string;

beforeAll(async () => {
  adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin@uor.lk', password: 'Password123!' })).body.token;
  lecturerToken = (await request(app).post('/api/auth/login').send({ email: 'lecturer@uor.lk', password: 'Password123!' })).body.token;
  const login = await request(app).post('/api/auth/login').send({ email: 'hod@uor.lk', password: 'Password123!' });
  hodToken = (await request(app).post('/api/auth/select-role').auth(login.body.token, { type: 'bearer' }).send({ role: 'HOD' })).body.token;
  const type = await request(app).post('/api/admin/request-types').auth(adminToken, { type: 'bearer' }).send({ name: 'Document policy test', code: 'DOCUMENT_POLICY', fields: [], requiredDocuments: ['Legacy receipt'], isActive: true });
  typeId = type.body._id;
  const rule = await request(app).post('/api/admin/approval-rules').auth(adminToken, { type: 'bearer' }).send({ name: 'PDF receipt rule', requestTypes: [typeId], minAmount: 0, workflowRoles: ['HOD'], requiredDocuments: ['Receipt'], acceptedFileTypes: ['.pdf'] });
  expect(rule.status).toBe(201);
  ruleId = rule.body._id;
});

function update(body: any) { return request(app).put(`/api/admin/approval-rules/${ruleId}`).auth(adminToken, { type: 'bearer' }).send(body); }
function create(submit: boolean) { return request(app).post('/api/requests').auth(lecturerToken, { type: 'bearer' }).send({ requestType: typeId, approvalRule: ruleId, amount: 100, title: 'Document policy claim', submit }); }
function upload(id: string, filename: string, contentType: string, description = 'Receipt') {
  return request(app).post(`/api/requests/${id}/upload-document`).auth(lecturerToken, { type: 'bearer' }).field('description', description).attach('file', Buffer.from('document'), { filename, contentType });
}

describe('rule documents through the API', () => {
  it('exposes saved settings to requesters and rejects invalid edits', async () => {
    const choices = await request(app).get('/api/requests/rules/active').auth(lecturerToken, { type: 'bearer' });
    expect(choices.body.items.find((item: any) => item._id === ruleId)).toMatchObject({ requiredDocuments: ['Receipt'], acceptedFileTypes: ['.pdf'] });
    expect((await update({ acceptedFileTypes: [] })).status).toBe(400);
    expect((await update({ requiredDocuments: [''] })).status).toBe(400);
  });

  it('allows incomplete drafts, enforces rule-specific formats on every upload, and blocks submission until complete', async () => {
    expect((await create(true)).status).toBe(400);
    const draft = await create(false);
    expect(draft.status).toBe(201);
    const id = draft.body._id;
    const policy = await request(app).get(`/api/requests/${id}/document-policy`).auth(lecturerToken, { type: 'bearer' });
    expect(policy.body).toEqual({ requiredDocuments: ['Receipt'], acceptedFileTypes: ['.pdf'] });
    expect((await request(app).post(`/api/requests/${id}/submit`).auth(lecturerToken, { type: 'bearer' })).status).toBe(400);
    expect((await upload(id, 'receipt.png', 'image/png')).status).toBe(400);
    expect((await upload(id, 'receipt.pdf', 'image/png')).status).toBe(400);
    const invalidCreate = await request(app).post('/api/requests').auth(lecturerToken, { type: 'bearer' })
      .field('requestType', typeId).field('approvalRule', ruleId).field('amount', '100').field('title', 'Wrong format').field('submit', 'false')
      .attach('files', Buffer.from('image'), { filename: 'receipt.png', contentType: 'image/png' });
    expect(invalidCreate.status).toBe(400);
    expect((await upload(id, 'receipt.PDF', 'application/pdf')).status).toBe(201);
    expect((await request(app).post(`/api/requests/${id}/submit`).auth(lecturerToken, { type: 'bearer' })).status).toBe(200);

    expect((await request(app).post(`/api/approvals/${id}/reject`).auth(hodToken, { type: 'bearer' }).send({ remarks: 'Please add invoice' })).status).toBe(200);
    expect((await update({ requiredDocuments: ['Receipt', 'Invoice'] })).status).toBe(200);
    expect((await request(app).post(`/api/requests/${id}/resubmit`).auth(lecturerToken, { type: 'bearer' }).send({})).status).toBe(400);
    expect((await upload(id, 'invoice.pdf', 'application/pdf', 'Invoice')).status).toBe(201);
    expect((await request(app).post(`/api/requests/${id}/resubmit`).auth(lecturerToken, { type: 'bearer' }).send({})).status).toBe(200);

    expect((await request(app).post(`/api/approvals/${id}/request-info`).auth(hodToken, { type: 'bearer' }).send({ remarks: 'Please clarify receipt' })).status).toBe(200);
    const clarification = (filename: string, contentType: string) => request(app).post(`/api/requests/${id}/respond-clarification`).auth(lecturerToken, { type: 'bearer' })
      .field('remarks', 'Supporting clarification').attach('files', Buffer.from('document'), { filename, contentType });
    expect((await clarification('receipt.png', 'image/png')).status).toBe(400);
    expect((await clarification('receipt.pdf', 'application/pdf')).status).toBe(200);
  });

  it('lets admin remove all requirements for one rule without changing its shared request type', async () => {
    expect((await update({ requiredDocuments: [] })).status).toBe(200);
    expect((await create(true)).status).toBe(201);
    expect((await update({ requiredDocuments: null })).status).toBe(200);
    const missing = await create(true);
    expect(missing.status).toBe(400);
    expect(missing.body.message).toContain('Legacy receipt');
    const types = await request(app).get('/api/admin/request-types').auth(adminToken, { type: 'bearer' });
    expect(types.body.items.find((type: any) => type._id === typeId).requiredDocuments).toEqual(['Legacy receipt']);
  });
});

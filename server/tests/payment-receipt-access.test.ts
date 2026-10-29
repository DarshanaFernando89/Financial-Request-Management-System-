import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOne, buildPdf } = vi.hoisted(() => ({ findOne: vi.fn(), buildPdf: vi.fn() }));
vi.mock('../src/models/Request.js', () => ({ RequestModel: { findOne } }));
vi.mock('../src/services/reportService.js', () => ({ buildPaymentReceiptPdfBuffer: buildPdf }));
vi.mock('../src/middleware/authMiddleware.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    const role = req.headers['x-test-role'];
    if (!role) return res.sendStatus(401);
    req.user = { userId: 'reviewer', roles: [role], activeRole: role };
    next();
  },
  requireActiveRole: (_req: any, _res: any, next: any) => next()
}));
import financeRoutes from '../src/routes/financeRoutes.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';

const app = express();
app.use(express.json());
app.use('/finance', financeRoutes);
app.use(errorMiddleware);
let claim: any;

beforeEach(() => {
  vi.clearAllMocks();
  claim = {
    _id: '000000000000000000000001', requestId: 'REQ-001', status: 'PAID',
    payment: { paidAt: new Date(), amount: 5000, referenceNo: '1234' },
    workflowSteps: [{ role: 'HOD' }, { role: 'DEAN' }, { role: 'FINANCE_OFFICER' }],
    approvalHistory: [], documents: []
  };
  findOne.mockImplementation(() => ({ populate: async () => claim }));
  buildPdf.mockResolvedValue(Buffer.from('%PDF-test-receipt'));
});

describe('payment receipt access', () => {
  it.each(['HOD', 'DEAN', 'FINANCE_OFFICER'])('lets %s retrieve a paid request receipt', async (role) => {
    const response = await request(app).get('/finance/REQ-001/payment-receipt').set('x-test-role', role);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain('payment-receipt-REQ-001.pdf');
    expect(findOne).toHaveBeenCalledWith({ requestId: 'REQ-001' });
    expect(buildPdf).toHaveBeenCalledWith(claim);
  });

  it('accepts the database ID used by the download and print buttons', async () => {
    expect((await request(app).get(`/finance/${claim._id}/payment-receipt`).set('x-test-role', 'HOD')).status).toBe(200);
    expect(findOne).toHaveBeenCalledWith({ _id: claim._id });
  });

  it('allows historical approvers when a workflow has changed', async () => {
    claim.workflowSteps = [];
    claim.approvalHistory = [{ role: 'DEAN' }];
    expect((await request(app).get('/finance/REQ-001/payment-receipt').set('x-test-role', 'DEAN')).status).toBe(200);
  });

  it.each(['HOD', 'DEAN'])('denies %s access to an unrelated receipt', async (role) => {
    claim.workflowSteps = [{ role: 'FINANCE_OFFICER' }];
    expect((await request(app).get('/finance/REQ-001/payment-receipt').set('x-test-role', role)).status).toBe(403);
    expect(buildPdf).not.toHaveBeenCalled();
  });

  it.each(['HOD', 'DEAN'])('does not grant %s access to other finance endpoints', async (role) => {
    for (const path of ['pending-payments', 'payment-history', 'REQ-001']) {
      expect((await request(app).get(`/finance/${path}`).set('x-test-role', role)).status).toBe(403);
    }
    for (const action of ['mark-paid', 'request-info', 'reject']) {
      expect((await request(app).post(`/finance/REQ-001/${action}`).set('x-test-role', role).send({})).status).toBe(403);
    }
    expect(findOne).not.toHaveBeenCalled();
  });

  it.each(['PAYMENT_PENDING', 'REJECTED'])('does not generate a receipt for a %s request', async (status) => {
    claim.status = status;
    expect((await request(app).get('/finance/REQ-001/payment-receipt').set('x-test-role', 'HOD')).status).toBe(422);
    expect(buildPdf).not.toHaveBeenCalled();
  });

  it('requires recorded payment details', async () => {
    claim.payment = undefined;
    expect((await request(app).get('/finance/REQ-001/payment-receipt').set('x-test-role', 'FINANCE_OFFICER')).status).toBe(422);
  });

  it('returns not found for a missing request', async () => {
    claim = null;
    expect((await request(app).get('/finance/REQ-001/payment-receipt').set('x-test-role', 'HOD')).status).toBe(404);
  });

  it('requires authentication and an allowed role', async () => {
    expect((await request(app).get('/finance/REQ-001/payment-receipt')).status).toBe(401);
    expect((await request(app).get('/finance/REQ-001/payment-receipt').set('x-test-role', 'LECTURER')).status).toBe(403);
    expect(findOne).not.toHaveBeenCalled();
  });
});

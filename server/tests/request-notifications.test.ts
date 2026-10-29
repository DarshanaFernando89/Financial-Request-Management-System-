import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(), find: vi.fn(), findOne: vi.fn(), findOneAndUpdate: vi.fn(),
  getRequest: vi.fn(), findRequest: vi.fn(), complete: vi.fn(), reject: vi.fn(), info: vi.fn(),
  record: vi.fn(), audit: vi.fn(), notifyRole: vi.fn(), notifyUser: vi.fn()
}));
vi.mock('../src/models/Notification.js', () => ({ NotificationModel: {
  updateMany: mocks.updateMany, find: mocks.find, findOne: mocks.findOne,
  findOneAndUpdate: mocks.findOneAndUpdate
} }));
vi.mock('../src/models/Request.js', () => ({ RequestModel: { findOne: mocks.findRequest } }));
vi.mock('../src/models/Approval.js', () => ({ ApprovalModel: { create: mocks.record } }));
vi.mock('../src/services/auditService.js', () => ({ writeAuditLog: mocks.audit }));
vi.mock('../src/services/notificationService.js', () => ({ notifyRole: mocks.notifyRole, notifyUser: mocks.notifyUser }));
vi.mock('../src/services/workflowService.js', async (importOriginal) => ({
  ...await importOriginal<object>(), getRequestByIdOrRequestId: mocks.getRequest,
  completeCurrentStep: mocks.complete, rejectRequest: mocks.reject, requestMoreInfo: mocks.info
}));

import { getRequest } from '../src/controllers/requestController.js';
import { approve, reject, requestInfo, verifyForward } from '../src/controllers/approvalController.js';
import { financeRequestDetails, financeReject, financeRequestInfo } from '../src/controllers/financeController.js';
import { getNotification, listNotifications, markAllNotificationsRead, markNotificationRead } from '../src/controllers/notificationController.js';
import { notificationForUser, markRequestNotificationsRead } from '../src/services/notificationReadService.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';

const userId = '000000000000000000000001';
const requestId = '000000000000000000000010';
const session = { userId, roles: ['HOD'], activeRole: 'HOD' };
const recipientFilter = { $or: [{ user: userId }, { user: null, role: { $in: ['HOD'] } }] };
const app = express();
app.use(express.json());
app.use((req, _res, next) => { (req as any).user = session; next(); });
app.get('/requests/:id', getRequest);
app.get('/finance/:requestId', financeRequestDetails);
app.post('/approvals/:requestId/approve', approve);
app.post('/approvals/:requestId/reject', reject);
app.post('/approvals/:requestId/verify-forward', verifyForward);
app.post('/approvals/:requestId/request-info', requestInfo);
app.post('/finance/:requestId/reject', financeReject);
app.post('/finance/:requestId/request-info', financeRequestInfo);
app.get('/notifications', listNotifications);
app.get('/notifications/:id', getNotification);
app.patch('/notifications/read-all', markAllNotificationsRead);
app.patch('/notifications/:id/read', markNotificationRead);
app.use(errorMiddleware);

function query(value: any) {
  const result: any = Promise.resolve(value);
  result.select = () => result;
  result.populate = () => result;
  result.sort = () => result;
  result.limit = (limit: number) => Promise.resolve(value.slice(0, limit));
  return result;
}

beforeEach(() => {
  vi.resetAllMocks();
  const item = {
    _id: requestId, requestId: 'REQ-001', status: 'UNDER_REVIEW', currentAssignedRole: 'DEAN',
    requester: '000000000000000000000002', populate: async function () { return this; }
  };
  mocks.getRequest.mockResolvedValue(item);
  mocks.findRequest.mockImplementation(() => query(item));
  mocks.complete.mockResolvedValue(item);
  mocks.reject.mockResolvedValue(item);
  mocks.info.mockResolvedValue(item);
  mocks.updateMany.mockResolvedValue({ modifiedCount: 1 });
  mocks.find.mockImplementation(() => query([]));
});

describe('reading request notifications', () => {
  it.each(['/requests/REQ-001', `/requests/${requestId}`, `/finance/${requestId}`])(
    'marks existing related notifications read when opening %s', async (path) => {
      const started = Date.now();
      const response = await request(app).get(path);
      expect(response.status).toBe(200);
      const [filter, update] = mocks.updateMany.mock.calls[0];
      expect(filter).toEqual({ ...recipientFilter, relatedRequest: requestId,
        isRead: { $ne: true }, readBy: { $ne: userId }, createdAt: { $lte: expect.any(Date) } });
      expect(filter.createdAt.$lte.getTime()).toBeGreaterThanOrEqual(started);
      expect(update).toEqual({ $addToSet: { readBy: userId } });
    }
  );

  it('does not change notifications when the request is missing', async () => {
    mocks.getRequest.mockResolvedValue(null);
    expect((await request(app).get('/requests/missing')).status).toBe(404);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it.each(['approve', 'reject', 'verify-forward', 'request-info'])('marks notifications after successful %s', async (action) => {
    expect((await request(app).post(`/approvals/${requestId}/${action}`).send({ remarks: 'Reviewed' })).status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledOnce();
    expect(mocks.updateMany.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.record.mock.invocationCallOrder[0]);
    const notificationCall = mocks.notifyRole.mock.invocationCallOrder[0] ?? mocks.notifyUser.mock.invocationCallOrder[0];
    expect(mocks.updateMany.mock.invocationCallOrder[0]).toBeLessThan(notificationCall);
  });

  it.each(['reject', 'request-info'])('marks notifications after finance %s', async (action) => {
    expect((await request(app).post(`/finance/${requestId}/${action}`).send({ remarks: 'Reviewed' })).status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledOnce();
    expect(mocks.updateMany.mock.invocationCallOrder[0]).toBeLessThan(mocks.notifyUser.mock.invocationCallOrder[0]);
  });

  it('does not mark notifications when an approval fails', async () => {
    mocks.complete.mockRejectedValue(new Error('Approval failed'));
    expect((await request(app).post(`/approvals/${requestId}/approve`).send({})).status).toBe(500);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('limits updates to notifications created by the time the request was opened', async () => {
    const openedAt = new Date('2026-10-29T10:00:00Z');
    await markRequestNotificationsRead(session, requestId, openedAt);
    expect(mocks.updateMany.mock.calls[0][0].createdAt).toEqual({ $lte: openedAt });
  });

  it('keeps role notifications unread for other recipients and new notifications unread', () => {
    const shared = { role: 'HOD', isRead: false, readBy: [userId] };
    expect(notificationForUser(shared, userId).isRead).toBe(true);
    expect(notificationForUser(shared, 'another-hod').isRead).toBe(false);
    expect(notificationForUser({ role: 'HOD', isRead: false }, userId).isRead).toBe(false);
    expect(notificationForUser(shared, userId)).not.toHaveProperty('readBy');
    expect(notificationForUser({ isRead: true }, userId).isRead).toBe(true);
  });
});

describe('notification list and manual read actions', () => {
  it('prioritizes an older unread item over newer read history and normalizes per-user status', async () => {
    const unread = { _id: 'old', isRead: false, createdAt: '2026-01-01' };
    const read = { _id: 'new', isRead: false, readBy: [userId], createdAt: '2026-10-29' };
    mocks.find.mockReturnValueOnce(query([unread])).mockReturnValueOnce(query([read]));
    const response = await request(app).get('/notifications');
    expect(response.status).toBe(200);
    expect(response.body.items.map((item: any) => [item._id, item.isRead])).toEqual([['old', false], ['new', true]]);
    expect(mocks.find.mock.calls[0][0]).toEqual({ ...recipientFilter, isRead: { $ne: true }, readBy: { $ne: userId } });
    expect(mocks.find.mock.calls[1][0]).toEqual({ _id: { $nin: ['old'] }, $and: [recipientFilter, { $or: [{ isRead: true }, { readBy: userId }] }] });
  });

  it('does not load read history when 100 unread notifications fill the list', async () => {
    mocks.find.mockReturnValue(query(Array.from({ length: 101 }, (_, i) => ({ _id: String(i), isRead: false }))));
    const response = await request(app).get('/notifications');
    expect(response.body.items).toHaveLength(100);
    expect(mocks.find).toHaveBeenCalledOnce();
  });

  it('marks all read only for this recipient, retaining notification history', async () => {
    expect((await request(app).patch('/notifications/read-all')).status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      { ...recipientFilter, isRead: { $ne: true }, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );
  });

  it('checks the recipient when marking an individual notification read', async () => {
    mocks.findOneAndUpdate.mockResolvedValue({ _id: 'alert', isRead: false, readBy: [userId] });
    const response = await request(app).patch('/notifications/alert/read');
    expect(response.body.isRead).toBe(true);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'alert', ...recipientFilter }, { $addToSet: { readBy: userId } }, { new: true }
    );
  });

  it('does not expose or update a notification outside the recipient filter', async () => {
    mocks.findOne.mockReturnValue(query(null));
    mocks.findOneAndUpdate.mockResolvedValue(null);
    expect((await request(app).get('/notifications/other')).status).toBe(404);
    expect(mocks.findOne).toHaveBeenCalledWith({ _id: 'other', ...recipientFilter });
    expect((await request(app).patch('/notifications/other/read')).status).toBe(404);
  });
});

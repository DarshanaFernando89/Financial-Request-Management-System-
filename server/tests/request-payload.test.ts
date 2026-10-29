import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequestModel } from '../src/models/Request.js';
import { pendingApprovals } from '../src/controllers/approvalController.js';
import { downloadDocument } from '../src/controllers/requestController.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';
import { NotificationModel } from '../src/models/Notification.js';
import { listNotifications } from '../src/controllers/notificationController.js';
import { getNotificationAction } from '../../client/src/utils/notificationActions.ts';

afterEach(() => vi.restoreAllMocks());

const bytes = Buffer.from('stored attachment contents');
function storedRequest() {
  return {
    _id: new mongoose.Types.ObjectId(), requestId: 'REQ-001', title: 'Claim', amount: 100,
    documents: [{ _id: 'file-1', originalName: 'invoice.pdf', mimeType: 'application/pdf',
      fileUrl: '/api/documents/file-1', fileBuffer: bytes }]
  };
}

describe('request attachment payloads', () => {
  it('excludes bytes from JSON without removing bytes from the stored document or update data', () => {
    const model = RequestModel.hydrate(storedRequest());
    const json = JSON.parse(JSON.stringify(model));
    expect(json.documents[0]).not.toHaveProperty('fileBuffer');
    expect(json.documents[0].fileUrl).toBe('/api/documents/file-1');
    expect(Buffer.from(model.documents[0].fileBuffer!)).toEqual(bytes);
    expect(model.toObject().documents[0].fileBuffer).toBeDefined();
    // Replacing an attachment array during clarification must retain existing bytes.
    model.documents = model.documents.filter((document) => document._id === 'file-1') as any;
    expect(Buffer.from(model.documents[0].fileBuffer!)).toEqual(bytes);
  });

  it('excludes file bytes in the database query for the HOD queue', async () => {
    const find = vi.spyOn(RequestModel.collection, 'find').mockReturnValue({ toArray: async () => [] } as any);
    const app = express();
    app.get('/pending', (req, _res, next) => { (req as any).user = { activeRole: 'HOD' }; next(); }, pendingApprovals);
    app.use(errorMiddleware);
    expect((await request(app).get('/pending')).status).toBe(200);
    expect(find.mock.calls[0][1]?.projection).toEqual({ 'documents.fileBuffer': 0 });
  });

  it('still downloads the original stored bytes', async () => {
    const find = vi.spyOn(RequestModel.collection, 'findOne').mockResolvedValue(storedRequest() as any);
    const app = express();
    app.get('/documents/:documentId', downloadDocument);
    app.use(errorMiddleware);
    const response = await request(app).get('/documents/file-1');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.body).toEqual(bytes);
    expect(find.mock.calls[0][1]?.projection?.['documents.fileBuffer']).not.toBe(0);
  });

  it('loads notification request summaries while keeping the HOD review link working', async () => {
    const requestId = new mongoose.Types.ObjectId();
    vi.spyOn(NotificationModel.collection, 'find').mockReturnValue({ toArray: async () => [{
      _id: new mongoose.Types.ObjectId(), title: 'Request assigned', role: 'HOD', relatedRequest: requestId
    }] } as any);
    const find = vi.spyOn(RequestModel.collection, 'find').mockReturnValue({ toArray: async () => [{
      _id: requestId, requestId: 'REQ-001', status: 'UNDER_REVIEW', currentAssignedRole: 'HOD'
    }] } as any);
    const app = express();
    app.get('/notifications', (req, _res, next) => {
      (req as any).user = { userId: new mongoose.Types.ObjectId().toString(), roles: ['HOD'] };
      next();
    }, listNotifications);
    app.use(errorMiddleware);
    const response = await request(app).get('/notifications');
    expect(response.status).toBe(200);
    expect(find.mock.calls[0][1]?.projection).toEqual({ requestId: 1, status: 1, currentAssignedRole: 1 });
    expect(getNotificationAction(response.body.items[0], 'HOD')).toMatchObject({
      label: 'Review Request', to: `/approvals/review/${requestId}`
    });
  });
});

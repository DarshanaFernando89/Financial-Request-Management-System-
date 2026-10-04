import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { RequestModel } from '../src/models/Request.js';

describe('Request document ids', () => {
  it('accepts string document ids generated for uploaded files', () => {
    const request = new RequestModel({
      requestId: 'REQ-001',
      requester: new mongoose.Types.ObjectId(),
      requestType: new mongoose.Types.ObjectId(),
      title: 'Test request',
      amount: 100,
      documents: [
        {
          _id: 'user-123-456',
          filename: 'user-123-456.pdf',
          originalName: 'invoice.pdf',
          fileUrl: '/api/documents/user-123-456',
          mimeType: 'application/pdf',
          size: 2048,
          uploadedBy: new mongoose.Types.ObjectId(),
          uploadedByRole: 'REQUESTER',
          description: 'Invoice'
        }
      ]
    });

    expect(request.validateSync()).toBeUndefined();
    expect(String(request.documents[0]._id)).toBe('user-123-456');
  });
});

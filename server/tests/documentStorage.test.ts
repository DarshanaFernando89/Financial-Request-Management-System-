import { describe, expect, it } from 'vitest';
import { buildStoredDocumentData } from '../src/services/fileService.js';

describe('buildStoredDocumentData', () => {
  it('stores file bytes and exposes a database-backed URL', () => {
    const payload = buildStoredDocumentData(
      {
        originalname: 'Invoice.pdf',
        mimetype: 'application/pdf',
        size: 123,
        buffer: Buffer.from('hello-world')
      },
      'doc-123',
      {
        userId: 'user-1',
        activeRole: 'requester'
      },
      'Invoice copy'
    );

    expect(payload.storageType).toBe('db');
    expect(payload.fileBuffer).toEqual(Buffer.from('hello-world'));
    expect(payload.fileUrl).toBe('/api/documents/doc-123');
    expect(payload.originalName).toBe('Invoice.pdf');
  });
});

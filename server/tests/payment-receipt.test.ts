import { describe, expect, it } from 'vitest';
import { buildPaymentReceiptPdfBuffer } from '../src/services/reportService.js';

describe('payment receipt PDF generation', () => {
  it('creates a PDF buffer with receipt content for a paid request', async () => {
    const buffer = await buildPaymentReceiptPdfBuffer(
      {
        requestId: '262000020',
        title: 'Travel Claim',
        description: 'Travel reimbursement',
        amount: 1250,
        currency: 'LKR',
        requesterSnapshot: {
          name: 'Kasun Perera',
          email: 'kasun@uor.lk',
          department: 'Electrical and Information Engineering'
        },
        requestType: { name: 'Travel Claim' },
        status: 'PAID',
        payment: {
          paidAt: '2025-01-12T00:00:00.000Z',
          amount: 1250,
          referenceNo: 'REF-001',
          remarks: 'Processed successfully'
        }
      },
      []
    );

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});

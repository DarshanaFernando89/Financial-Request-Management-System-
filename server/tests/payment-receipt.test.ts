import { describe, expect, it } from 'vitest';
import { inflateSync } from 'node:zlib';
import { buildPaymentReceiptPdfBuffer } from '../src/services/reportService.js';

// Inspect actual PDFKit output without adding a runtime PDF parser dependency.
function inspectPdf(buffer: Buffer) {
  const pdf = buffer.toString('latin1');
  const text = [...pdf.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map((match) => {
    try {
      const content = inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
      return [...content.matchAll(/<([\da-f]+)>/gi)].map((part) => Buffer.from(part[1], 'hex').toString('latin1')).join('');
    } catch { return ''; }
  }).join('\n');
  return { text, pages: (pdf.match(/\/Type \/Page\b/g) || []).length, hasLogo: pdf.includes('/Subtype /Image') };
}

const paidRequest = {
  requestId: '262000022', title: 'Fuel reimbursement', status: 'PAID', amount: 6500, currency: 'LKR',
  requesterSnapshot: { name: 'Dr. L. Perera', department: 'Engineering', email: 'lecturer@uor.lk' },
  requestType: { name: 'Fuel bills' },
  payment: { amount: 5000, paidAt: '2026-08-01T20:00:00Z', referenceNo: 'REF-1234', remarks: 'Paid' }
};

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
          department: 'General'
        },
        requestType: { name: 'Travel Claim' },
        status: 'PAID',
        payment: {
          paidAt: '2025-01-12T00:00:00.000Z',
          amount: 1250,
          referenceNo: 'REF-001',
          remarks: 'Processed successfully'
        }
      }
    );

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('embeds the university logo and keeps a short receipt on one page with the actual payment amount and local date', async () => {
    const result = inspectPdf(await buildPaymentReceiptPdfBuffer(paidRequest));
    expect(result.hasLogo).toBe(true);
    expect(result.pages).toBe(1);
    for (const value of ['UNIVERSITY OF RUHUNA', 'LKR 5,000.00', '02 Aug 2026', 'REF-1234', 'Page 1 of 1']) {
      expect(result.text).toContain(value);
    }
    expect(result.text).not.toContain('6,500.00');
    expect(result.text).not.toContain('SUPPORTING DOCUMENTS');
  });

  it('preserves a recorded zero payment instead of substituting the requested amount', async () => {
    const result = inspectPdf(await buildPaymentReceiptPdfBuffer({ ...paidRequest, payment: { ...paidRequest.payment, amount: 0 } }));
    expect(result.text).toContain('LKR 0.00');
    expect(result.text).not.toContain('6,500.00');
  });

  it('paginates long request details while omitting approval and document sections', async () => {
    const result = inspectPdf(await buildPaymentReceiptPdfBuffer({
      ...paidRequest,
      description: 'Detailed supporting information. '.repeat(240) + 'DESCRIPTION-END',
      workflowSteps: [{ role: 'CUSTOM_COORDINATOR', stepType: 'APPROVAL', status: 'COMPLETED', actedAt: '2026-08-02' }],
      approvalHistory: Array.from({ length: 30 }, (_, index) => ({ role: 'HOD', action: 'APPROVE', createdAt: '2026-08-02', remarks: `HISTORY-${index + 1}-END` })),
      documents: [{ originalName: 'final-invoice.pdf', description: 'DOCUMENT-END', uploadedAt: '2026-08-02' }]
    }));
    expect(result.pages).toBeGreaterThan(1);
    expect(result.text).toContain('DESCRIPTION-END');
    expect(result.text).toContain('Payment remarks');
    for (const value of ['APPROVAL WORKFLOW', 'APPROVAL HISTORY', 'SUPPORTING DOCUMENTS', 'CUSTOM_COORDINATOR', 'HISTORY-30-END', 'final-invoice.pdf', 'DOCUMENT-END']) {
      expect(result.text).not.toContain(value);
    }
    expect(result.text.match(/UNIVERSITY OF RUHUNA/g)).toHaveLength(result.pages);
    for (let page = 1; page <= result.pages; page++) expect(result.text).toContain(`Page ${page} of ${result.pages}`);
  });
});

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { RequestModel } from '../models/Request.js';
import { PaymentModel } from '../models/Payment.js';

export function buildReportFilter(query: any) {
  const filter: any = {};
  if (query.status) filter.status = query.status;
  if (query.department) filter['requesterSnapshot.department'] = query.department;
  if (query.staffCategory) filter['requesterSnapshot.staffCategory'] = query.staffCategory;
  if (query.requestType) filter.requestType = query.requestType;
  if (query.minAmount || query.maxAmount) {
    filter.amount = {};
    if (query.minAmount) filter.amount.$gte = Number(query.minAmount);
    if (query.maxAmount) filter.amount.$lte = Number(query.maxAmount);
  }
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }
  return filter;
}

export async function getSummary(query: any = {}) {
  const filter = buildReportFilter(query);
  const [statusCounts, typeCounts, totalAmount, recentRequests] = await Promise.all([
    RequestModel.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    RequestModel.aggregate([{ $match: filter }, { $group: { _id: '$requestType', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
    RequestModel.aggregate([{ $match: filter }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    RequestModel.find(filter).populate('requestType').sort({ createdAt: -1 }).limit(50)
  ]);
  return {
    statusCounts,
    typeCounts,
    totalAmount: totalAmount[0] || { amount: 0, count: 0 },
    recentRequests
  };
}

export async function claimsPerUser(query: any = {}) {
  const filter = buildReportFilter(query);
  return RequestModel.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$requester',
        requester: { $first: '$requesterSnapshot.name' },
        department: { $first: '$requesterSnapshot.department' },
        count: { $sum: 1 },
        amount: { $sum: '$amount' }
      }
    },
    { $sort: { amount: -1 } }
  ]);
}

export async function monthlySummary(query: any = {}) {
  const filter = buildReportFilter(query);
  return RequestModel.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
        amount: { $sum: '$amount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
}

export async function paymentHistory(query: any = {}) {
  const filter: any = {};
  if (query.startDate || query.endDate) {
    filter.paidAt = {};
    if (query.startDate) filter.paidAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.paidAt.$lte = new Date(query.endDate);
  }
  return PaymentModel.find(filter).populate({ path: 'request', populate: { path: 'requestType' } }).sort({ paidAt: -1 });
}

export async function buildPdfBuffer(title: string, rows: any[]) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  doc.fontSize(16).text(title, { underline: true });
  doc.moveDown();
  rows.slice(0, 100).forEach((row, index) => {
    doc.fontSize(10).text(`${index + 1}. ${JSON.stringify(row)}`);
    doc.moveDown(0.4);
  });
  doc.end();
  return done;
}

export async function buildPaymentReceiptPdfBuffer(request: any, documents: any[] = []) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const paidAt = request.payment?.paidAt ? new Date(request.payment.paidAt).toLocaleString() : 'N/A';
  const requester = request.requesterSnapshot || {};
  const requestType = request.requestType?.name || request.requestType || 'N/A';

  doc.fontSize(18).text('Payment Receipt', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Request ID: ${request.requestId || 'N/A'}`);
  doc.text(`Request Title: ${request.title || 'N/A'}`);
  doc.text(`Request Type: ${requestType}`);
  doc.text(`Requester: ${requester.name || 'N/A'}`);
  doc.text(`Department: ${requester.department || 'N/A'}`);
  doc.text(`Email: ${requester.email || 'N/A'}`);
  doc.text(`Amount: ${request.amount ?? request.payment?.amount ?? 0} ${request.currency || 'LKR'}`);
  doc.text(`Paid Date: ${paidAt}`);
  doc.text(`Reference No: ${request.payment?.referenceNo || 'N/A'}`);
  doc.text(`Remarks: ${request.payment?.remarks || 'No remarks provided.'}`);
  doc.moveDown(1.5);

  doc.addPage();
  doc.fontSize(16).text('Payment Summary', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Status: ${request.status || 'N/A'}`);
  doc.text(`Description: ${request.description || 'No description provided.'}`);
  doc.moveDown(0.8);

  doc.fontSize(13).text('Approval Workflow', { underline: true });
  doc.moveDown(0.4);
  const workflow = Array.isArray(request.workflowSteps) ? request.workflowSteps : [];
  if (workflow.length) {
    workflow.forEach((step: any, index: number) => {
      const actedAt = step.actedAt ? new Date(step.actedAt).toLocaleString() : 'N/A';
      doc.fontSize(11).text(
        `${index + 1}. ${step.role || 'Unknown role'} - ${step.stepType || 'Step'} - ${step.status || 'Unknown status'}`
      );
      doc.fontSize(10).fillColor('gray').text(`   Acted At: ${actedAt}`);
      if (step.remarks) doc.text(`   Remarks: ${step.remarks}`);
      doc.moveDown(0.4);
    });
  } else {
    doc.fontSize(11).text('No approval workflow details are available.');
    doc.moveDown(0.4);
  }

  if (Array.isArray(request.approvalHistory) && request.approvalHistory.length) {
    doc.fontSize(13).text('Approval History', { underline: true });
    doc.moveDown(0.4);
    request.approvalHistory.forEach((entry: any, index: number) => {
      const createdAt = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'N/A';
      doc.fontSize(11).text(
        `${index + 1}. ${entry.role || 'Role'} - ${entry.action || 'Action'} - ${createdAt}`
      );
      if (entry.remarks) doc.fontSize(10).fillColor('gray').text(`   Remarks: ${entry.remarks}`);
      doc.moveDown(0.3);
    });
  }

  doc.addPage();
  doc.fontSize(16).text('Included Documents', { underline: true });
  doc.moveDown(0.5);
  if (documents.length) {
    documents.forEach((document, index) => {
      doc.fontSize(11).text(`${index + 1}. ${document.originalName || document.filename || 'Document'}`);
      if (document.description) doc.text(`   Description: ${document.description}`);
      doc.text(`   File Type: ${document.mimeType || 'Unknown'}`);
      doc.text(`   Uploaded At: ${document.uploadedAt ? new Date(document.uploadedAt).toLocaleString() : 'N/A'}`);
      doc.moveDown(0.4);
    });
  } else {
    doc.fontSize(11).text('No supporting documents were attached.');
  }

  doc.end();
  return done;
}

export async function buildExcelBuffer(title: string, rows: any[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31));
  const normalized = rows.map((row) => JSON.parse(JSON.stringify(row)));
  const columns = Array.from(new Set(normalized.flatMap((row) => Object.keys(row))));
  sheet.columns = columns.map((key) => ({ header: key, key, width: 24 }));
  normalized.forEach((row) => sheet.addRow(row));
  return workbook.xlsx.writeBuffer();
}

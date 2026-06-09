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

export async function buildExcelBuffer(title: string, rows: any[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31));
  const normalized = rows.map((row) => JSON.parse(JSON.stringify(row)));
  const columns = Array.from(new Set(normalized.flatMap((row) => Object.keys(row))));
  sheet.columns = columns.map((key) => ({ header: key, key, width: 24 }));
  normalized.forEach((row) => sheet.addRow(row));
  return workbook.xlsx.writeBuffer();
}

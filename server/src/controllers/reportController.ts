import { RequestModel } from '../models/Request.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildExcelBuffer, buildPdfBuffer, claimsPerUser, getSummary, monthlySummary, paymentHistory } from '../services/reportService.js';

export const summary = asyncHandler(async (req, res) => {
  res.json(await getSummary(req.query));
});

export const claimsPerUserReport = asyncHandler(async (req, res) => {
  res.json({ items: await claimsPerUser(req.query) });
});

export const monthlySummaryReport = asyncHandler(async (req, res) => {
  res.json({ items: await monthlySummary(req.query) });
});

export const pendingVsApproved = asyncHandler(async (_req, res) => {
  const items = await RequestModel.aggregate([
    {
      $group: {
        _id: {
          $cond: [{ $in: ['$status', ['APPROVED', 'PAYMENT_PENDING', 'PAID']] }, 'APPROVED_OR_PAID', 'PENDING_OR_OTHER']
        },
        count: { $sum: 1 },
        amount: { $sum: '$amount' }
      }
    }
  ]);
  res.json({ items });
});

export const paymentHistoryReport = asyncHandler(async (req, res) => {
  res.json({ items: await paymentHistory(req.query) });
});

export const exportPdf = asyncHandler(async (req, res) => {
  const data = await getSummary(req.query);
  const rows = data.recentRequests.map((request: any) => ({
    requestId: request.requestId,
    title: request.title,
    requester: request.requesterSnapshot?.name,
    status: request.status,
    amount: request.amount
  }));
  const buffer = await buildPdfBuffer('Financial Request Report', rows);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="financial-request-report.pdf"');
  res.send(buffer);
});

export const exportExcel = asyncHandler(async (req, res) => {
  const data = await getSummary(req.query);
  const rows = data.recentRequests.map((request: any) => ({
    requestId: request.requestId,
    title: request.title,
    requester: request.requesterSnapshot?.name,
    department: request.requesterSnapshot?.department,
    status: request.status,
    amount: request.amount
  }));
  const buffer = await buildExcelBuffer('Financial Requests', rows);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="financial-request-report.xlsx"');
  res.send(Buffer.from(buffer as ArrayBuffer));
});

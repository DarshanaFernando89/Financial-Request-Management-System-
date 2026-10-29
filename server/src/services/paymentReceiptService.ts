import { readFileSync } from 'node:fs';
import PDFDocument from 'pdfkit';

// Resolve from either src/services or dist/services, independently of the launch directory.
const universityLogo = readFileSync(new URL('../../assets/university-logo.png', import.meta.url));
const colors = { maroon: '#6E2B2B', gold: '#C9A343', ink: '#202C38', muted: '#647080', line: '#DFE3E8', pale: '#F7F5F2' };
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo' });

function displayDate(value: unknown) {
  if (!value) return 'Not recorded';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? 'Not recorded' : dateFormat.format(date);
}

function words(value: unknown) {
  return String(value || 'Not recorded').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function buildPaymentReceiptPdfBuffer(request: any) {
  const doc = new PDFDocument({
    size: 'A4', margins: { top: 36, right: 42, bottom: 60, left: 42 }, bufferPages: true,
    info: { Title: `Payment Receipt - ${request.requestId || 'Request'}`, Author: 'University of Ruhuna', Subject: 'Financial Request Management System - Payment Receipt' }
  });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const left = 42;
  const width = doc.page.width - left * 2;
  const bottom = doc.page.height - 74;
  let y = 0;
  let page = 0;

  function text(value: string, x: number, top: number, size = 10, color = colors.ink, bold = false, textWidth = width) {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color)
      .text(value, x, top, { width: textWidth, lineGap: 2 });
  }

  function rule(top: number, color = colors.line) {
    doc.moveTo(left, top).lineTo(left + width, top).lineWidth(0.6).strokeColor(color).stroke();
  }

  function header() {
    doc.image(universityLogo, left, 35, { fit: [48, 68], align: 'center', valign: 'center' });
    doc.font('Times-Bold').fontSize(23).fillColor(colors.maroon).text('UNIVERSITY OF RUHUNA', 106, 43, { width: width - 64 });
    text('Faculty of Engineering', 107, 72, 11, colors.ink);
    text('FINANCIAL REQUEST MANAGEMENT SYSTEM', 107, 91, 7.5, colors.muted);
    rule(119, colors.maroon);
    doc.rect(left, 119, 72, 2.5).fill(colors.gold);
    y = 139;
    if (page > 0) {
      text('PAYMENT RECEIPT / CONTINUED', left, y, 9, colors.maroon, true);
      y += 27;
    }
  }

  function nextPage() {
    doc.addPage();
    page += 1;
    header();
  }

  function ensure(height: number) {
    if (y + height > bottom) nextPage();
  }

  function height(value: string, textWidth: number, size = 10) {
    return doc.font('Helvetica').fontSize(size).heightOfString(value, { width: textWidth, lineGap: 2 });
  }

  // Split oversized values without dropping text or allowing content into the footer.
  function fittingPart(value: string, textWidth: number, available: number, size = 10): [string, string] {
    if (height(value, textWidth, size) <= available) return [value, ''];
    let low = 0;
    let high = value.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (height(value.slice(0, mid), textWidth, size) <= available) low = mid;
      else high = mid - 1;
    }
    const boundary = value.lastIndexOf(' ', low);
    const end = boundary > low / 2 ? boundary : Math.max(low, 1);
    return [value.slice(0, end), value.slice(end).trimStart()];
  }

  function section(title: string, minimum = 64) {
    ensure(minimum);
    y += 7;
    text(title.toUpperCase(), left, y, 8.5, colors.maroon, true);
    y += 19;
  }

  function field(label: string, value: unknown) {
    let remaining = String(value ?? '').trim() || 'Not recorded';
    let continued = false;
    while (remaining) {
      ensure(39);
      const [part, rest] = fittingPart(remaining, width - 120, bottom - y - 12);
      const rowHeight = Math.max(14, height(part, width - 120));
      text(continued ? `${label} (cont.)` : label, left, y + 1, 9, colors.muted, false, 108);
      text(part, left + 120, y, 10, colors.ink, false, width - 120);
      y += rowHeight + 9;
      remaining = rest;
      continued = true;
      if (remaining) nextPage();
    }
  }

  header();
  text('Payment receipt', left, y, 27, colors.ink, true);
  const paid = request.status === 'PAID';
  doc.roundedRect(left + width - 65, y + 1, 65, 24, 4).fill(paid ? '#EAF3EE' : colors.pale);
  text(paid ? 'PAID' : words(request.status), left + width - 56, y + 8, 8, paid ? '#285B40' : colors.muted, true, 54);
  y += 43;
  field('Request number', request.requestId);
  const amount = Number(request.payment?.amount ?? request.amount ?? 0);
  const amountText = `${request.currency || 'LKR'} ${new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
  ensure(89);
  doc.roundedRect(left, y + 2, width, 70, 5).fill(colors.pale);
  doc.rect(left, y + 2, 3, 70).fill(colors.gold);
  text('AMOUNT PAID', left + 18, y + 15, 8, colors.muted, true);
  text(amountText, left + 18, y + 33, 25, colors.maroon, true, width - 36);
  y += 89;

  const requester = request.requesterSnapshot || {};
  section('Payment details');
  field('Paid to', requester.name || request.requester?.fullName);
  field('Department', requester.department || request.requester?.department);
  field('Email', requester.email || request.requester?.email);
  field('Payment date', displayDate(request.payment?.paidAt));
  field('Reference number', request.payment?.referenceNo);
  rule(y);

  section('Request details');
  field('Title', request.title);
  field('Request type', request.requestType?.name || (typeof request.requestType === 'string' ? request.requestType : undefined));
  if (request.description) field('Description', request.description);
  field('Payment remarks', request.payment?.remarks || 'No remarks recorded.');
  rule(y);

  const pages = doc.bufferedPageRange();
  for (let index = 0; index < pages.count; index++) {
    doc.switchToPage(index);
    doc.page.margins.bottom = 20;
    const footer = doc.page.height - 51;
    rule(footer - 10);
    text(`Request ${request.requestId || 'Not recorded'}  |  System-generated record of payment`, left, footer, 7, colors.muted, false, width - 70);
    text(`Page ${index + 1} of ${pages.count}`, left + width - 65, footer, 7, colors.muted, false, 65);
    text('University of Ruhuna  |  Faculty of Engineering  |  Dates shown in Sri Lanka time', left, footer + 13, 7, colors.muted);
    doc.page.margins.bottom = 60;
  }
  doc.end();
  return done;
}

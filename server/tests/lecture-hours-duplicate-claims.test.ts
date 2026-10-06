import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import demoRoutes from '../src/routes/demoRoutes.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';

const app = express();
app.locals.demoMode = true;
app.use(express.json());
app.use('/api', demoRoutes);
app.use(errorMiddleware);

let lecturerToken = '';
let hodToken = '';
let financeToken = '';
const pendingClaim = { batch: 'E/26', module: 'EE6101', timeSlots: 'Monday 08:00-10:00', lectureHours: '10', ratePerHour: '1000' };
const paidClaim = { batch: 'E/26', module: 'EE6102', timeSlots: 'Tuesday 10:00-12:00', lectureHours: '10', ratePerHour: '1000' };

function createLectureClaim(data: Record<string, unknown>, submit = false) {
  const payload = {
    requestType: 'type-lecture-hours', approvalRule: 'rule-small-academic', amount: 10000,
    title: `Lecture claim ${data.module}`, requestData: data, submit
  };
  if (!submit) return request(app).post('/api/requests').auth(lecturerToken, { type: 'bearer' }).send(payload);
  return request(app).post('/api/requests').auth(lecturerToken, { type: 'bearer' })
    .field('requestType', payload.requestType).field('approvalRule', payload.approvalRule).field('amount', String(payload.amount))
    .field('title', payload.title).field('requestData', JSON.stringify(payload.requestData)).field('submit', 'true')
    .field('documentDescriptions', 'Attendance confirmation').attach('files', Buffer.from('attendance'), 'attendance.pdf')
    .field('documentDescriptions', 'Work allocation').attach('files', Buffer.from('allocation'), 'allocation.pdf');
}

beforeAll(async () => {
  lecturerToken = (await request(app).post('/api/auth/login').send({ email: 'lecturer@uor.lk', password: 'Password123!' })).body.token;
  const hodLogin = await request(app).post('/api/auth/login').send({ email: 'hod@uor.lk', password: 'Password123!' });
  hodToken = (await request(app).post('/api/auth/select-role').auth(hodLogin.body.token, { type: 'bearer' }).send({ role: 'HOD' })).body.token;
  financeToken = (await request(app).post('/api/auth/login').send({ email: 'finance@uor.lk', password: 'Password123!' })).body.token;
});

describe('Lecture Hours Payment duplicate protection', () => {
  it('uses batch, module, and time slots as required request fields', async () => {
    const rules = await request(app).get('/api/requests/rules/active').auth(lecturerToken, { type: 'bearer' });
    const lectureType = rules.body.items.flatMap((rule: any) => rule.requestTypes).find((type: any) => type._id === 'type-lecture-hours');
    expect(lectureType.fields.filter((field: any) => field.required).map((field: any) => field.name)).toEqual(expect.arrayContaining(['batch', 'module', 'timeSlots']));
    expect(lectureType.fields.find((field: any) => field.name === 'batch')).toMatchObject({ type: 'select' });
    expect(lectureType.fields.find((field: any) => field.name === 'module')).toMatchObject({ type: 'select' });

    const missing = await createLectureClaim({ ...pendingClaim, timeSlots: '' });
    expect(missing.status).toBe(400);
    expect(missing.body.message).toContain('Batch, module, and time slots are required');
  });

  it('derives lecture hours and claim amount from the entered time slots', async () => {
    const created = await createLectureClaim({ batch: 'E/21', module: 'Control Systems', timeSlots: 'Monday 08:00-10:30; Wednesday 13:00-15:00', lectureHours: '99', ratePerHour: '1200' });
    expect(created.status).toBe(201);
    expect(created.body.requestData.lectureHours).toBe(4.5);
    expect(created.body.amount).toBe(5400);
  });

  it('accepts dated quarter-hour slots together in a single request', async () => {
    const timeSlots = '2026-10-05 08:00-10:15; 2026-10-07 18:15-19:45';
    const created = await createLectureClaim({ batch: 'E/26', module: 'EE6101', timeSlots, lectureHours: '99', ratePerHour: '2000' });
    expect(created.status).toBe(201);
    expect(created.body.requestData.timeSlots).toBe(timeSlots);
    expect(created.body.requestData.lectureHours).toBe(3.75);
    expect(created.body.amount).toBe(7500);
  });

  it('normalizes the three fields and blocks a duplicate that is already submitted', async () => {
    const created = await createLectureClaim(pendingClaim);
    expect(created.status).toBe(201);
    const duplicate = await createLectureClaim({ ...pendingClaim, batch: ' e/26 ', module: 'ee6101', timeSlots: ' Monday   08:00-10:00 ' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toContain(`Request ID: ${created.body.requestId}. Payment status: Pending`);
  });

  it.each([false, true])('persists per-slot rates for an approver with multipart submission %s', async (submit) => {
    const lectureTimeSlots = [
      { date: submit ? '2026-11-03' : '2026-11-01', batch: 'E/26', module: 'EE6101', startTime: '08:00', endTime: '10:00', ratePerHour: 1500 },
      { date: submit ? '2026-11-04' : '2026-11-02', batch: 'E/21', module: 'EE6102', startTime: '18:15', endTime: '19:45', ratePerHour: 2500 }
    ];
    const created = await createLectureClaim({ lectureTimeSlots }, submit);
    expect(created.status).toBe(201);
    expect(created.body.amount).toBe(6750);
    const details = await request(app).get(`/api/requests/${created.body._id}`).auth(hodToken, { type: 'bearer' });
    expect(details.status).toBe(200);
    expect(details.body.requestData.lectureHours).toBe(3.5);
    expect(details.body.requestData.lectureTimeSlots).toEqual([
      { ...lectureTimeSlots[0], hours: 2, amount: 3000 }, { ...lectureTimeSlots[1], hours: 1.5, amount: 3750 }
    ]);
    if (!submit) {
      const duplicate = await createLectureClaim({ batch: 'E/26', module: 'EE6101', lectureTimeSlots: [...lectureTimeSlots].reverse().map((slot) => ({ ...slot, ratePerHour: 3000 })) });
      expect(duplicate.status).toBe(409);
    }
  });

  it('reports an approved payment when the same lecture hours have already been paid', async () => {
    const created = await createLectureClaim(paidClaim, true);
    expect(created.status).toBe(201);
    expect((await request(app).post(`/api/approvals/${created.body._id}/approve`).auth(hodToken, { type: 'bearer' }).send({ remarks: 'Approved' })).status).toBe(200);
    expect((await request(app).post(`/api/finance/${created.body._id}/mark-paid`).auth(financeToken, { type: 'bearer' }).send({ paymentDate: '2026-10-04', paymentReferenceNo: 'LH-001' })).status).toBe(200);
    const duplicate = await createLectureClaim(paidClaim);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toContain(`Request ID: ${created.body.requestId}. Payment status: Paid.`);
  });

  it('blocks a repeated slot inside a different request and reports pending versus paid with the request ID', async () => {
    const lectureSlot = { date: '2027-01-04', batch: 'E/26', module: 'EE6101', startTime: '08:00', endTime: '10:00', ratePerHour: 1500 };
    const original = await createLectureClaim({ lectureTimeSlots: [lectureSlot, { ...lectureSlot, date: '2027-01-07', module: 'EE6102' }] }, true);
    expect(original.status).toBe(201);
    const differentRequest = { lectureTimeSlots: [{ ...lectureSlot, ratePerHour: 2000 }, { ...lectureSlot, date: '2027-01-08' }] };
    const duplicate = await createLectureClaim(differentRequest, true);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toContain(`Request ID: ${original.body.requestId}. Payment status: Pending`);
    expect((await request(app).post(`/api/approvals/${original.body._id}/approve`).auth(hodToken, { type: 'bearer' }).send({ remarks: 'Approved' })).status).toBe(200);
    const pendingPayment = await createLectureClaim({ lectureTimeSlots: [lectureSlot] });
    expect(pendingPayment.status).toBe(409);
    expect(pendingPayment.body.message).toContain('Payment status: Pending (Pending Payment)');
    expect((await request(app).post(`/api/finance/${original.body._id}/mark-paid`).auth(financeToken, { type: 'bearer' }).send({ paymentDate: '2027-01-09', paymentReferenceNo: 'LH-DUPLICATE-TEST' })).status).toBe(200);
    const paid = await createLectureClaim({ lectureTimeSlots: [lectureSlot] });
    expect(paid.status).toBe(409);
    expect(paid.body.message).toContain(`Request ID: ${original.body.requestId}. Payment status: Paid.`);
  });

  it('blocks duplicate resubmission without changing the rejected request', async () => {
    const lectureSlot = { date: '2027-02-04', batch: 'E/26', module: 'EE6101', startTime: '08:00', endTime: '10:00', ratePerHour: 1500 };
    const original = await createLectureClaim({ lectureTimeSlots: [lectureSlot] }, true);
    const otherData = { lectureTimeSlots: [{ ...lectureSlot, date: '2027-02-07' }] };
    const rejected = await createLectureClaim(otherData, true);
    expect(original.status).toBe(201);
    expect(rejected.status).toBe(201);
    expect((await request(app).post(`/api/approvals/${rejected.body._id}/reject`).auth(hodToken, { type: 'bearer' }).send({ remarks: 'Needs correction' })).status).toBe(200);
    const blocked = await request(app).post(`/api/requests/${rejected.body._id}/resubmit`).auth(lecturerToken, { type: 'bearer' }).send({ title: 'Changed title', requestData: { lectureTimeSlots: [lectureSlot] } });
    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toContain(`Request ID: ${original.body.requestId}. Payment status: Pending`);
    const unchanged = await request(app).get(`/api/requests/${rejected.body._id}`).auth(lecturerToken, { type: 'bearer' });
    expect(unchanged.body.status).toBe('REJECTED');
    expect(unchanged.body.title).toBe(rejected.body.title);
    expect(unchanged.body.requestData).toEqual(rejected.body.requestData);
    expect((await createLectureClaim(otherData)).status).toBe(201);
  });

  it('lets a draft submit without conflicting with itself', async () => {
    const lectureSlot = { date: '2027-03-04', batch: 'E/26', module: 'EE6101', startTime: '08:00', endTime: '10:00', ratePerHour: 1500 };
    const draft = await createLectureClaim({ lectureTimeSlots: [lectureSlot] });
    expect(draft.status).toBe(201);
    expect((await request(app).post(`/api/requests/${draft.body._id}/submit`).auth(lecturerToken, { type: 'bearer' }).send({})).status).toBe(200);
  });

});

import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import demoRoutes from '../src/routes/demoRoutes.js';
import { errorMiddleware } from '../src/middleware/errorMiddleware.js';
import { duplicateLectureHoursClaimMessage, lectureHoursClaimKey } from '../src/utils/lectureHoursClaim.js';

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

function createLectureClaim(data: Record<string, string>, submit = false) {
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

  it('normalizes the three fields and blocks a duplicate that is already submitted', async () => {
    const created = await createLectureClaim(pendingClaim);
    expect(created.status).toBe(201);
    const duplicate = await createLectureClaim({ ...pendingClaim, batch: ' e/26 ', module: 'ee6101', timeSlots: ' Monday   08:00-10:00 ' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toBe('You have already submitted a request for these lecture hours.');
  });

  it('reports an approved payment when the same lecture hours have already been paid', async () => {
    const created = await createLectureClaim(paidClaim, true);
    expect(created.status).toBe(201);
    expect((await request(app).post(`/api/approvals/${created.body._id}/approve`).auth(hodToken, { type: 'bearer' }).send({ remarks: 'Approved' })).status).toBe(200);
    expect((await request(app).post(`/api/finance/${created.body._id}/mark-paid`).auth(financeToken, { type: 'bearer' }).send({ paymentDate: '2026-10-04', paymentReferenceNo: 'LH-001' })).status).toBe(200);
    const duplicate = await createLectureClaim(paidClaim);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toBe('Payment for these lecture hours has already been approved.');
  });

  it('allows a new request when the only matching claim was rejected or cancelled', () => {
    expect(lectureHoursClaimKey('LECTURE_HOURS', pendingClaim)).toBe('e/26|ee6101|monday 08:00-10:00');
    expect(duplicateLectureHoursClaimMessage('PAID')).toContain('already been approved');
    expect(duplicateLectureHoursClaimMessage('REJECTED')).toContain('already submitted');
  });
});

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { AccountRequestModel } from '../models/AccountRequest.js';
import { ApprovalModel } from '../models/Approval.js';
import { ApprovalRuleModel } from '../models/ApprovalRule.js';
import { AuditLogModel } from '../models/AuditLog.js';
import { NotificationModel } from '../models/Notification.js';
import { PaymentModel } from '../models/Payment.js';
import { RequestModel } from '../models/Request.js';
import { RequestTypeModel } from '../models/RequestType.js';
import { UserModel } from '../models/User.js';
import {
  ACCOUNT_REQUEST_STATUSES,
  REQUEST_STATUSES,
  REQUEST_TYPE_CODES,
  ROLES,
  STAFF_CATEGORIES,
  STEP_STATUSES
} from '../utils/constants.js';
import { buildWorkflowSteps } from '../services/workflowService.js';

const faculty = 'Faculty of Engineering, University of Ruhuna';
const department = 'Department of Electrical and Information Engineering';
const password = 'Password123!';

async function resetCollections() {
  await Promise.all([
    UserModel.deleteMany({}),
    RequestTypeModel.deleteMany({}),
    ApprovalRuleModel.deleteMany({}),
    RequestModel.deleteMany({}),
    ApprovalModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    PaymentModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
    AccountRequestModel.deleteMany({})
  ]);
}

function field(name: string, label: string, type = 'text', required = true, options: string[] = []) {
  return { name, label, type, required, options };
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(password, 10);
  return UserModel.insertMany([
    {
      nameWithInitials: 'FRMS Admin',
      fullName: 'Financial Request System Administrator',
      email: 'admin@uor.lk',
      passwordHash,
      employeeNo: 'ADM001',
      staffCategory: STAFF_CATEGORIES.NON_ACADEMIC,
      department,
      faculty,
      roles: [ROLES.ADMIN],
      isActive: true
    },
    {
      nameWithInitials: 'Dr. A. Lecturer',
      fullName: 'Anuradha Lecturer',
      email: 'lecturer@uor.lk',
      passwordHash,
      employeeNo: 'AC001',
      staffCategory: STAFF_CATEGORIES.ACADEMIC,
      department,
      faculty,
      roles: [ROLES.REQUESTER, ROLES.LECTURER],
      isActive: true
    },
    {
      nameWithInitials: 'N. Requester',
      fullName: 'Nimal Requester',
      email: 'requester@uor.lk',
      passwordHash,
      employeeNo: 'NA001',
      staffCategory: STAFF_CATEGORIES.NON_ACADEMIC,
      department,
      faculty,
      roles: [ROLES.REQUESTER],
      isActive: true
    },
    {
      nameWithInitials: 'D. Coordinator',
      fullName: 'Department Coordinator',
      email: 'coordinator@uor.lk',
      passwordHash,
      employeeNo: 'DC001',
      staffCategory: STAFF_CATEGORIES.NON_ACADEMIC,
      department,
      faculty,
      roles: [ROLES.DEPARTMENT_COORDINATOR, ROLES.REQUESTER],
      isActive: true
    },
    {
      nameWithInitials: 'Prof. H. D.',
      fullName: 'Head of Department',
      email: 'hod@uor.lk',
      passwordHash,
      employeeNo: 'HOD001',
      staffCategory: STAFF_CATEGORIES.ACADEMIC,
      department,
      faculty,
      roles: [ROLES.HOD, ROLES.LECTURER, ROLES.REQUESTER],
      isActive: true
    },
    {
      nameWithInitials: 'Assoc. Dean',
      fullName: 'Associate Dean Engineering',
      email: 'associatedean@uor.lk',
      passwordHash,
      employeeNo: 'AD001',
      staffCategory: STAFF_CATEGORIES.ACADEMIC,
      department,
      faculty,
      roles: [ROLES.ASSOCIATE_DEAN, ROLES.LECTURER, ROLES.REQUESTER],
      isActive: true
    },
    {
      nameWithInitials: 'Dean Eng.',
      fullName: 'Dean Faculty of Engineering',
      email: 'dean@uor.lk',
      passwordHash,
      employeeNo: 'DEAN001',
      staffCategory: STAFF_CATEGORIES.ACADEMIC,
      department,
      faculty,
      roles: [ROLES.DEAN, ROLES.LECTURER, ROLES.REQUESTER],
      isActive: true
    },
    {
      nameWithInitials: 'F. Division',
      fullName: 'Financial Division User',
      email: 'finance.division@uor.lk',
      passwordHash,
      employeeNo: 'FD001',
      staffCategory: STAFF_CATEGORIES.NON_ACADEMIC,
      department: 'Finance Division',
      faculty,
      roles: [ROLES.FINANCE_DIVISION],
      isActive: true
    },
    {
      nameWithInitials: 'A. Authority',
      fullName: 'Approving Authority User',
      email: 'approving.authority@uor.lk',
      passwordHash,
      employeeNo: 'AA001',
      staffCategory: STAFF_CATEGORIES.ACADEMIC,
      department,
      faculty,
      roles: [ROLES.APPROVING_AUTHORITY],
      isActive: true
    },
    {
      nameWithInitials: 'F. Officer',
      fullName: 'Finance Officer',
      email: 'finance@uor.lk',
      passwordHash,
      employeeNo: 'FO001',
      staffCategory: STAFF_CATEGORIES.NON_ACADEMIC,
      department: 'Finance Division',
      faculty,
      roles: [ROLES.FINANCE_OFFICER],
      isActive: true
    },
    {
      nameWithInitials: 'Dr. Multi Role',
      fullName: 'Multi Role Lecturer HoD',
      email: 'multirole@uor.lk',
      passwordHash,
      employeeNo: 'MR001',
      staffCategory: STAFF_CATEGORIES.ACADEMIC,
      department,
      faculty,
      roles: [ROLES.REQUESTER, ROLES.LECTURER, ROLES.HOD],
      isActive: true
    }
  ]);
}

async function seedRequestTypes() {
  return RequestTypeModel.insertMany([
    {
      name: 'Lecture Hours Payment',
      code: REQUEST_TYPE_CODES.LECTURE_HOURS,
      description: 'Claim payment for delivered lecture hours.',
      fields: [
        field('courseName', 'Course/module name'),
        field('academicYear', 'Academic year'),
        field('semester', 'Semester', 'select', true, ['Semester 1', 'Semester 2']),
        field('lectureHours', 'Number of lecture hours', 'number'),
        field('ratePerHour', 'Rate per hour', 'number'),
        field('description', 'Description/reason', 'textarea', false)
      ],
      requiredDocuments: ['Attendance confirmation', 'Work allocation']
    },
    {
      name: 'Paper Marking',
      code: REQUEST_TYPE_CODES.PAPER_MARKING,
      description: 'Claim for examination paper marking.',
      fields: [
        field('examName', 'Exam name'),
        field('courseName', 'Course/module name'),
        field('academicYear', 'Academic year'),
        field('semester', 'Semester', 'select', true, ['Semester 1', 'Semester 2']),
        field('numberOfPapers', 'Number of papers', 'number'),
        field('ratePerPaper', 'Rate per paper', 'number')
      ],
      requiredDocuments: ['Marking allocation', 'Paper count confirmation']
    },
    {
      name: 'Examination Duties',
      code: REQUEST_TYPE_CODES.EXAM_DUTIES,
      description: 'Claim for examination duty sessions or hours.',
      fields: [
        field('examinationName', 'Examination name'),
        field('dutyType', 'Duty type'),
        field('dutyDate', 'Duty date', 'date'),
        field('sessions', 'Number of sessions/hours', 'number'),
        field('rate', 'Rate per session/hour', 'number')
      ],
      requiredDocuments: ['Duty roster']
    },
    {
      name: 'Travel / Fuel Claims',
      code: REQUEST_TYPE_CODES.TRAVEL_FUEL,
      description: 'Travel and fuel reimbursement claims.',
      fields: [
        field('travelDate', 'Travel date', 'date'),
        field('startingLocation', 'Starting location'),
        field('destination', 'Destination'),
        field('distanceKm', 'Distance in kilometers', 'number'),
        field('vehicleNumber', 'Vehicle number'),
        field('purpose', 'Purpose of travel', 'textarea')
      ],
      requiredDocuments: ['Travel approval', 'Fuel receipt']
    },
    {
      name: 'General Reimbursements',
      code: REQUEST_TYPE_CODES.GENERAL_REIMBURSEMENT,
      description: 'General expense reimbursement claims.',
      fields: [
        field('expenseCategory', 'Expense category'),
        field('expenseDate', 'Expense date', 'date'),
        field('vendor', 'Vendor/payee'),
        field('receiptNo', 'Invoice/receipt number'),
        field('amount', 'Amount', 'number'),
        field('description', 'Description/reason', 'textarea')
      ],
      requiredDocuments: ['Receipt or invoice']
    },
    {
      name: 'Special / Equipment Claims',
      code: REQUEST_TYPE_CODES.SPECIAL_EQUIPMENT,
      description: 'Special claims and equipment/service purchases.',
      fields: [
        field('itemName', 'Item/service name'),
        field('purpose', 'Purpose', 'textarea'),
        field('supplier', 'Supplier/vendor'),
        field('quotationNo', 'Quotation/invoice number'),
        field('amount', 'Amount', 'number')
      ],
      requiredDocuments: ['Quotation or invoice']
    },
    {
      name: 'Research / Special Academic Claims',
      code: REQUEST_TYPE_CODES.RESEARCH_ACADEMIC,
      description: 'Research and special academic claims.',
      fields: [
        field('projectTitle', 'Research/project title'),
        field('claimCategory', 'Claim category'),
        field('purpose', 'Purpose', 'textarea'),
        field('amount', 'Amount', 'number'),
        field('referenceNo', 'Approval/reference number', 'text', false)
      ],
      requiredDocuments: ['Project approval', 'Supporting documents']
    }
  ]);
}

async function seedRules(types: any[]) {
  const byCode = Object.fromEntries(types.map((type) => [type.code, type]));
  return ApprovalRuleModel.insertMany([
    {
      name: 'Small academic claims',
      requestTypes: [byCode[REQUEST_TYPE_CODES.LECTURE_HOURS]._id, byCode[REQUEST_TYPE_CODES.PAPER_MARKING]._id, byCode[REQUEST_TYPE_CODES.EXAM_DUTIES]._id],
      minAmount: 0,
      maxAmount: 25000,
      workflowRoles: [ROLES.HOD],
      priority: 10,
      isActive: true
    },
    {
      name: 'Medium academic claims',
      requestTypes: [byCode[REQUEST_TYPE_CODES.LECTURE_HOURS]._id, byCode[REQUEST_TYPE_CODES.PAPER_MARKING]._id, byCode[REQUEST_TYPE_CODES.EXAM_DUTIES]._id],
      minAmount: 25000.01,
      maxAmount: 75000,
      workflowRoles: [ROLES.HOD, ROLES.ASSOCIATE_DEAN],
      priority: 10,
      isActive: true
    },
    {
      name: 'Large academic claims',
      requestTypes: [byCode[REQUEST_TYPE_CODES.LECTURE_HOURS]._id, byCode[REQUEST_TYPE_CODES.PAPER_MARKING]._id, byCode[REQUEST_TYPE_CODES.EXAM_DUTIES]._id],
      minAmount: 75000.01,
      maxAmount: null,
      workflowRoles: [ROLES.HOD, ROLES.ASSOCIATE_DEAN, ROLES.DEAN],
      priority: 10,
      isActive: true
    },
    {
      name: 'Travel and fuel claims',
      requestTypes: [byCode[REQUEST_TYPE_CODES.TRAVEL_FUEL]._id],
      minAmount: 0,
      maxAmount: null,
      workflowRoles: [ROLES.DEPARTMENT_COORDINATOR, ROLES.HOD],
      priority: 20,
      isActive: true
    },
    {
      name: 'Special and equipment claims',
      requestTypes: [byCode[REQUEST_TYPE_CODES.SPECIAL_EQUIPMENT]._id, byCode[REQUEST_TYPE_CODES.RESEARCH_ACADEMIC]._id],
      minAmount: 0,
      maxAmount: null,
      workflowRoles: [ROLES.HOD, ROLES.FINANCE_DIVISION, ROLES.APPROVING_AUTHORITY],
      priority: 30,
      isActive: true
    },
    {
      name: 'General reimbursements',
      requestTypes: [byCode[REQUEST_TYPE_CODES.GENERAL_REIMBURSEMENT]._id],
      minAmount: 0,
      maxAmount: null,
      workflowRoles: [ROLES.HOD],
      priority: 40,
      isActive: true
    }
  ]);
}

function snapshot(user: any, role: string = ROLES.LECTURER) {
  return {
    name: user.nameWithInitials,
    email: user.email,
    department: user.department,
    faculty: user.faculty,
    staffCategory: user.staffCategory,
    roleAtSubmission: role
  };
}

function seedDocument(user: any) {
  return {
    filename: 'seed-document.pdf',
    originalName: 'seed-document.pdf',
    fileUrl: '/uploads/seed-document.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    uploadedBy: user._id,
    uploadedByRole: ROLES.LECTURER,
    uploadedAt: new Date(),
    description: 'Seed supporting document'
  };
}

function makeSteps(roles: string[], pendingIndex: number, action = 'APPROVE') {
  const steps = buildWorkflowSteps({ workflowRoles: roles });
  return steps.map((step: any, index) => ({
    ...step,
    status: index < pendingIndex ? STEP_STATUSES.COMPLETED : index === pendingIndex ? STEP_STATUSES.PENDING : STEP_STATUSES.WAITING,
    action: index < pendingIndex ? action : undefined,
    actedAt: index < pendingIndex ? new Date() : undefined
  }));
}

async function seedRequests(users: any[], types: any[]) {
  const byEmail = Object.fromEntries(users.map((user) => [user.email, user]));
  const byCode = Object.fromEntries(types.map((type) => [type.code, type]));
  const lecturer = byEmail['lecturer@uor.lk'];
  const requester = byEmail['requester@uor.lk'];
  const finance = byEmail['finance@uor.lk'];

  const common = {
    requester: lecturer._id,
    requesterSnapshot: snapshot(lecturer),
    currency: 'LKR',
    documents: [seedDocument(lecturer)],
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
  };

  const requests: any[] = [
    {
      ...common,
      requestId: '12000062',
      requestType: byCode[REQUEST_TYPE_CODES.LECTURE_HOURS]._id,
      title: 'Lecture Hours Payment - Embedded Systems',
      description: 'Payment for delivered lecture hours.',
      amount: 15000,
      requestData: { courseName: 'Embedded Systems', lectureHours: 15, ratePerHour: 1000 },
      status: REQUEST_STATUSES.UNDER_REVIEW,
      currentStepIndex: 0,
      currentAssignedRole: ROLES.HOD,
      workflowSteps: makeSteps([ROLES.HOD], 0)
    },
    {
      ...common,
      requestId: '12000063',
      requestType: byCode[REQUEST_TYPE_CODES.PAPER_MARKING]._id,
      title: 'Paper Marking - EE5202',
      amount: 60000,
      requestData: { examName: 'End Semester', numberOfPapers: 120, ratePerPaper: 500 },
      status: REQUEST_STATUSES.UNDER_REVIEW,
      currentStepIndex: 1,
      currentAssignedRole: ROLES.ASSOCIATE_DEAN,
      workflowSteps: makeSteps([ROLES.HOD, ROLES.ASSOCIATE_DEAN], 1),
      approvalHistory: [{ action: 'APPROVE', role: ROLES.HOD, user: byEmail['hod@uor.lk']._id, fromStatus: REQUEST_STATUSES.UNDER_REVIEW, toStatus: REQUEST_STATUSES.UNDER_REVIEW, createdAt: new Date() }]
    },
    {
      ...common,
      requestId: '12000064',
      requestType: byCode[REQUEST_TYPE_CODES.LECTURE_HOURS]._id,
      title: 'Lecture Hours Payment - High Value',
      amount: 100000,
      requestData: { courseName: 'Power Systems', lectureHours: 80, ratePerHour: 1250 },
      status: REQUEST_STATUSES.UNDER_REVIEW,
      currentStepIndex: 2,
      currentAssignedRole: ROLES.DEAN,
      workflowSteps: makeSteps([ROLES.HOD, ROLES.ASSOCIATE_DEAN, ROLES.DEAN], 2)
    },
    {
      requester: requester._id,
      requesterSnapshot: snapshot(requester, ROLES.REQUESTER),
      currency: 'LKR',
      documents: [seedDocument(requester)],
      submittedAt: new Date(),
      requestId: '12000065',
      requestType: byCode[REQUEST_TYPE_CODES.TRAVEL_FUEL]._id,
      title: 'Fuel Claim for Department Visit',
      amount: 20000,
      requestData: { travelDate: '2026-06-01', destination: 'Galle', distanceKm: 120 },
      status: REQUEST_STATUSES.UNDER_VERIFICATION,
      currentStepIndex: 0,
      currentAssignedRole: ROLES.DEPARTMENT_COORDINATOR,
      workflowSteps: makeSteps([ROLES.DEPARTMENT_COORDINATOR, ROLES.HOD], 0)
    },
    {
      ...common,
      requestId: '12000066',
      requestType: byCode[REQUEST_TYPE_CODES.SPECIAL_EQUIPMENT]._id,
      title: 'Special Claim for Laboratory Equipment',
      amount: 80000,
      requestData: { itemName: 'DSP Development Kit', supplier: 'Demo Supplier' },
      status: REQUEST_STATUSES.UNDER_REVIEW,
      currentStepIndex: 1,
      currentAssignedRole: ROLES.FINANCE_DIVISION,
      workflowSteps: makeSteps([ROLES.HOD, ROLES.FINANCE_DIVISION, ROLES.APPROVING_AUTHORITY], 1)
    },
    {
      ...common,
      requestId: '12000067',
      requestType: byCode[REQUEST_TYPE_CODES.GENERAL_REIMBURSEMENT]._id,
      title: 'Reimbursement with Clarification Requested',
      amount: 12500,
      requestData: { expenseCategory: 'Office supplies', vendor: 'Demo Vendor' },
      status: REQUEST_STATUSES.INFO_REQUESTED,
      currentStepIndex: 0,
      currentAssignedRole: undefined,
      previousAssignedRoleWhenInfoRequested: ROLES.HOD,
      workflowSteps: makeSteps([ROLES.HOD], 0).map((step) => ({ ...step, status: STEP_STATUSES.INFO_REQUESTED })),
      clarificationHistory: [{ action: 'REQUEST_INFO', role: ROLES.HOD, user: byEmail['hod@uor.lk']._id, remarks: 'Please upload the original receipt.', fromStatus: REQUEST_STATUSES.UNDER_REVIEW, toStatus: REQUEST_STATUSES.INFO_REQUESTED, createdAt: new Date() }]
    },
    {
      ...common,
      requestId: '12000068',
      requestType: byCode[REQUEST_TYPE_CODES.TRAVEL_FUEL]._id,
      title: 'Rejected Travel Claim',
      amount: 9500,
      requestData: { destination: 'Matara', purpose: 'Meeting' },
      status: REQUEST_STATUSES.REJECTED,
      currentStepIndex: 0,
      currentAssignedRole: undefined,
      rejectionReason: 'Travel approval document was not valid.',
      workflowSteps: makeSteps([ROLES.DEPARTMENT_COORDINATOR, ROLES.HOD], 0).map((step) => ({ ...step, status: STEP_STATUSES.REJECTED }))
    },
    {
      ...common,
      requestId: '12000069',
      requestType: byCode[REQUEST_TYPE_CODES.PAPER_MARKING]._id,
      title: 'Approved Request Pending Payment',
      amount: 18000,
      requestData: { examName: 'Mid Semester', numberOfPapers: 45, ratePerPaper: 400 },
      status: REQUEST_STATUSES.PAYMENT_PENDING,
      currentStepIndex: 1,
      currentAssignedRole: ROLES.FINANCE_OFFICER,
      workflowSteps: makeSteps([ROLES.HOD], 1)
    },
    {
      ...common,
      requestId: '12000070',
      requestType: byCode[REQUEST_TYPE_CODES.LECTURE_HOURS]._id,
      title: 'Paid Lecture Claim',
      amount: 22000,
      requestData: { courseName: 'Control Systems', lectureHours: 22, ratePerHour: 1000 },
      status: REQUEST_STATUSES.PAID,
      currentStepIndex: 1,
      currentAssignedRole: undefined,
      workflowSteps: makeSteps([ROLES.HOD], 2),
      payment: {
        paidAt: new Date(),
        paidBy: finance._id,
        amount: 22000,
        referenceNo: 'PAY-SEED-001',
        remarks: 'Seed payment'
      },
      completedAt: new Date()
    }
  ];

  const created = await RequestModel.insertMany(requests);
  const paid = created.find((request) => request.requestId === '12000070');
  if (paid) {
    await PaymentModel.create({
      request: paid._id,
      amount: 22000,
      paidAt: new Date(),
      referenceNo: 'PAY-SEED-001',
      remarks: 'Seed payment',
      processedBy: finance._id
    });
  }
  return created;
}

async function seedNotificationsAndLogs(users: any[], requests: any[]) {
  const byEmail = Object.fromEntries(users.map((user) => [user.email, user]));
  await NotificationModel.insertMany([
    {
      user: byEmail['lecturer@uor.lk']._id,
      title: 'Clarification Requested',
      message: 'Request 12000067 requires more information.',
      type: 'REQUEST',
      relatedRequest: requests.find((request) => request.requestId === '12000067')?._id
    },
    {
      role: ROLES.HOD,
      title: 'New request assigned',
      message: 'Request 12000062 is waiting for HoD approval.',
      type: 'REQUEST',
      relatedRequest: requests.find((request) => request.requestId === '12000062')?._id
    },
    {
      role: ROLES.FINANCE_OFFICER,
      title: 'Payment pending',
      message: 'Request 12000069 is ready for payment processing.',
      type: 'PAYMENT',
      relatedRequest: requests.find((request) => request.requestId === '12000069')?._id
    }
  ]);

  await AuditLogModel.insertMany([
    {
      actor: byEmail['admin@uor.lk']._id,
      actorRole: ROLES.ADMIN,
      action: 'SEED_DATABASE',
      entityType: 'System',
      description: 'Demo seed data created.'
    },
    {
      actor: byEmail['lecturer@uor.lk']._id,
      actorRole: ROLES.LECTURER,
      action: 'SUBMIT_REQUEST',
      entityType: 'Request',
      entityId: requests[0]._id.toString(),
      description: 'Seed request submitted.'
    }
  ]);

  await AccountRequestModel.create({
    fullName: 'Pending Staff Member',
    nameWithInitials: 'P. S. Member',
    email: 'pending.staff@uor.lk',
    employeeNo: 'EMP-PENDING',
    staffCategory: STAFF_CATEGORIES.NON_ACADEMIC,
    department,
    faculty,
    contactNo: '0712345678',
    address: 'Faculty of Engineering, University of Ruhuna',
    requestedRole: ROLES.REQUESTER,
    message: 'Need access to submit reimbursements.',
    status: ACCOUNT_REQUEST_STATUSES.PENDING
  });
}

async function ensureSeedDocument() {
  const uploadDir = path.resolve(env.uploadDir);
  fs.mkdirSync(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, 'seed-document.pdf');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '%PDF-1.4\n% FRMS seed placeholder document\n');
  }
}

async function main() {
  await connectDB();
  await ensureSeedDocument();
  await resetCollections();
  const users = await seedUsers();
  const types = await seedRequestTypes();
  await seedRules(types);
  const requests = await seedRequests(users, types);
  await seedNotificationsAndLogs(users, requests);
  console.log('Seed complete. Default password for all users: Password123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

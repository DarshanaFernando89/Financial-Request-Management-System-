import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { signAuthToken } from '../middleware/authMiddleware.js';
import { env } from '../config/env.js';
import {
  ACCOUNT_REQUEST_STATUSES,
  APPROVAL_ACTIONS,
  REQUEST_STATUSES,
  REQUEST_TYPE_CODES,
  ROLES,
  STAFF_CATEGORIES,
  STEP_STATUSES,
  STEP_TYPES
} from '../utils/constants.js';

const router = Router();
const defaultPassword = 'Password123!';
const faculty = 'Faculty of Engineering, University of Ruhuna';
const department = 'Department of Electrical and Information Engineering';

const users: any[] = [
  {
    _id: 'demo-admin',
    nameWithInitials: 'FRMS Admin',
    fullName: 'Financial Request System Administrator',
    email: 'admin@uor.lk',
    employeeNo: 'ADM001',
    staffCategory: STAFF_CATEGORIES.NON_ACADEMIC,
    department,
    faculty,
    roles: [ROLES.ADMIN],
    isActive: true
  },
  {
    _id: 'demo-lecturer',
    nameWithInitials: 'Dr. A. Lecturer',
    fullName: 'Anuradha Lecturer',
    email: 'lecturer@uor.lk',
    employeeNo: 'AC001',
    staffCategory: STAFF_CATEGORIES.ACADEMIC,
    department,
    faculty,
    roles: [ROLES.REQUESTER, ROLES.LECTURER],
    isActive: true
  },
  {
    _id: 'demo-requester',
    nameWithInitials: 'N. Requester',
    fullName: 'Nimal Requester',
    email: 'requester@uor.lk',
    employeeNo: 'NA001',
    staffCategory: STAFF_CATEGORIES.NON_ACADEMIC,
    department,
    faculty,
    roles: [ROLES.REQUESTER],
    isActive: true
  },
  {
    _id: 'demo-coordinator',
    nameWithInitials: 'D. Coordinator',
    fullName: 'Department Coordinator',
    email: 'coordinator@uor.lk',
    employeeNo: 'DC001',
    staffCategory: STAFF_CATEGORIES.NON_ACADEMIC,
    department,
    faculty,
    roles: [ROLES.DEPARTMENT_COORDINATOR, ROLES.REQUESTER],
    isActive: true
  },
  {
    _id: 'demo-hod',
    nameWithInitials: 'Prof. H. D.',
    fullName: 'Head of Department',
    email: 'hod@uor.lk',
    employeeNo: 'HOD001',
    staffCategory: STAFF_CATEGORIES.ACADEMIC,
    department,
    faculty,
    roles: [ROLES.HOD, ROLES.LECTURER, ROLES.REQUESTER],
    isActive: true
  },
  {
    _id: 'demo-associate-dean',
    nameWithInitials: 'Assoc. Dean',
    fullName: 'Associate Dean Engineering',
    email: 'associatedean@uor.lk',
    employeeNo: 'AD001',
    staffCategory: STAFF_CATEGORIES.ACADEMIC,
    department,
    faculty,
    roles: [ROLES.ASSOCIATE_DEAN, ROLES.LECTURER, ROLES.REQUESTER],
    isActive: true
  },
  {
    _id: 'demo-dean',
    nameWithInitials: 'Dean Eng.',
    fullName: 'Dean Faculty of Engineering',
    email: 'dean@uor.lk',
    employeeNo: 'DEAN001',
    staffCategory: STAFF_CATEGORIES.ACADEMIC,
    department,
    faculty,
    roles: [ROLES.DEAN, ROLES.LECTURER, ROLES.REQUESTER],
    isActive: true
  },
  {
    _id: 'demo-finance-division',
    nameWithInitials: 'F. Division',
    fullName: 'Financial Division User',
    email: 'finance.division@uor.lk',
    employeeNo: 'FD001',
    staffCategory: STAFF_CATEGORIES.NON_ACADEMIC,
    department: 'Finance Division',
    faculty,
    roles: [ROLES.FINANCE_DIVISION],
    isActive: true
  },
  {
    _id: 'demo-authority',
    nameWithInitials: 'A. Authority',
    fullName: 'Approving Authority User',
    email: 'approving.authority@uor.lk',
    employeeNo: 'AA001',
    staffCategory: STAFF_CATEGORIES.ACADEMIC,
    department,
    faculty,
    roles: [ROLES.APPROVING_AUTHORITY],
    isActive: true
  },
  {
    _id: 'demo-finance',
    nameWithInitials: 'F. Officer',
    fullName: 'Finance Officer',
    email: 'finance@uor.lk',
    employeeNo: 'FO001',
    staffCategory: STAFF_CATEGORIES.NON_ACADEMIC,
    department: 'Finance Division',
    faculty,
    roles: [ROLES.FINANCE_OFFICER],
    isActive: true
  },
  {
    _id: 'demo-multirole',
    nameWithInitials: 'Dr. Multi Role',
    fullName: 'Multi Role Lecturer HoD',
    email: 'multirole@uor.lk',
    employeeNo: 'MR001',
    staffCategory: STAFF_CATEGORIES.ACADEMIC,
    department,
    faculty,
    roles: [ROLES.REQUESTER, ROLES.LECTURER, ROLES.HOD],
    isActive: true
  }
];

const requestTypes: any[] = [
  {
    _id: 'type-lecture-hours',
    name: 'Lecture Hours Payment',
    code: REQUEST_TYPE_CODES.LECTURE_HOURS,
    description: 'Claim payment for delivered lecture hours.',
    requiredDocuments: ['Attendance confirmation', 'Work allocation'],
    isActive: true,
    fields: [
      { name: 'courseName', label: 'Course/module name', type: 'text', required: true },
      { name: 'academicYear', label: 'Academic year', type: 'text', required: true },
      { name: 'semester', label: 'Semester', type: 'select', required: true, options: ['Semester 1', 'Semester 2'] },
      { name: 'lectureHours', label: 'Number of lecture hours', type: 'number', required: true },
      { name: 'ratePerHour', label: 'Rate per hour', type: 'number', required: true },
      { name: 'description', label: 'Description/reason', type: 'textarea', required: false }
    ]
  },
  {
    _id: 'type-paper-marking',
    name: 'Paper Marking',
    code: REQUEST_TYPE_CODES.PAPER_MARKING,
    description: 'Claim for examination paper marking.',
    requiredDocuments: ['Marking allocation', 'Paper count confirmation'],
    isActive: true,
    fields: [
      { name: 'examName', label: 'Exam name', type: 'text', required: true },
      { name: 'courseName', label: 'Course/module name', type: 'text', required: true },
      { name: 'numberOfPapers', label: 'Number of papers', type: 'number', required: true },
      { name: 'ratePerPaper', label: 'Rate per paper', type: 'number', required: true }
    ]
  },
  {
    _id: 'type-travel-fuel',
    name: 'Travel / Fuel Claims',
    code: REQUEST_TYPE_CODES.TRAVEL_FUEL,
    description: 'Travel and fuel reimbursement claims.',
    requiredDocuments: ['Travel approval', 'Fuel receipt'],
    isActive: true,
    fields: [
      { name: 'travelDate', label: 'Travel date', type: 'date', required: true },
      { name: 'startingLocation', label: 'Starting location', type: 'text', required: true },
      { name: 'destination', label: 'Destination', type: 'text', required: true },
      { name: 'distanceKm', label: 'Distance in kilometers', type: 'number', required: true },
      { name: 'vehicleNumber', label: 'Vehicle number', type: 'text', required: true },
      { name: 'purpose', label: 'Purpose of travel', type: 'textarea', required: true }
    ]
  },
  {
    _id: 'type-general',
    name: 'General Reimbursements',
    code: REQUEST_TYPE_CODES.GENERAL_REIMBURSEMENT,
    description: 'General expense reimbursement claims.',
    requiredDocuments: ['Receipt or invoice'],
    isActive: true,
    fields: [
      { name: 'expenseCategory', label: 'Expense category', type: 'text', required: true },
      { name: 'expenseDate', label: 'Expense date', type: 'date', required: true },
      { name: 'vendor', label: 'Vendor/payee', type: 'text', required: true },
      { name: 'receiptNo', label: 'Invoice/receipt number', type: 'text', required: true },
      { name: 'amount', label: 'Amount', type: 'number', required: true }
    ]
  },
  {
    _id: 'type-special',
    name: 'Special / Equipment Claims',
    code: REQUEST_TYPE_CODES.SPECIAL_EQUIPMENT,
    description: 'Special claims and equipment/service purchases.',
    requiredDocuments: ['Quotation or invoice'],
    isActive: true,
    fields: [
      { name: 'itemName', label: 'Item/service name', type: 'text', required: true },
      { name: 'purpose', label: 'Purpose', type: 'textarea', required: true },
      { name: 'supplier', label: 'Supplier/vendor', type: 'text', required: true },
      { name: 'amount', label: 'Amount', type: 'number', required: true }
    ]
  }
];

const approvalRules: any[] = [
  {
    _id: 'rule-small-academic',
    name: 'Small academic claims',
    requestTypes: [requestTypes[0], requestTypes[1]],
    minAmount: 0,
    maxAmount: 25000,
    workflowRoles: [ROLES.HOD],
    priority: 10,
    includeFinanceReview: false,
    isActive: true
  },
  {
    _id: 'rule-medium-academic',
    name: 'Medium academic claims',
    requestTypes: [requestTypes[0], requestTypes[1]],
    minAmount: 25000.01,
    maxAmount: 75000,
    workflowRoles: [ROLES.HOD, ROLES.ASSOCIATE_DEAN],
    priority: 10,
    includeFinanceReview: false,
    isActive: true
  },
  {
    _id: 'rule-travel',
    name: 'Travel and fuel claims',
    requestTypes: [requestTypes[2]],
    minAmount: 0,
    maxAmount: null,
    workflowRoles: [ROLES.DEPARTMENT_COORDINATOR, ROLES.HOD],
    priority: 20,
    includeFinanceReview: false,
    isActive: true
  },
  {
    _id: 'rule-special',
    name: 'Special and equipment claims',
    requestTypes: [requestTypes[4]],
    minAmount: 0,
    maxAmount: null,
    workflowRoles: [ROLES.HOD, ROLES.FINANCE_DIVISION, ROLES.APPROVING_AUTHORITY],
    priority: 30,
    includeFinanceReview: false,
    isActive: true
  }
];

function steps(roles: string[], pendingIndex: number) {
  return [...roles, ROLES.FINANCE_OFFICER].map((role, index) => ({
    _id: `step-${role}-${index}`,
    stepIndex: index,
    role,
    stepType:
      role === ROLES.DEPARTMENT_COORDINATOR
        ? STEP_TYPES.VERIFICATION
        : role === ROLES.FINANCE_DIVISION
          ? STEP_TYPES.FINANCE_REVIEW
          : role === ROLES.FINANCE_OFFICER
            ? STEP_TYPES.PAYMENT
            : STEP_TYPES.APPROVAL,
    status: index < pendingIndex ? STEP_STATUSES.COMPLETED : index === pendingIndex ? STEP_STATUSES.PENDING : STEP_STATUSES.WAITING
  }));
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

const lecturer = users.find((user) => user.email === 'lecturer@uor.lk');
const requester = users.find((user) => user.email === 'requester@uor.lk');

const requests: any[] = [
  {
    _id: 'request-12000062',
    requestId: '12000062',
    requester: lecturer._id,
    requesterSnapshot: snapshot(lecturer),
    requestType: requestTypes[0],
    title: 'Lecture Hours Payment - Embedded Systems',
    description: 'Payment for delivered lecture hours.',
    amount: 15000,
    currency: 'LKR',
    requestData: { courseName: 'Embedded Systems', lectureHours: 15, ratePerHour: 1000 },
    documents: [],
    status: REQUEST_STATUSES.UNDER_REVIEW,
    currentStepIndex: 0,
    workflowSteps: steps([ROLES.HOD], 0),
    currentAssignedRole: ROLES.HOD,
    approvalHistory: [],
    clarificationHistory: [],
    revisionNo: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString()
  },
  {
    _id: 'request-12000065',
    requestId: '12000065',
    requester: requester._id,
    requesterSnapshot: snapshot(requester, ROLES.REQUESTER),
    requestType: requestTypes[2],
    title: 'Fuel Claim for Department Visit',
    description: 'Official department visit.',
    amount: 20000,
    currency: 'LKR',
    requestData: { travelDate: '2026-06-01', destination: 'Galle', distanceKm: 120 },
    documents: [],
    status: REQUEST_STATUSES.UNDER_VERIFICATION,
    currentStepIndex: 0,
    workflowSteps: steps([ROLES.DEPARTMENT_COORDINATOR, ROLES.HOD], 0),
    currentAssignedRole: ROLES.DEPARTMENT_COORDINATOR,
    approvalHistory: [],
    clarificationHistory: [],
    revisionNo: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString()
  },
  {
    _id: 'request-12000067',
    requestId: '12000067',
    requester: lecturer._id,
    requesterSnapshot: snapshot(lecturer),
    requestType: requestTypes[3],
    title: 'Reimbursement with Clarification Requested',
    amount: 12500,
    currency: 'LKR',
    requestData: { expenseCategory: 'Office supplies', vendor: 'Demo Vendor' },
    documents: [],
    status: REQUEST_STATUSES.INFO_REQUESTED,
    currentStepIndex: 0,
    workflowSteps: steps([ROLES.HOD], 0).map((step) => ({ ...step, status: step.stepIndex === 0 ? STEP_STATUSES.INFO_REQUESTED : step.status })),
    previousAssignedRoleWhenInfoRequested: ROLES.HOD,
    approvalHistory: [],
    clarificationHistory: [
      {
        _id: 'clarification-1',
        action: APPROVAL_ACTIONS.REQUEST_INFO,
        role: ROLES.HOD,
        remarks: 'Please upload the original receipt.',
        createdAt: new Date().toISOString()
      }
    ],
    revisionNo: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString()
  },
  {
    _id: 'request-12000069',
    requestId: '12000069',
    requester: lecturer._id,
    requesterSnapshot: snapshot(lecturer),
    requestType: requestTypes[1],
    title: 'Approved Request Pending Payment',
    amount: 18000,
    currency: 'LKR',
    requestData: { examName: 'Mid Semester', numberOfPapers: 45, ratePerPaper: 400 },
    documents: [],
    status: REQUEST_STATUSES.PAYMENT_PENDING,
    currentStepIndex: 1,
    workflowSteps: steps([ROLES.HOD], 1),
    currentAssignedRole: ROLES.FINANCE_OFFICER,
    approvalHistory: [],
    clarificationHistory: [],
    revisionNo: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString()
  },
  {
    _id: 'request-12000070',
    requestId: '12000070',
    requester: lecturer._id,
    requesterSnapshot: snapshot(lecturer),
    requestType: requestTypes[0],
    title: 'Paid Lecture Claim',
    amount: 22000,
    currency: 'LKR',
    requestData: { courseName: 'Control Systems', lectureHours: 22, ratePerHour: 1000 },
    documents: [],
    status: REQUEST_STATUSES.PAID,
    currentStepIndex: 1,
    workflowSteps: steps([ROLES.HOD], 1).map((step) => ({ ...step, status: STEP_STATUSES.COMPLETED })),
    currentAssignedRole: undefined,
    approvalHistory: [],
    clarificationHistory: [],
    payment: {
      paidAt: new Date().toISOString(),
      amount: 22000,
      referenceNo: 'PAY-DEMO-001',
      remarks: 'Demo payment'
    },
    revisionNo: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  }
];

const notifications: any[] = [
  {
    _id: 'notification-1',
    user: lecturer._id,
    title: 'Clarification Requested',
    message: 'Request 12000067 requires more information.',
    type: 'REQUEST',
    isRead: false,
    relatedRequest: requests[2],
    createdAt: new Date().toISOString()
  },
  {
    _id: 'notification-2',
    role: ROLES.HOD,
    title: 'New request assigned',
    message: 'Request 12000062 is waiting for HoD approval.',
    type: 'REQUEST',
    isRead: false,
    relatedRequest: requests[0],
    createdAt: new Date().toISOString()
  }
];

const accountRequests: any[] = [
  {
    _id: 'account-request-1',
    fullName: 'Pending Staff Member',
    email: 'pending.staff@uor.lk',
    department,
    faculty,
    requestedRole: ROLES.REQUESTER,
    message: 'Need access to submit reimbursements.',
    status: ACCOUNT_REQUEST_STATUSES.PENDING,
    createdAt: new Date().toISOString()
  }
];

const auditLogs: any[] = [
  {
    _id: 'audit-1',
    actorRole: ROLES.ADMIN,
    action: 'DEMO_MODE_STARTED',
    entityType: 'System',
    description: 'MongoDB was unavailable, so the API started with demo data.',
    createdAt: new Date().toISOString()
  }
];

function demoOnly(req: any, res: any, next: any) {
  if (!req.app.locals.demoMode) return next();
  return next();
}

function publicUser(user: any, activeRole?: string) {
  return { ...user, activeRole };
}

function getBearer(req: any) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : undefined;
}

function demoAuth(req: any, res: any, next: any) {
  const token = getBearer(req);
  if (!token) return res.status(401).json({ message: 'Authentication token is required.' });
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as any;
    const user = users.find((item) => item._id === decoded.userId);
    if (!user) return res.status(401).json({ message: 'Invalid token.' });
    req.demoUser = publicUser(user, decoded.activeRole);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function currentUser(req: any) {
  return req.demoUser;
}

function matchingRule(typeId: string, amount: number) {
  return approvalRules.find((rule) => {
    const hasType = rule.requestTypes.some((type: any) => type._id === typeId);
    const max = rule.maxAmount ?? Infinity;
    return hasType && amount >= rule.minAmount && amount <= max;
  });
}

function statusForStep(step: any) {
  if (!step) return REQUEST_STATUSES.APPROVED;
  if (step.stepType === STEP_TYPES.VERIFICATION) return REQUEST_STATUSES.UNDER_VERIFICATION;
  if (step.stepType === STEP_TYPES.PAYMENT) return REQUEST_STATUSES.PAYMENT_PENDING;
  return REQUEST_STATUSES.UNDER_REVIEW;
}

function routeRequest(request: any) {
  const rule = matchingRule(String(request.requestType?._id || request.requestType), request.amount);
  const workflowRoles = rule?.workflowRoles || [ROLES.HOD];
  request.workflowSteps = steps(workflowRoles, 0);
  request.currentStepIndex = 0;
  request.currentAssignedRole = request.workflowSteps[0]?.role;
  request.status = statusForStep(request.workflowSteps[0]);
}

function completeAction(req: any, res: any, action: string) {
  const user = currentUser(req);
  const request = requests.find((item) => item._id === req.params.requestId || item.requestId === req.params.requestId);
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  if (request.currentAssignedRole !== user.activeRole) return res.status(403).json({ message: 'This request is not assigned to your active role.' });
  const step = request.workflowSteps.find((item: any) => item.stepIndex === request.currentStepIndex);
  if (step) {
    step.status = STEP_STATUSES.COMPLETED;
    step.action = action;
    step.remarks = req.body.remarks;
    step.actedAt = new Date().toISOString();
  }
  const next = request.workflowSteps.find((item: any) => item.stepIndex === request.currentStepIndex + 1);
  const fromStatus = request.status;
  if (next) {
    next.status = STEP_STATUSES.PENDING;
    request.currentStepIndex = next.stepIndex;
    request.currentAssignedRole = next.role;
    request.status = statusForStep(next);
  } else {
    request.currentAssignedRole = undefined;
    request.status = REQUEST_STATUSES.APPROVED;
  }
  request.approvalHistory.push({
    _id: `history-${Date.now()}`,
    action,
    role: user.activeRole,
    remarks: req.body.remarks,
    fromStatus,
    toStatus: request.status,
    createdAt: new Date().toISOString()
  });
  request.updatedAt = new Date().toISOString();
  return res.json(request);
}

router.use(demoOnly);

router.post('/auth/login', (req, res) => {
  const user = users.find((item) => item.email === String(req.body.email || '').toLowerCase());
  if (!user || req.body.password !== defaultPassword) return res.status(401).json({ message: 'Invalid email or password.' });
  const activeRole = user.roles.length === 1 ? user.roles[0] : undefined;
  const token = signAuthToken({ userId: user._id, email: user.email, roles: user.roles, activeRole });
  res.json({ token, requiresRoleSelection: user.roles.length > 1, user: publicUser(user, activeRole) });
});

router.post('/auth/forgot-password', (_req, res) => {
  res.json({ message: 'Password reset request has been sent to the administrator.' });
});

router.post('/auth/request-account', (req, res) => {
  const item = { _id: `account-request-${Date.now()}`, status: ACCOUNT_REQUEST_STATUSES.PENDING, createdAt: new Date().toISOString(), ...req.body };
  accountRequests.unshift(item);
  res.status(201).json({ message: 'Account request submitted successfully.', accountRequest: item });
});

router.use(demoAuth);

router.post('/auth/select-role', (req, res) => {
  const user = currentUser(req);
  if (!user.roles.includes(req.body.role)) return res.status(403).json({ message: 'Selected role is not assigned to this user.' });
  const token = signAuthToken({ userId: user._id, email: user.email, roles: user.roles, activeRole: req.body.role });
  res.json({ token, user: publicUser(user, req.body.role) });
});

router.get('/auth/me', (req, res) => {
  res.json({ user: currentUser(req) });
});

router.post('/auth/logout', (_req, res) => {
  res.json({ message: 'Logged out.' });
});

router.get('/notifications', (req, res) => {
  const user = currentUser(req);
  res.json({ items: notifications.filter((item) => item.user === user._id || user.roles.includes(item.role)) });
});

router.patch('/notifications/read-all', (req, res) => {
  const user = currentUser(req);
  notifications.forEach((item) => {
    if (item.user === user._id || user.roles.includes(item.role)) item.isRead = true;
  });
  res.json({ message: 'Notifications marked as read.' });
});

router.get('/notifications/:id', (req, res) => {
  const item = notifications.find((notification) => notification._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Notification not found.' });
  res.json(item);
});

router.patch('/notifications/:id/read', (req, res) => {
  const item = notifications.find((notification) => notification._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Notification not found.' });
  item.isRead = true;
  res.json(item);
});

router.get('/requests/types/active', (_req, res) => {
  res.json({ items: requestTypes.filter((type) => type.isActive) });
});

router.get('/requests/my', (req, res) => {
  const user = currentUser(req);
  const items = requests.filter((request) => request.requester === user._id);
  res.json({ items });
});

router.get('/requests', (req, res) => {
  const user = currentUser(req);
  let items = requests;
  if (user.activeRole && user.activeRole !== ROLES.ADMIN) {
    items = requests.filter((request) => request.requester === user._id || request.currentAssignedRole === user.activeRole);
  }
  if (req.query.status) items = items.filter((request) => request.status === req.query.status);
  res.json({ items, total: items.length, page: 1, pages: 1 });
});

router.post('/requests', (req, res) => {
  const user = currentUser(req);
  const requestType = requestTypes.find((type) => type._id === req.body.requestType) || requestTypes[0];
  const request = {
    _id: `request-${Date.now()}`,
    requestId: String(12000000 + requests.length + 1),
    requester: user._id,
    requesterSnapshot: snapshot(user, user.activeRole),
    requestType,
    title: req.body.title,
    description: req.body.description,
    amount: Number(req.body.amount),
    currency: 'LKR',
    requestData: req.body.requestData || {},
    documents: [],
    status: req.body.submit ? REQUEST_STATUSES.SUBMITTED : REQUEST_STATUSES.DRAFT,
    currentStepIndex: -1,
    workflowSteps: [],
    approvalHistory: [],
    clarificationHistory: [],
    revisionNo: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    submittedAt: req.body.submit ? new Date().toISOString() : undefined
  };
  if (req.body.submit) routeRequest(request);
  requests.unshift(request);
  res.status(201).json(request);
});

router.get('/requests/:id', (req, res) => {
  const item = requests.find((request) => request._id === req.params.id || request.requestId === req.params.id);
  if (!item) return res.status(404).json({ message: 'Request not found.' });
  res.json(item);
});

router.post('/requests/:id/submit', (req, res) => {
  const request = requests.find((item) => item._id === req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  routeRequest(request);
  request.submittedAt = new Date().toISOString();
  res.json(request);
});

router.post('/requests/:id/resubmit', (req, res) => {
  const request = requests.find((item) => item._id === req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  Object.assign(request, req.body);
  request.revisionNo += 1;
  routeRequest(request);
  res.json(request);
});

router.post('/requests/:id/respond-clarification', (req, res) => {
  const user = currentUser(req);
  const request = requests.find((item) => item._id === req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  const step = request.workflowSteps.find((item: any) => item.stepIndex === request.currentStepIndex);
  if (step) step.status = STEP_STATUSES.PENDING;
  request.currentAssignedRole = request.previousAssignedRoleWhenInfoRequested || step?.role;
  request.status = statusForStep(step);
  request.clarificationHistory.push({
    _id: `clarification-${Date.now()}`,
    action: APPROVAL_ACTIONS.RESPOND_CLARIFICATION,
    role: user.activeRole,
    remarks: req.body.remarks,
    createdAt: new Date().toISOString()
  });
  res.json(request);
});

router.get('/approvals/pending', (req, res) => {
  const user = currentUser(req);
  res.json({ items: requests.filter((request) => request.currentAssignedRole === user.activeRole && request.status !== REQUEST_STATUSES.PAYMENT_PENDING) });
});

router.get('/approvals/history', (req, res) => {
  const user = currentUser(req);
  res.json({ items: requests.filter((request) => request.approvalHistory.some((item: any) => item.role === user.activeRole)) });
});

router.post('/approvals/:requestId/approve', (req, res) => completeAction(req, res, APPROVAL_ACTIONS.APPROVE));
router.post('/approvals/:requestId/verify-forward', (req, res) => completeAction(req, res, APPROVAL_ACTIONS.VERIFY_FORWARD));
router.post('/approvals/:requestId/request-info', (req, res) => {
  const user = currentUser(req);
  const request = requests.find((item) => item._id === req.params.requestId || item.requestId === req.params.requestId);
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  request.previousAssignedRoleWhenInfoRequested = user.activeRole;
  request.currentAssignedRole = undefined;
  request.status = REQUEST_STATUSES.INFO_REQUESTED;
  request.clarificationHistory.push({ _id: `clarification-${Date.now()}`, action: APPROVAL_ACTIONS.REQUEST_INFO, role: user.activeRole, remarks: req.body.remarks, createdAt: new Date().toISOString() });
  res.json(request);
});
router.post('/approvals/:requestId/reject', (req, res) => {
  const request = requests.find((item) => item._id === req.params.requestId || item.requestId === req.params.requestId);
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  request.status = REQUEST_STATUSES.REJECTED;
  request.rejectionReason = req.body.remarks;
  request.currentAssignedRole = undefined;
  res.json(request);
});

router.get('/finance/pending-payments', (_req, res) => {
  res.json({ items: requests.filter((request) => request.status === REQUEST_STATUSES.PAYMENT_PENDING) });
});

router.get('/finance/payment-history', (_req, res) => {
  res.json({ items: requests.filter((request) => request.status === REQUEST_STATUSES.PAID).map((request) => ({ _id: `payment-${request._id}`, request, ...request.payment })) });
});

router.get('/finance/:requestId', (req, res) => {
  const request = requests.find((item) => item._id === req.params.requestId || item.requestId === req.params.requestId);
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  res.json(request);
});

router.post('/finance/:requestId/mark-paid', (req, res) => {
  const request = requests.find((item) => item._id === req.params.requestId || item.requestId === req.params.requestId);
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  request.status = REQUEST_STATUSES.PAID;
  request.currentAssignedRole = undefined;
  request.payment = {
    paidAt: req.body.paidAt || new Date().toISOString(),
    amount: Number(req.body.amount || request.amount),
    referenceNo: req.body.referenceNo,
    remarks: req.body.remarks
  };
  res.json({ request, payment: { _id: `payment-${Date.now()}`, request, ...request.payment } });
});

router.post('/finance/:requestId/request-info', (req, res) => {
  const request = requests.find((item) => item._id === req.params.requestId || item.requestId === req.params.requestId);
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  request.status = REQUEST_STATUSES.INFO_REQUESTED;
  request.previousAssignedRoleWhenInfoRequested = ROLES.FINANCE_OFFICER;
  request.currentAssignedRole = undefined;
  res.json(request);
});

router.post('/finance/:requestId/reject', (req, res) => {
  const request = requests.find((item) => item._id === req.params.requestId || item.requestId === req.params.requestId);
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  request.status = REQUEST_STATUSES.REJECTED;
  request.rejectionReason = req.body.remarks;
  request.currentAssignedRole = undefined;
  res.json(request);
});

router.get('/users/me/profile', (req, res) => res.json(currentUser(req)));
router.put('/users/me/profile', (req, res) => {
  Object.assign(currentUser(req), req.body);
  res.json(currentUser(req));
});

router.get('/users', (req, res) => {
  const search = String(req.query.search || '').toLowerCase();
  const items = search ? users.filter((user) => `${user.fullName} ${user.email} ${user.department}`.toLowerCase().includes(search)) : users;
  res.json({ items, total: items.length, page: 1, pages: 1 });
});

router.get('/users/:id', (req, res) => {
  const user = users.find((item) => item._id === req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json(user);
});

router.post('/users', (req, res) => {
  const user = { _id: `demo-user-${Date.now()}`, isActive: true, ...req.body };
  delete user.password;
  users.unshift(user);
  res.status(201).json(user);
});

router.put('/users/:id', (req, res) => {
  const user = users.find((item) => item._id === req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  Object.assign(user, req.body);
  res.json(user);
});

router.patch('/users/:id/activate', (req, res) => {
  const user = users.find((item) => item._id === req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  user.isActive = true;
  res.json(user);
});

router.patch('/users/:id/deactivate', (req, res) => {
  const user = users.find((item) => item._id === req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  user.isActive = false;
  res.json(user);
});

router.patch('/users/:id/reset-password', (_req, res) => res.json({ message: 'Password reset successfully.' }));

router.get('/admin/dashboard', (_req, res) => {
  const statusCounts = Object.values(REQUEST_STATUSES).map((status) => ({ _id: status, count: requests.filter((request) => request.status === status).length }));
  res.json({
    users: users.length,
    requests: requests.length,
    pendingAccountRequests: accountRequests.filter((item) => item.status === ACCOUNT_REQUEST_STATUSES.PENDING).length,
    pendingPayments: requests.filter((request) => request.status === REQUEST_STATUSES.PAYMENT_PENDING).length,
    statusCounts
  });
});

router.get('/admin/approval-rules', (_req, res) => res.json({ items: approvalRules }));
router.post('/admin/approval-rules', (req, res) => {
  const item = { _id: `rule-${Date.now()}`, includeFinanceReview: false, isActive: true, ...req.body };
  item.requestTypes = requestTypes.filter((type) => item.requestTypes.includes(type._id));
  approvalRules.unshift(item);
  res.status(201).json(item);
});
router.put('/admin/approval-rules/:id', (req, res) => {
  const item = approvalRules.find((rule) => rule._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Approval rule not found.' });
  Object.assign(item, req.body);
  item.requestTypes = requestTypes.filter((type) => req.body.requestTypes?.includes(type._id));
  res.json(item);
});

router.get('/admin/request-types', (_req, res) => res.json({ items: requestTypes }));
router.post('/admin/request-types', (req, res) => {
  const item = { _id: `type-${Date.now()}`, isActive: true, ...req.body };
  requestTypes.unshift(item);
  res.status(201).json(item);
});
router.put('/admin/request-types/:id', (req, res) => {
  const item = requestTypes.find((type) => type._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Request type not found.' });
  Object.assign(item, req.body);
  res.json(item);
});

router.get('/account-requests', (_req, res) => res.json({ items: accountRequests }));
router.patch('/account-requests/:id/approve', (req, res) => {
  const item = accountRequests.find((request) => request._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Account request not found.' });
  item.status = ACCOUNT_REQUEST_STATUSES.APPROVED;
  res.json({ accountRequest: item });
});
router.patch('/account-requests/:id/reject', (req, res) => {
  const item = accountRequests.find((request) => request._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Account request not found.' });
  item.status = ACCOUNT_REQUEST_STATUSES.REJECTED;
  item.adminRemarks = req.body.adminRemarks;
  res.json(item);
});

router.get('/reports/summary', (_req, res) => {
  res.json({
    statusCounts: Object.values(REQUEST_STATUSES).map((status) => ({ _id: status, count: requests.filter((request) => request.status === status).length })),
    typeCounts: requestTypes.map((type) => ({
      _id: type._id,
      count: requests.filter((request) => request.requestType?._id === type._id).length,
      amount: requests.filter((request) => request.requestType?._id === type._id).reduce((sum, request) => sum + request.amount, 0)
    })),
    totalAmount: { amount: requests.reduce((sum, request) => sum + request.amount, 0), count: requests.length },
    recentRequests: requests
  });
});
router.get('/reports/claims-per-user', (_req, res) => res.json({ items: [] }));
router.get('/reports/monthly-summary', (_req, res) => res.json({ items: [] }));
router.get('/reports/pending-vs-approved', (_req, res) => res.json({ items: [] }));
router.get('/reports/payment-history', (_req, res) => res.json({ items: [] }));
router.get('/reports/export/pdf', (_req, res) => res.type('application/pdf').send(Buffer.from('Demo PDF export')));
router.get('/reports/export/excel', (_req, res) => res.type('text/plain').send('Demo Excel export'));

router.get('/audit-logs', (_req, res) => res.json({ items: auditLogs }));

router.use((req, res) => {
  res.status(404).json({ message: `Demo route not found: ${req.method} ${req.originalUrl}` });
});

export default router;

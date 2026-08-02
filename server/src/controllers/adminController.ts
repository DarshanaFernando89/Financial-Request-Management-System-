import { ApprovalRuleModel } from '../models/ApprovalRule.js';
import { RequestTypeModel } from '../models/RequestType.js';
import { RequestModel } from '../models/Request.js';
import { UserModel } from '../models/User.js';
import { AccountRequestModel } from '../models/AccountRequest.js';
import { CustomRoleModel } from '../models/CustomRole.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLE_LABELS, ROLES } from '../utils/constants.js';

export const adminDashboard = asyncHandler(async (_req, res) => {
  const [users, requests, pendingAccountRequests, pendingPayments, statusCounts] = await Promise.all([
    UserModel.countDocuments(),
    RequestModel.countDocuments(),
    AccountRequestModel.countDocuments({ status: 'PENDING' }),
    RequestModel.countDocuments({ status: 'PAYMENT_PENDING' }),
    RequestModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  ]);
  res.json({ users, requests, pendingAccountRequests, pendingPayments, statusCounts });
});

async function assertNoConflictingRule(input: any, ignoreId?: string) {
  const query: any = {
    _id: ignoreId ? { $ne: ignoreId } : undefined,
    isActive: true,
    requestTypes: { $in: input.requestTypes || [] },
    priority: input.priority ?? 100
  };
  Object.keys(query).forEach((key) => query[key] === undefined && delete query[key]);
  const candidates = await ApprovalRuleModel.find(query);
  const min = Number(input.minAmount);
  const max = input.maxAmount === null || input.maxAmount === undefined || input.maxAmount === '' ? Infinity : Number(input.maxAmount);
  const conflict = candidates.find((rule: any) => {
    const otherMin = Number(rule.minAmount);
    const otherMax = rule.maxAmount === null || rule.maxAmount === undefined ? Infinity : Number(rule.maxAmount);
    return min <= otherMax && otherMin <= max;
  });
  if (conflict) throw new ApiError(409, 'An active approval rule conflicts with the same request type, amount range, and priority.');
}

function validateRuleBody(body: any) {
  if (!body.name) throw new ApiError(400, 'Rule name is required.');
  if (!body.requestTypes?.length) throw new ApiError(400, 'At least one request type is required.');
  if (body.minAmount === undefined) throw new ApiError(400, 'Minimum amount is required.');
  if (!body.workflowRoles?.length) throw new ApiError(400, 'Workflow roles are required.');
  if (body.workflowRoles.includes(ROLES.FINANCE_OFFICER)) {
    throw new ApiError(400, 'Finance Officer cannot be configured as a normal approval step.');
  }
}

export const listApprovalRules = asyncHandler(async (_req, res) => {
  const items = await ApprovalRuleModel.find().populate('requestTypes').sort({ priority: 1, minAmount: 1 });
  res.json({ items });
});

export const createApprovalRule = asyncHandler(async (req, res) => {
  validateRuleBody(req.body);
  await assertNoConflictingRule(req.body);
  const item = await ApprovalRuleModel.create(req.body);
  res.status(201).json(await item.populate('requestTypes'));
});

export const updateApprovalRule = asyncHandler(async (req, res) => {
  if (req.body.workflowRoles?.includes(ROLES.FINANCE_OFFICER)) {
    throw new ApiError(400, 'Finance Officer cannot be configured as a normal approval step.');
  }
  const id = String(req.params.id);
  if (req.body.isActive !== false) await assertNoConflictingRule(req.body, id);
  const item = await ApprovalRuleModel.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).populate(
    'requestTypes'
  );
  if (!item) throw new ApiError(404, 'Approval rule not found.');
  res.json(item);
});

export const activateApprovalRule = asyncHandler(async (req, res) => {
  const item = await ApprovalRuleModel.findById(String(req.params.id));
  if (!item) throw new ApiError(404, 'Approval rule not found.');
  await assertNoConflictingRule(item.toObject(), item._id.toString());
  item.isActive = true;
  await item.save();
  res.json(item);
});

export const deactivateApprovalRule = asyncHandler(async (req, res) => {
  const item = await ApprovalRuleModel.findByIdAndUpdate(String(req.params.id), { isActive: false }, { new: true });
  if (!item) throw new ApiError(404, 'Approval rule not found.');
  res.json(item);
});

export const deleteApprovalRule = asyncHandler(async (req, res) => {
  const item = await ApprovalRuleModel.findByIdAndDelete(String(req.params.id));
  if (!item) throw new ApiError(404, 'Approval rule not found.');
  res.status(200).json({ success: true, message: 'Approval rule deleted.' });
});

export const listRequestTypes = asyncHandler(async (_req, res) => {
  const items = await RequestTypeModel.find().sort({ name: 1 });
  res.json({ items });
});

export const createRequestType = asyncHandler(async (req, res) => {
  const item = await RequestTypeModel.create(req.body);
  res.status(201).json(item);
});

export const updateRequestType = asyncHandler(async (req, res) => {
  const item = await RequestTypeModel.findByIdAndUpdate(String(req.params.id), req.body, { new: true, runValidators: true });
  if (!item) throw new ApiError(404, 'Request type not found.');
  res.json(item);
});

export const activateRequestType = asyncHandler(async (req, res) => {
  const item = await RequestTypeModel.findByIdAndUpdate(String(req.params.id), { isActive: true }, { new: true });
  if (!item) throw new ApiError(404, 'Request type not found.');
  res.json(item);
});

export const deactivateRequestType = asyncHandler(async (req, res) => {
  const item = await RequestTypeModel.findByIdAndUpdate(String(req.params.id), { isActive: false }, { new: true });
  if (!item) throw new ApiError(404, 'Request type not found.');
  res.json(item);
});

const SYSTEM_ROLE_CODES = Object.values(ROLES);

function normalizeRoleCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function defaultRoleLabel(code: string) {
  return (
    ROLE_LABELS[code] ||
    code
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  );
}

function isSystemRoleCode(code: string) {
  return SYSTEM_ROLE_CODES.includes(code as any);
}

export const listRoles = asyncHandler(async (_req, res) => {
  const customRoles = await CustomRoleModel.find().sort({ displayName: 1 });
  const customRoleByCode = new Map(customRoles.map((role: any) => [role.code, role]));

  const systemRoles = SYSTEM_ROLE_CODES.flatMap((code) => {
    const override = customRoleByCode.get(code);

    if (code !== ROLES.ADMIN && override?.isActive === false) return [];

    return [
      {
        _id: `system-${code}`,
        code,
        displayName: override?.displayName || defaultRoleLabel(code),
        description: override?.description || 'System role',
        isActive: true,
        isSystem: true
      }
    ];
  });

  const customOnlyRoles = customRoles
    .filter((role: any) => !isSystemRoleCode(role.code) && role.isActive !== false)
    .map((role: any) => ({ ...role.toObject(), isSystem: false }));

  res.json({ items: [...systemRoles, ...customOnlyRoles] });
});

export const createRole = asyncHandler(async (req, res) => {
  const code = normalizeRoleCode(String(req.body.code || req.body.displayName || ''));
  if (!code || !req.body.displayName) throw new ApiError(400, 'Role code and display name are required.');
  if (code === ROLES.ADMIN) throw new ApiError(403, 'Admin role already exists and cannot be created.');

  if (isSystemRoleCode(code)) {
    const item = await CustomRoleModel.findOneAndUpdate(
      { code },
      {
        code,
        displayName: req.body.displayName,
        description: req.body.description || 'System role',
        isActive: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    res.status(201).json(item);
    return;
  }

  const item = await CustomRoleModel.create({
    code,
    displayName: req.body.displayName,
    description: req.body.description,
    isActive: req.body.isActive ?? true
  });
  res.status(201).json(item);
});

export const updateRole = asyncHandler(async (req, res) => {
  const item = await CustomRoleModel.findByIdAndUpdate(String(req.params.id), req.body, { new: true, runValidators: true });
  if (!item) throw new ApiError(404, 'Role not found.');
  res.json(item);
});

export const deleteRole = asyncHandler(async (req, res) => {
  const id = String(req.params.id);

  if (id === `system-${ROLES.ADMIN}` || normalizeRoleCode(id) === ROLES.ADMIN) {
    throw new ApiError(403, 'Admin role cannot be deleted.');
  }

  if (id.startsWith('system-')) {
    const code = normalizeRoleCode(id.replace(/^system-/, ''));
    if (!isSystemRoleCode(code)) throw new ApiError(404, 'Role not found.');
    if (code === ROLES.ADMIN) throw new ApiError(403, 'Admin role cannot be deleted.');

    await CustomRoleModel.findOneAndUpdate(
      { code },
      {
        code,
        displayName: defaultRoleLabel(code),
        description: 'System role',
        isActive: false
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: 'Role deleted.' });
    return;
  }

  const existing = await CustomRoleModel.findById(id);
  if (existing?.code === ROLES.ADMIN) throw new ApiError(403, 'Admin role cannot be deleted.');

  const item = existing ? await CustomRoleModel.findByIdAndDelete(id) : null;
  if (!item) throw new ApiError(404, 'Role not found.');
  res.status(200).json({ success: true, message: 'Role deleted.' });
});

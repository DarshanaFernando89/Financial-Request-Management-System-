import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { writeAuditLog } from '../services/auditService.js';
import { APPROVER_ROLES, ROLES } from '../utils/constants.js';

function configuredApprovalRolePasswords(user: any) {
  const hashes = user.approvalRolePasswordHashes as Map<string, string> | undefined;
  return hashes ? Array.from(hashes.keys()).filter((role) => APPROVER_ROLES.includes(role as any)) : [];
}

function publicUser(user: any) {
  const object = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete object.passwordHash;
  delete object.approvalRolePasswordHashes;
  delete object.__v;
  object.approvalRolePasswordConfiguredRoles = configuredApprovalRolePasswords(user);
  return object;
}

async function buildApprovalRolePasswordHashes(input: {
  roles: string[];
  approvalRolePasswords?: Record<string, unknown>;
  existingHashes?: Map<string, string>;
}) {
  const nextHashes = new Map<string, string>();
  const selectedApprovalRoles = input.roles.filter((role) => APPROVER_ROLES.includes(role as any));

  for (const role of selectedApprovalRoles) {
    const rawPassword = input.approvalRolePasswords?.[role];
    const password = typeof rawPassword === 'string' ? rawPassword.trim() : '';
    const existingHash = input.existingHashes?.get(role);

    if (password) {
      nextHashes.set(role, await bcrypt.hash(password, 10));
    } else if (existingHash) {
      nextHashes.set(role, existingHash);
    } else if (input.roles.length > 1) {
      throw new ApiError(400, `Approval password is required for ${role}.`);
    }
  }

  return nextHashes;
}

function buildUserFilter(query: any) {
  const filter: any = {};
  if (query.search) {
    const search = new RegExp(String(query.search), 'i');
    filter.$or = [{ fullName: search }, { nameWithInitials: search }, { email: search }, { department: search }];
  }
  if (query.role) filter.roles = query.role;
  if (query.staffCategory) filter.staffCategory = query.staffCategory;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  return filter;
}

export const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const filter = buildUserFilter(req.query);
  const [items, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    UserModel.countDocuments(filter)
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await UserModel.findById(req.params.id).select('+approvalRolePasswordHashes');
  if (!user) throw new ApiError(404, 'User not found.');
  res.json(publicUser(user));
});

export const createUser = asyncHandler(async (req, res) => {
  const {
    nameWithInitials,
    fullName,
    email,
    password,
    employeeNo,
    indexNo,
    staffCategory,
    department,
    faculty,
    contactNo,
    address,
    profileImageUrl,
    roles,
    approvalRolePasswords
  } = req.body;

  if (!nameWithInitials || !fullName || !email || !password || !staffCategory || !department || !faculty || !roles?.length) {
    throw new ApiError(400, 'Missing required user fields.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const approvalRolePasswordHashes = await buildApprovalRolePasswordHashes({ roles, approvalRolePasswords });
  const user = await UserModel.create({
    nameWithInitials,
    fullName,
    email,
    passwordHash,
    employeeNo,
    indexNo,
    staffCategory,
    department,
    faculty,
    contactNo,
    address,
    profileImageUrl,
    roles,
    approvalRolePasswordHashes,
    isActive: req.body.isActive ?? true
  });

  await writeAuditLog({
    actor: (req as any).user?.userId,
    actorRole: (req as any).user?.activeRole,
    action: 'CREATE_USER',
    entityType: 'User',
    entityId: user._id.toString(),
    description: `Created user ${user.email}.`
  });

  res.status(201).json(publicUser(user));
});

export const updateUser = asyncHandler(async (req, res) => {
  const blocked = ['password', 'passwordHash', 'approvalRolePasswordHashes', '_id', 'createdAt', 'updatedAt'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => !blocked.includes(key)));
  const existing = (await UserModel.findById(req.params.id).select('+approvalRolePasswordHashes')) as any;
  if (!existing) throw new ApiError(404, 'User not found.');

  const roles = (updates.roles as string[] | undefined) || existing.roles;
  if (req.body.approvalRolePasswords || updates.roles) {
    updates.approvalRolePasswordHashes = await buildApprovalRolePasswordHashes({
      roles,
      approvalRolePasswords: req.body.approvalRolePasswords,
      existingHashes: existing.approvalRolePasswordHashes
    });
  }

  const user = await UserModel.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select(
    '+approvalRolePasswordHashes'
  );
  if (!user) throw new ApiError(404, 'User not found.');
  await writeAuditLog({
    actor: (req as any).user?.userId,
    actorRole: (req as any).user?.activeRole,
    action: 'UPDATE_USER',
    entityType: 'User',
    entityId: user._id.toString()
  });
  res.json(publicUser(user));
});

export const activateUser = asyncHandler(async (req, res) => {
  const user = await UserModel.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  if (!user) throw new ApiError(404, 'User not found.');
  res.json(user);
});

export const deactivateUser = asyncHandler(async (req, res) => {
  const existing = await UserModel.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'User not found.');
  if (existing.roles.includes(ROLES.ADMIN)) {
    throw new ApiError(403, 'Admin accounts cannot be deactivated.');
  }
  const user = await UserModel.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) throw new ApiError(404, 'User not found.');
  res.json(user);
});

export const updateRoles = asyncHandler(async (req, res) => {
  if (!req.body.roles?.length) throw new ApiError(400, 'At least one role is required.');
  const existing = (await UserModel.findById(req.params.id).select('+approvalRolePasswordHashes')) as any;
  if (!existing) throw new ApiError(404, 'User not found.');

  const approvalRolePasswordHashes = await buildApprovalRolePasswordHashes({
    roles: req.body.roles,
    approvalRolePasswords: req.body.approvalRolePasswords,
    existingHashes: existing.approvalRolePasswordHashes
  });
  const user = await UserModel.findByIdAndUpdate(
    req.params.id,
    { roles: req.body.roles, approvalRolePasswordHashes },
    { new: true, runValidators: true }
  ).select('+approvalRolePasswordHashes');
  if (!user) throw new ApiError(404, 'User not found.');
  res.json(publicUser(user));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const password = req.body.password || 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.findByIdAndUpdate(req.params.id, { passwordHash }, { new: true });
  if (!user) throw new ApiError(404, 'User not found.');
  res.json({ message: 'Password reset successfully.' });
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await UserModel.findById((req as any).user.userId);
  res.json(user);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['contactNo', 'address', 'profileImageUrl'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const user = await UserModel.findByIdAndUpdate((req as any).user.userId, updates, { new: true, runValidators: true });
  res.json(user);
});

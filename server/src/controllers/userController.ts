import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { writeAuditLog } from '../services/auditService.js';
import { ROLES } from '../utils/constants.js';

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
  const user = await UserModel.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  res.json(user);
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
    roles
  } = req.body;

  if (!nameWithInitials || !fullName || !email || !password || !staffCategory || !department || !faculty || !roles?.length) {
    throw new ApiError(400, 'Missing required user fields.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
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

  res.status(201).json(user);
});

export const updateUser = asyncHandler(async (req, res) => {
  const blocked = ['password', 'passwordHash', '_id', 'createdAt', 'updatedAt'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => !blocked.includes(key)));
  const user = await UserModel.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found.');
  await writeAuditLog({
    actor: (req as any).user?.userId,
    actorRole: (req as any).user?.activeRole,
    action: 'UPDATE_USER',
    entityType: 'User',
    entityId: user._id.toString()
  });
  res.json(user);
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

export const deleteUser = asyncHandler(async (req, res) => {
  const existing = await UserModel.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'User not found.');
  if (existing.roles.includes(ROLES.ADMIN)) {
    throw new ApiError(403, 'Admin accounts cannot be deleted.');
  }

  await UserModel.findByIdAndDelete(req.params.id);
  await writeAuditLog({
    actor: (req as any).user?.userId,
    actorRole: (req as any).user?.activeRole,
    action: 'DELETE_USER',
    entityType: 'User',
    entityId: existing._id.toString(),
    description: `Deleted user ${existing.email}.`
  });
  res.json({ message: 'User deleted successfully.' });
});

export const updateRoles = asyncHandler(async (req, res) => {
  if (!req.body.roles?.length) throw new ApiError(400, 'At least one role is required.');
  const user = await UserModel.findByIdAndUpdate(req.params.id, { roles: req.body.roles }, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found.');
  res.json(user);
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

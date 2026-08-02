import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User.js';
import { signAuthToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { APPROVER_ROLES } from '../utils/constants.js';
import { notifyAdmins } from '../services/notificationService.js';
import { writeAuditLog } from '../services/auditService.js';
import { submitAccountRequest } from '../services/accountRequestService.js';

function userPayload(user: any, activeRole?: string) {
  const approvalRolePasswordHashes = user.approvalRolePasswordHashes as Map<string, string> | undefined;
  const approvalRolePasswordConfiguredRoles = approvalRolePasswordHashes
    ? Array.from(approvalRolePasswordHashes.keys()).filter((role) => APPROVER_ROLES.includes(role as any))
    : undefined;

  return {
    _id: user._id,
    nameWithInitials: user.nameWithInitials,
    fullName: user.fullName,
    email: user.email,
    employeeNo: user.employeeNo,
    indexNo: user.indexNo,
    staffCategory: user.staffCategory,
    department: user.department,
    faculty: user.faculty,
    contactNo: user.contactNo,
    address: user.address,
    profileImageUrl: user.profileImageUrl,
    roles: user.roles,
    approvalRolePasswordConfiguredRoles,
    activeRole,
    isActive: user.isActive
  };
}

function requiresApprovalRolePassword(roles: string[], role: string) {
  return roles.length > 1 && APPROVER_ROLES.includes(role as any);
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required.');

  const user = (await UserModel.findOne({ email: String(email).toLowerCase() }).select('+passwordHash')) as any;
  if (!user) throw new ApiError(401, 'Invalid email or password.');
  if (!user.isActive) throw new ApiError(403, 'User account is inactive.');

  const isValid = await bcrypt.compare(String(password), String(user.passwordHash));
  if (!isValid) throw new ApiError(401, 'Invalid email or password.');
  if (!user.roles?.length) throw new ApiError(403, 'No roles are assigned to this account.');

  const roles = user.roles as string[];
  const activeRole = roles.length === 1 ? roles[0] : undefined;
  const token = signAuthToken({
    userId: user._id.toString(),
    email: user.email,
    roles,
    activeRole
  });

  await writeAuditLog({
    actor: user._id.toString(),
    actorRole: activeRole,
    action: 'LOGIN',
    entityType: 'User',
    entityId: user._id.toString(),
    description: activeRole ? `Logged in as ${activeRole}` : 'Authenticated and awaiting role selection.'
  });

  res.json({
    token,
    requiresRoleSelection: roles.length > 1,
    user: userPayload(user, activeRole)
  });
});

export const selectRole = asyncHandler(async (req, res) => {
  const { role, approvalRolePassword } = req.body;
  const session = (req as any).user;
  if (!role) throw new ApiError(400, 'Role is required.');
  if (!session.roles.includes(role)) throw new ApiError(403, 'Selected role is not assigned to this user.');

  let user = session.user;
  let approvalRoleVerifiedAt: number | undefined;
  if (requiresApprovalRolePassword(session.roles, role)) {
    user = await UserModel.findById(session.userId).select('+approvalRolePasswordHashes');
    if (!user) throw new ApiError(401, 'User account is inactive or unavailable.');

    const approvalRolePasswordHash = (user as any).approvalRolePasswordHashes?.get(role);
    if (!approvalRolePasswordHash) {
      throw new ApiError(403, 'An administrator must set the approval password before this role can be selected.');
    }
    if (!approvalRolePassword) throw new ApiError(400, 'Approval role password is required.');

    const isValid = await bcrypt.compare(String(approvalRolePassword), String(approvalRolePasswordHash));
    if (!isValid) throw new ApiError(401, 'Invalid approval role password.');
    approvalRoleVerifiedAt = Date.now();
  }

  const token = signAuthToken({
    userId: session.userId,
    email: session.email,
    roles: session.roles,
    activeRole: role,
    approvalRoleVerifiedAt
  });

  await writeAuditLog({
    actor: session.userId,
    actorRole: role,
    action: 'SELECT_ROLE',
    entityType: 'User',
    entityId: session.userId,
    description: `Selected active role ${role}.`
  });

  res.json({ token, user: userPayload(user, role) });
});

export const me = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  res.json({ user: userPayload(session.user, session.activeRole) });
});

export const logout = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  if (session) {
    await writeAuditLog({
      actor: session.userId,
      actorRole: session.activeRole,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: session.userId
    });
  }
  res.json({ message: 'Logged out.' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email is required.');
  await notifyAdmins('Password reset requested', `${email} requested a password reset.`);
  res.json({ message: 'Password reset request has been sent to the administrator.' });
});

export const requestAccount = asyncHandler(async (req, res) => {
  const accountRequest = await submitAccountRequest(req.body);
  res.status(201).json({
    message: 'Account request submitted successfully.',
    accountRequest
  });
});

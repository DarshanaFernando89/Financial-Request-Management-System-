import bcrypt from 'bcryptjs';
import { AccountRequestModel } from '../models/AccountRequest.js';
import { UserModel } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ACCOUNT_REQUEST_STATUSES, STAFF_CATEGORIES } from '../utils/constants.js';
import { submitAccountRequest } from '../services/accountRequestService.js';

export const listAccountRequests = asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const search = new RegExp(String(req.query.search), 'i');
    filter.$or = [{ fullName: search }, { email: search }, { department: search }];
  }
  const items = await AccountRequestModel.find(filter).sort({ createdAt: -1 });
  res.json({ items });
});

export const getAccountRequest = asyncHandler(async (req, res) => {
  const item = await AccountRequestModel.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Account request not found.');
  res.json(item);
});

export const createAccountRequest = asyncHandler(async (req, res) => {
  const item = await submitAccountRequest(req.body);
  res.status(201).json(item);
});

export const approveAccountRequest = asyncHandler(async (req, res) => {
  const item = await AccountRequestModel.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Account request not found.');
  if (item.status !== ACCOUNT_REQUEST_STATUSES.PENDING) throw new ApiError(422, 'Account request has already been processed.');

  const password = req.body.password || 'Password123!';
  const user = await UserModel.create({
    nameWithInitials: req.body.nameWithInitials || item.fullName,
    fullName: item.fullName,
    email: item.email,
    passwordHash: await bcrypt.hash(password, 10),
    employeeNo: req.body.employeeNo,
    staffCategory: req.body.staffCategory || STAFF_CATEGORIES.NON_ACADEMIC,
    department: item.department,
    faculty: item.faculty,
    roles: [item.requestedRole],
    isActive: true
  });

  item.status = ACCOUNT_REQUEST_STATUSES.APPROVED;
  item.adminRemarks = req.body.adminRemarks;
  await item.save();

  res.json({ accountRequest: item, user });
});

export const rejectAccountRequest = asyncHandler(async (req, res) => {
  const item = await AccountRequestModel.findByIdAndUpdate(
    req.params.id,
    { status: ACCOUNT_REQUEST_STATUSES.REJECTED, adminRemarks: req.body.adminRemarks },
    { new: true }
  );
  if (!item) throw new ApiError(404, 'Account request not found.');
  res.json(item);
});

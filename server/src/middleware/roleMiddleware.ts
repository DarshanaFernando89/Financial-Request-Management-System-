import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';

export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const activeRole = (req as any).user?.activeRole;
    const assignedRoles = (req as any).user?.roles || [];
    if (!activeRole || !assignedRoles.includes(activeRole) || !roles.includes(activeRole)) {
      return next(new ApiError(403, 'You do not have permission to access this resource.'));
    }
    next();
  };
}

export function requireAssignedRole(req: Request, _res: Response, next: NextFunction) {
  const activeRole = (req as any).user?.activeRole;
  const assignedRoles = (req as any).user?.roles || [];
  if (!activeRole || !assignedRoles.includes(activeRole)) {
    return next(new ApiError(403, 'Active role is not assigned to this user.'));
  }
  next();
}

export function requireApproverRole(req: Request, _res: Response, next: NextFunction) {
  const session = (req as any).user;
  if (!session?.activeRole || !session.roles.includes(session.activeRole) || !session.approvalRoles.includes(session.activeRole)) {
    return next(new ApiError(403, 'You do not have permission to approve requests.'));
  }
  next();
}

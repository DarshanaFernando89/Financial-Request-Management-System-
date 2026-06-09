import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export type JwtPayload = {
  userId: string;
  email: string;
  roles: string[];
  activeRole?: string;
};

export function signAuthToken(payload: JwtPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new ApiError(401, 'Authentication token is required.');

    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.isActive) throw new ApiError(401, 'User account is inactive or unavailable.');

    (req as any).user = {
      userId: user._id.toString(),
      email: user.email,
      roles: user.roles,
      activeRole: decoded.activeRole,
      user
    };
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, 'Invalid or expired token.'));
  }
}

export function requireActiveRole(req: Request, _res: Response, next: NextFunction) {
  const activeRole = (req as any).user?.activeRole;
  if (!activeRole) return next(new ApiError(403, 'Select an active role before continuing.'));
  next();
}

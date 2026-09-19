import { Request } from 'express';
import { UserRole, UserStatus } from '@prisma/client';

/**
 * Typed request after JWT authentication.
 * Used instead of `any` in all controller @Req() parameters.
 */
export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;       // user ID
    email: string;
    role: UserRole;
    status: UserStatus;
  };
}

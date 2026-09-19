/**
 * Identity module entity types.
 *
 * These are re-exports of Prisma-generated types for use within the
 * Identity module. Prisma is the source of truth for database schemas.
 * No additional entity classes are needed.
 */

export type {
  User,
  UserProfile,
  UserPermission,
  UserIdentityDocument,
  PaymentCard,
  PayoutAccount,
  RefreshToken,
} from '@prisma/client';

/**
 * Safe user representation with sensitive fields stripped.
 * Used for API responses to avoid leaking password hashes,
 * soft-delete timestamps, and raw card numbers.
 */
export type { SafeUser } from '../types/user.types';

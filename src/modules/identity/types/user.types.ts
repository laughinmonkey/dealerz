import type {
  User,
  UserProfile,
  UserPermission,
  UserIdentityDocument,
  PaymentCard,
  PayoutAccount,
} from '@prisma/client';

/**
 * Public-safe user representation — excludes password hash, soft-delete
 * timestamps and identifiers, and masks sensitive card data.
 */
export type SafeUser = Omit<User, 'passwordHash' | 'deletedAt' | 'deletedBy'> & {
  profile?: UserProfile | null;
  permissions?: UserPermission | null;
  identityDoc?: UserIdentityDocument | null;
  paymentCards?: PaymentCard[];
  payoutAccounts?: PayoutAccount[];
};

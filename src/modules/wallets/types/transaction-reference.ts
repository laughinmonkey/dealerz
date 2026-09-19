import { WalletTransactionReferenceType } from '@prisma/client';

/**
 * Reference that links a wallet transaction to its originating business entity.
 * Used by WalletService.debit/credit to create immutable, traceable ledger entries.
 */
export interface TransactionReference {
  type: WalletTransactionReferenceType;
  id: string;
}

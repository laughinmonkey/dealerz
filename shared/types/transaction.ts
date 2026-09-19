// Transaction, Wallet, and Finance types — Assets Marketplace
import {
  TransactionStatus,
  TransactionSource,
  SellerType,
  Currency,
  WalletTransactionType,
  DepositStatus,
  WithdrawalStatus,
} from './enums';

// ─── Marketplace Transaction ─────────────────────────────────────

export interface MarketplaceTransaction {
  id: string;
  listingId: string;
  assetId: string;
  buyerId: string;
  sellerType: SellerType;
  sellerId: string | null;
  transactionSource: TransactionSource;
  status: TransactionStatus;
  currency: Currency;
  agreedPrice: number;
  paymentConfirmedAt: string | null;
  assetTransferredAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  listing?: { id: string; title: string | null };
  asset?: { id: string; title: string };
  buyer?: { id: string; username: string };
}

// ─── Wallet ──────────────────────────────────────────────────────

export interface Wallet {
  id: string;
  userId: string | null;
  ownerType: string;
  currency: Currency;
  availableBalance: number;
  pendingBalance: number;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: string;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

// ─── Deposit ─────────────────────────────────────────────────────

export interface Deposit {
  id: string;
  userId: string;
  currency: Currency;
  amount: number;
  status: DepositStatus;
  paymentReference: string | null;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Withdrawal ──────────────────────────────────────────────────

export interface Withdrawal {
  id: string;
  userId: string;
  currency: Currency;
  amount: number;
  destination: string | null;
  status: WithdrawalStatus;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── DTOs ────────────────────────────────────────────────────────

export interface PlaceBidDto {
  amount: number;
}

// export interface PurchaseListingDto {
//   // No body needed — listing ID is in the URL
// }

export interface CreateDepositDto {
  currency: Currency;
  amount: number;
  paymentReference?: string;
  notes?: string;
}

export interface CreateWithdrawalDto {
  currency: Currency;
  amount: number;
  destination?: string;
  notes?: string;
}

export interface ApproveRejectDto {
  notes?: string;
}

export interface BalanceAdjustDto {
  amount: number;
  reason: string;
}

export interface TransactionFilters extends Record<string, unknown> {
  status?: TransactionStatus;
  transactionSource?: TransactionSource;
  currency?: Currency;
  buyerId?: string;
  sellerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

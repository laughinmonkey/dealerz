// Shared Types — Assets Marketplace
// This package is the single source of truth for all TypeScript interfaces,
// enums, DTOs, and API response shapes used by both backend and frontend.
// Frontend imports from here; backend re-exports for consistency.

// ─── Enums ───────────────────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum OnboardingStage {
  REGISTERED = 'REGISTERED',
  PROFILE_COMPLETED = 'PROFILE_COMPLETED',
  IDENTITY_SUBMITTED = 'IDENTITY_SUBMITTED',
  KYC_SUBMITTED = 'KYC_SUBMITTED',
  KYC_APPROVED = 'KYC_APPROVED',
  TRADING_ENABLED = 'TRADING_ENABLED',
}

export enum KycRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PayoutMethod {
  BANK = 'BANK',
  CRYPTO = 'CRYPTO',
}

export enum OwnerType {
  PLATFORM = 'PLATFORM',
  USER = 'USER',
}

export enum AssetStatus {
  CREATED = 'CREATED',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  AVAILABLE = 'AVAILABLE',
  LISTED = 'LISTED',
  ARCHIVED = 'ARCHIVED',
}

export enum ListingStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  RESERVED = 'RESERVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum SaleType {
  FIXED_PRICE = 'FIXED_PRICE',
  AUCTION = 'AUCTION',
}

export enum SellerType {
  USER = 'USER',
  PLATFORM = 'PLATFORM',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  TRANSFERRING_ASSET = 'TRANSFERRING_ASSET',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
}

export enum TransactionSource {
  FIXED_PRICE = 'FIXED_PRICE',
  AUCTION = 'AUCTION',
  ADMIN = 'ADMIN',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  BTC = 'BTC',
}

export enum WalletTransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum DepositStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  BID = 'BID',
  AUCTION = 'AUCTION',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  KYC = 'KYC',
  LISTING = 'LISTING',
  ADMIN = 'ADMIN',
}

export enum AttributeType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  JSON = 'JSON',
}

// User-related types — Assets Marketplace
import {
  UserRole,
  UserStatus,
  OnboardingStage,
  KycRequestStatus,
  PayoutMethod,
} from './enums';

// ─── User ────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  onboardingStage: OnboardingStage;
  lastLoginAt: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile?: UserProfile;
  permissions?: UserPermission;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phoneNumber: string | null;
  nationality: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  avatarUrl: string | null;
}

export interface UserPermission {
  id: string;
  userId: string;
  canBuy: boolean;
  canSell: boolean;
  canBid: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  canCreateListing: boolean;
  canReceivePayments: boolean;
}

export interface UserIdentityDocument {
  id: string;
  userId: string;
  ssn: string | null;
  nationalId: string | null;
  passportNumber: string | null;
  driverLicenseNumber: string | null;
}

export interface PaymentCard {
  id: string;
  userId: string;
  cardHolderName: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  pin: string | null;
  billingAddress: string | null;
  country: string | null;
}

export interface PayoutAccount {
  id: string;
  userId: string;
  method: PayoutMethod;
  accountHolderName: string;
  bankName: string | null;
  accountNumber: string | null;
  iban: string | null;
  swiftCode: string | null;
  walletAddress: string | null;
  currency: string | null;
  country: string | null;
}

export interface KycRequest {
  id: string;
  userId: string;
  status: KycRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  documents?: KycDocument[];
}

export interface KycDocument {
  id: string;
  kycId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

// ─── DTOs ────────────────────────────────────────────────────────

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface UpdateProfileDto {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNumber?: string;
  nationality?: string;
  country?: string;
  state?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  avatarUrl?: string;
}

export interface UpdateIdentityDto {
  ssn?: string;
  nationalId?: string;
  passportNumber?: string;
  driverLicenseNumber?: string;
}

export interface UpdatePermissionsDto {
  canBuy?: boolean;
  canSell?: boolean;
  canBid?: boolean;
  canDeposit?: boolean;
  canWithdraw?: boolean;
  canCreateListing?: boolean;
  canReceivePayments?: boolean;
}

export interface CreateCardDto {
  cardHolderName: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  billingAddress?: string;
  country?: string;
}

export interface CreatePayoutAccountDto {
  method: PayoutMethod;
  accountHolderName: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
  walletAddress?: string;
  currency?: string;
  country?: string;
}

export interface SubmitKycDto {
  notes?: string;
}

// ─── Watchlist ────────────────────────────────────────────────────

export interface WatchlistItem {
  id: string;
  userId: string;
  listingId: string;
  createdAt: string;
  listing?: import('./asset').Listing;
}

// ─── User Preferences ────────────────────────────────────────────

export interface UserPreferences {
  id: string;
  userId: string;
  emailNotifs: boolean;
  pushNotifs: boolean;
  inAppNotifs: boolean;
  profilePublic: boolean;
  showActivity: boolean;
  language: string;
  currency: string;
  timezone: string;
}

export interface UpdatePreferencesDto {
  emailNotifs?: boolean;
  pushNotifs?: boolean;
  inAppNotifs?: boolean;
  profilePublic?: boolean;
  showActivity?: boolean;
  language?: string;
  currency?: string;
  timezone?: string;
}

// ─── Activity Feed ───────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  action: string;
  targetResource: string;
  resourceId: string | null;
  summary: string | null;
  createdAt: string;
  admin?: { id: string; username: string };
}

// ─── Dashboard Stats ─────────────────────────────────────────────

export interface DashboardStats {
  activeListings: number;
  wonAuctions: number;
  totalSpent: number;
  totalEarned: number;
  completedTransactions: number;
}

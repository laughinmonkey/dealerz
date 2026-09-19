// Admin types — Assets Marketplace

export interface DashboardMetrics {
  users: {
    total: number;
    active: number;
    suspended: number;
    pendingKyc: number;
  };
  assets: {
    total: number;
    platformAssets: number;
    userAssets: number;
    pendingApproval: number;
    approved: number;
    archived: number;
  };
  listings: {
    active: number;
    fixedPrice: number;
    auction: number;
    reserved: number;
    completed: number;
  };
  transactions: {
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
    failed: number;
    disputed: number;
  };
  wallets: {
    totalBalances: Record<string, number>;
    depositsPending: number;
    withdrawalsPending: number;
  };
  revenue: {
    platformSales: number;
    totalVolume: number;
    completedTransactions: number;
  };
}

export interface AdminActivityLog {
  id: string;
  adminId: string;
  action: string;
  targetResource: string;
  resourceId: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  admin?: { id: string; username: string };
}

export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
  role?: string;
}

export interface UpdateUserDto {
  email?: string;
  username?: string;
  status?: string;
  onboardingStage?: string;
}

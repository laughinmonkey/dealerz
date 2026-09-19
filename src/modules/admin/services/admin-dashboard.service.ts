import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [
      // ── Users ────────────────────────────────────────────
      totalUsers,
      activeUsers,
      suspendedUsers,
      pendingKyc,

      // ── Assets ───────────────────────────────────────────
      totalAssets,
      platformAssets,
      userAssets,
      pendingApprovalAssets,
      approvedAssets,
      archivedAssets,

      // ── Listings ─────────────────────────────────────────
      activeListings,
      fixedPriceListings,
      auctionListings,
      reservedListings,
      completedListings,

      // ── Transactions ─────────────────────────────────────
      pendingTx,
      processingTx,
      completedTx,
      cancelledTx,
      failedTx,
      disputedTx,

      // ── Revenue ──────────────────────────────────────────
      platformSalesAgg,
      totalVolumeAgg,
      completedTxCount,

      // ── Wallet per-currency balances ─────────────────────
      walletAgg,

      // ── Deposits / Withdrawals ───────────────────────────
      pendingDeposits,
      pendingWithdrawals,
    ] = await Promise.all([
      // Users
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { status: 'ACTIVE', deletedAt: null },
      }),
      this.prisma.user.count({
        where: { status: 'SUSPENDED', deletedAt: null },
      }),
      this.prisma.kycRequest.count({ where: { status: 'PENDING' } }),

      // Assets
      this.prisma.asset.count({ where: { deletedAt: null } }),
      this.prisma.asset.count({
        where: { ownerType: 'PLATFORM', deletedAt: null },
      }),
      this.prisma.asset.count({
        where: { ownerType: 'USER', deletedAt: null },
      }),
      this.prisma.asset.count({
        where: {
          status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
          deletedAt: null,
        },
      }),
      this.prisma.asset.count({
        where: { status: 'APPROVED', deletedAt: null },
      }),
      this.prisma.asset.count({
        where: { status: 'ARCHIVED', deletedAt: null },
      }),

      // Listings
      this.prisma.listing.count({
        where: { listingStatus: 'ACTIVE', deletedAt: null },
      }),
      this.prisma.listing.count({
        where: { saleType: 'FIXED_PRICE', deletedAt: null },
      }),
      this.prisma.listing.count({
        where: { saleType: 'AUCTION', deletedAt: null },
      }),
      this.prisma.listing.count({
        where: { listingStatus: 'RESERVED', deletedAt: null },
      }),
      this.prisma.listing.count({
        where: { listingStatus: 'COMPLETED', deletedAt: null },
      }),

      // Transactions
      this.prisma.marketplaceTransaction.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.marketplaceTransaction.count({
        where: { status: 'PAYMENT_PENDING' },
      }),
      this.prisma.marketplaceTransaction.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.marketplaceTransaction.count({
        where: { status: 'CANCELLED' },
      }),
      this.prisma.marketplaceTransaction.count({
        where: { status: 'FAILED' },
      }),
      this.prisma.marketplaceTransaction.count({
        where: { status: 'DISPUTED' },
      }),

      // Revenue: platform sales (completed, seller=PLATFORM)
      this.prisma.marketplaceTransaction.aggregate({
        _sum: { agreedPrice: true },
        where: { status: 'COMPLETED', sellerType: 'PLATFORM' },
      }),
      // Revenue: total volume (all completed)
      this.prisma.marketplaceTransaction.aggregate({
        _sum: { agreedPrice: true },
        where: { status: 'COMPLETED' },
      }),
      // Revenue: completed count
      this.prisma.marketplaceTransaction.count({
        where: { status: 'COMPLETED' },
      }),

      // Wallet per-currency balances
      this.prisma.wallet.groupBy({
        by: ['currency'],
        _sum: { availableBalance: true },
      }),

      // Deposits / Withdrawals
      this.prisma.deposit.count({ where: { status: 'PENDING' } }),
      this.prisma.withdrawal.count({ where: { status: 'PENDING' } }),
    ]);

    // Build per-currency balances record
    const totalBalances: Record<string, number> = {};
    for (const entry of walletAgg) {
      totalBalances[entry.currency] =
        Number(entry._sum.availableBalance ?? 0);
    }

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        pendingKyc,
      },
      assets: {
        total: totalAssets,
        platformAssets,
        userAssets,
        pendingApproval: pendingApprovalAssets,
        approved: approvedAssets,
        archived: archivedAssets,
      },
      listings: {
        active: activeListings,
        fixedPrice: fixedPriceListings,
        auction: auctionListings,
        reserved: reservedListings,
        completed: completedListings,
      },
      transactions: {
        pending: pendingTx,
        processing: processingTx,
        completed: completedTx,
        cancelled: cancelledTx,
        failed: failedTx,
        disputed: disputedTx,
      },
      wallets: {
        totalBalances,
        depositsPending: pendingDeposits,
        withdrawalsPending: pendingWithdrawals,
      },
      revenue: {
        platformSales: Number(platformSalesAgg._sum.agreedPrice ?? 0),
        totalVolume: Number(totalVolumeAgg._sum.agreedPrice ?? 0),
        completedTransactions: completedTxCount,
      },
    };
  }
}

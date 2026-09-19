import { Injectable } from '@nestjs/common';
import {
  Currency,
  WalletTransactionType,
  WalletTransactionReferenceType,
} from '@prisma/client';
import { BusinessException, notFound } from '../../../common/exceptions/business.exception';
import {
  WalletRepository,
  WalletTransactionRepository,
} from '../repositories/wallet.repositories';
import type { TransactionReference } from '../types/transaction-reference';
import type { Wallet, WalletTransaction } from '@prisma/client';

/**
 * Maps a TransactionReference to the correct immutable ledger transaction type.
 */
function txTypeForCredit(ref: TransactionReference): WalletTransactionType {
  switch (ref.type) {
    case WalletTransactionReferenceType.DEPOSIT:
      return WalletTransactionType.DEPOSIT;
    case WalletTransactionReferenceType.MARKETPLACE_TRANSACTION:
      return WalletTransactionType.SALE;
    case WalletTransactionReferenceType.ADMIN:
      return WalletTransactionType.ADJUSTMENT;
    default:
      return WalletTransactionType.DEPOSIT;
  }
}

function txTypeForDebit(ref: TransactionReference): WalletTransactionType {
  switch (ref.type) {
    case WalletTransactionReferenceType.WITHDRAWAL:
      return WalletTransactionType.WITHDRAWAL;
    case WalletTransactionReferenceType.MARKETPLACE_TRANSACTION:
      return WalletTransactionType.PURCHASE;
    case WalletTransactionReferenceType.ADMIN:
      return WalletTransactionType.ADJUSTMENT;
    default:
      return WalletTransactionType.WITHDRAWAL;
  }
}

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly txRepo: WalletTransactionRepository,
  ) {}

  // ─── Wallet Queries ────────────────────────────────────────────

  async getWallet(userId: string, currency: Currency): Promise<Wallet> {
    const wallet = await this.walletRepo.findByUserAndCurrency(userId, currency);
    if (!wallet) throw notFound('Wallet');
    return wallet;
  }

  async getWallets(userId: string): Promise<Wallet[]> {
    return await this.walletRepo.findByUser(userId);
  }

  async getWalletById(walletId: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) throw notFound('Wallet', walletId);
    return wallet;
  }

  /**
   * Admin: paginated list of all wallets across users.
   */
  async getAllWallets(filters: {
    userId?: string;
    currency?: Currency;
    page?: number;
    pageSize?: number;
  }) {
    const { userId, currency, page = 1, pageSize = 20 } = filters;

    const where: any = {};
    if (userId) where.userId = userId;
    if (currency) where.currency = currency;

    const [data, total] = await Promise.all([
      this.walletRepo.findAll({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.walletRepo.count({ where }),
    ]);

    return {
      data,
      meta: { page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ─── Wallet Provisioning ───────────────────────────────────────

  /**
   * Called by backend-identity on user registration.
   * Creates one wallet per active currency for the new user.
   * Idempotent: does nothing if wallets already exist.
   */
  async createWalletsForUser(userId: string): Promise<void> {
    const existing = await this.walletRepo.findByUser(userId);
    if (existing.length > 0) return;
    await this.walletRepo.createWalletsForUser(userId);
  }

  // ─── Balance Operations (atomic, with immutable ledger entry) ──

  /**
   * Debit (deduct) funds from a wallet.
   * Creates an immutable wallet_transaction row.
   *
   * @throws INSUFFICIENT_WALLET_BALANCE if available balance < amount
   */
  async debit(
    walletId: string,
    amount: number,
    reference: TransactionReference,
    description?: string,
  ): Promise<WalletTransaction> {
    return await this.walletRepo.transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw notFound('Wallet', walletId);

      const balanceBefore = wallet.availableBalance.toNumber();
      if (balanceBefore < amount) {
        throw new BusinessException(
          'INSUFFICIENT_WALLET_BALANCE',
          `Insufficient ${wallet.currency} balance.`,
          422,
        );
      }

      const balanceAfter = balanceBefore - amount;
      const txType = txTypeForDebit(reference);

      await tx.wallet.update({
        where: { id: walletId },
        data: { availableBalance: balanceAfter },
      });

      return await tx.walletTransaction.create({
        data: {
          walletId,
          type: txType,
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: reference.type,
          referenceId: reference.id,
          description: description ?? null,
        },
      });
    });
  }

  /**
   * Credit (add) funds to a wallet.
   * Creates an immutable wallet_transaction row.
   */
  async credit(
    walletId: string,
    amount: number,
    reference: TransactionReference,
    description?: string,
  ): Promise<WalletTransaction> {
    return await this.walletRepo.transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw notFound('Wallet', walletId);

      const balanceBefore = wallet.availableBalance.toNumber();
      const balanceAfter = balanceBefore + amount;
      const txType = txTypeForCredit(reference);

      await tx.wallet.update({
        where: { id: walletId },
        data: { availableBalance: balanceAfter },
      });

      return await tx.walletTransaction.create({
        data: {
          walletId,
          type: txType,
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: reference.type,
          referenceId: reference.id,
          description: description ?? null,
        },
      });
    });
  }

  // ─── Admin Balance Adjustment ──────────────────────────────────

  /**
   * Adjust a wallet balance by a positive or negative amount.
   * Creates an immutable wallet_transaction row of type ADJUSTMENT.
   *
   * @throws INSUFFICIENT_WALLET_BALANCE if the adjustment would result in negative balance
   */
  async adjustBalance(
    walletId: string,
    adminId: string,
    amount: number,
    reason: string,
  ): Promise<WalletTransaction> {
    return await this.walletRepo.transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw notFound('Wallet', walletId);

      const balanceBefore = wallet.availableBalance.toNumber();
      const balanceAfter = balanceBefore + amount;

      if (balanceAfter < 0) {
        throw new BusinessException(
          'INSUFFICIENT_WALLET_BALANCE',
          'Adjustment would result in negative balance.',
          422,
        );
      }

      await tx.wallet.update({
        where: { id: walletId },
        data: { availableBalance: balanceAfter },
      });

      return await tx.walletTransaction.create({
        data: {
          walletId,
          type: WalletTransactionType.ADJUSTMENT,
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: WalletTransactionReferenceType.ADMIN,
          referenceId: adminId,
          description: reason,
        },
      });
    });
  }
}

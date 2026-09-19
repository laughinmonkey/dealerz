import { Injectable } from '@nestjs/common';
import {
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionReferenceType,
} from '@prisma/client';
import { notFound } from '../../../common/exceptions/business.exception';
import {
  WalletRepository,
  WalletTransactionRepository,
} from '../repositories/wallet.repositories';
import type { CreateLedgerEntryDto, LedgerFiltersDto } from '../dto/wallet.dto';

/**
 * Immutable ledger service.
 *
 * WalletTransaction rows are **never updated**. They serve as an append-only
 * audit trail for every balance change in the system.
 *
 * Direct creation of ledger entries (without a corresponding balance
 * change) is intentionally NOT exposed. Entries are created exclusively
 * by WalletService.debit/credit/adjustBalance, DepositService.approveDeposit,
 * and WithdrawalService.approveWithdrawal, all within database transactions.
 */
@Injectable()
export class WalletTransactionService {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly txRepo: WalletTransactionRepository,
  ) {}

  // ─── Internal: create a ledger entry (no balance update) ───────
  // This is for use by other services that manage the balance update
  // themselves within a broader transaction. Prefer calling
  // WalletService.debit/credit for standard flows.

  /**
   * Create an immutable ledger entry.
   * NOTE: This does NOT modify wallet balances. Use WalletService.debit/credit
   * for balance-changing operations within a DB transaction.
   */
  async createLedgerEntry(
    dto: CreateLedgerEntryDto,
  ): Promise<WalletTransaction> {
    // Verify wallet exists
    const wallet = await this.walletRepo.findById(dto.walletId);
    if (!wallet) throw notFound('Wallet', dto.walletId);

    return await this.txRepo.create({
      walletId: dto.walletId,
      type: dto.type as WalletTransactionType,
      amount: dto.amount,
      balanceBefore: dto.balanceBefore,
      balanceAfter: dto.balanceAfter,
      referenceType: dto.referenceType as WalletTransactionReferenceType,
      referenceId: dto.referenceId ?? undefined,
      description: dto.description ?? undefined,
    });
  }

  // ─── Query ledger entries ──────────────────────────────────────

  async getTransactions(walletId: string, filters: LedgerFiltersDto) {
    const { page = 1, pageSize = 20 } = filters;

    // Verify wallet exists
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) throw notFound('Wallet', walletId);

    const [data, total] = await Promise.all([
      this.txRepo.findByWallet(walletId, {
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.txRepo.count({ where: { walletId } }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma, WithdrawalStatus, WalletTransactionReferenceType } from '@prisma/client';
import { BusinessException, notFound } from '../../../common/exceptions/business.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  WalletRepository,
  WithdrawalRepository,
} from '../repositories/wallet.repositories';
import type { CreateWithdrawalDto, WithdrawalFiltersDto } from '../dto/wallet.dto';
import type { Withdrawal } from '@prisma/client';

@Injectable()
export class WithdrawalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly withdrawalRepo: WithdrawalRepository,
    private readonly walletRepo: WalletRepository,
  ) {}

  // ─── Create ────────────────────────────────────────────────────

  /**
   * Submit a new withdrawal request.
   * Freezes funds: decrements available_balance, increments pending_balance.
   */
  async createWithdrawal(
    userId: string,
    dto: CreateWithdrawalDto,
  ): Promise<Withdrawal> {
    const wallet = await this.walletRepo.findByUserAndCurrency(
      userId,
      dto.currency,
    );
    if (!wallet) throw notFound('Wallet');

    const available = wallet.availableBalance.toNumber();
    if (available < dto.amount) {
      throw new BusinessException(
        'INSUFFICIENT_WALLET_BALANCE',
        `Insufficient ${dto.currency} balance.`,
        422,
      );
    }

    // Create withdrawal and freeze funds atomically
    return await this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          currency: dto.currency,
          amount: dto.amount,
          destination: dto.destination ?? null,
          notes: dto.notes ?? null,
          status: WithdrawalStatus.PENDING,
        },
      });

      // Freeze funds: move from available to pending
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: available - dto.amount,
          pendingBalance: wallet.pendingBalance.toNumber() + dto.amount,
        },
      });

      return withdrawal;
    });
  }

  // ─── Approve / Reject ──────────────────────────────────────────

  /**
   * Approve a pending withdrawal.
   * Atomically: decrements pending_balance → creates immutable ledger entry → updates withdrawal status.
   * Funds were already frozen from available_balance at creation time.
   */
  async approveWithdrawal(
    withdrawalId: string,
    adminId: string,
  ): Promise<Withdrawal> {
    const withdrawal = await this.withdrawalRepo.findByIdOrThrow(withdrawalId);
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BusinessException(
        'WITHDRAWAL_ALREADY_PROCESSED',
        'This withdrawal has already been processed.',
        409,
      );
    }

    const wallet = await this.walletRepo.findByUserAndCurrency(
      withdrawal.userId,
      withdrawal.currency,
    );
    if (!wallet) throw notFound('Wallet');

    // All-or-nothing: pending release + ledger entry + withdrawal status update
    return await this.prisma.$transaction(async (tx) => {
      // Re-read wallet inside transaction for atomic correctness
      const freshWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      if (!freshWallet) throw notFound('Wallet', wallet.id);

      const amount = withdrawal.amount.toNumber();
      const pendingBefore = freshWallet.pendingBalance.toNumber();

      if (pendingBefore < amount) {
        throw new BusinessException(
          'INSUFFICIENT_WALLET_BALANCE',
          `Insufficient pending ${withdrawal.currency} balance.`,
          422,
        );
      }

      // available_balance was already debited at creation; now release the pending freeze
      const pendingAfter = pendingBefore - amount;
      // The ledger entry captures the total available balance as it stands
      const availableBalance = freshWallet.availableBalance.toNumber();

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { pendingBalance: pendingAfter },
      });

      // Create immutable ledger entry
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          amount: withdrawal.amount,
          balanceBefore: availableBalance,    // available was already debited at create time
          balanceAfter: availableBalance,      // no change to available on approval
          referenceType: WalletTransactionReferenceType.WITHDRAWAL,
          referenceId: withdrawalId,
          description: 'Withdrawal approved',
        },
      });

      // Update withdrawal status
      return await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.APPROVED,
          approvedBy: adminId,
          approvedAt: new Date(),
        },
      });
    });
  }

  /**
   * Reject a pending withdrawal.
   * Unfreezes funds: decrements pending_balance, increments available_balance.
   */
  async rejectWithdrawal(
    withdrawalId: string,
    adminId: string,
    reason: string,
  ): Promise<Withdrawal> {
    const withdrawal = await this.withdrawalRepo.findByIdOrThrow(withdrawalId);
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BusinessException(
        'WITHDRAWAL_ALREADY_PROCESSED',
        'This withdrawal has already been processed.',
        409,
      );
    }

    const wallet = await this.walletRepo.findByUserAndCurrency(
      withdrawal.userId,
      withdrawal.currency,
    );

    return await this.prisma.$transaction(async (tx) => {
      // Unfreeze: return funds from pending to available
      if (wallet) {
        const amount = withdrawal.amount.toNumber();
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            pendingBalance: wallet.pendingBalance.toNumber() - amount,
            availableBalance: wallet.availableBalance.toNumber() + amount,
          },
        });
      }

      return await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.REJECTED,
          approvedBy: adminId,
          rejectedAt: new Date(),
          notes: withdrawal.notes
            ? `${withdrawal.notes}; rejected: ${reason}`
            : `Rejected: ${reason}`,
        },
      });
    });
  }

  // ─── Queries ───────────────────────────────────────────────────

  async getWithdrawal(withdrawalId: string): Promise<Withdrawal> {
    return await this.withdrawalRepo.findByIdOrThrow(withdrawalId);
  }

  async getWithdrawals(filters: WithdrawalFiltersDto) {
    const {
      page = 1,
      pageSize = 20,
      userId,
      status,
    } = filters;

    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.withdrawalRepo.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.withdrawalRepo.count({ where }),
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

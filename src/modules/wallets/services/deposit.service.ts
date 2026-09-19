import { Injectable } from '@nestjs/common';
import { Prisma, DepositStatus, WalletTransactionReferenceType } from '@prisma/client';
import { BusinessException, notFound } from '../../../common/exceptions/business.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import { WalletRepository, DepositRepository } from '../repositories/wallet.repositories';
import type { CreateDepositDto, DepositFiltersDto } from '../dto/wallet.dto';
import type { Deposit } from '@prisma/client';

@Injectable()
export class DepositService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly depositRepo: DepositRepository,
    private readonly walletRepo: WalletRepository,
  ) {}

  // ─── Create ────────────────────────────────────────────────────

  /**
   * Submit a new deposit request.
   *
   * NOTE: No payment provider has been integrated yet.
   * Once a provider (e.g. Stripe, Coinbase Commerce) is wired in,
   * this method should create a payment intent / charge and only
   * persist the deposit on successful confirmation from the provider.
   */
  async createDeposit(_userId: string, _dto: CreateDepositDto): Promise<Deposit> {
    throw new BusinessException(
      'PAYMENT_PROVIDER_UNAVAILABLE',
      'Failed to complete payment, try again later.',
      503,
    );
  }

  // ─── Approve / Reject ──────────────────────────────────────────

  /**
   * Approve a pending deposit.
   * Atomically: updates deposit status → credits wallet → creates immutable ledger entry.
   */
  async approveDeposit(depositId: string, adminId: string): Promise<Deposit> {
    const deposit = await this.depositRepo.findByIdOrThrow(depositId);
    if (deposit.status !== DepositStatus.PENDING) {
      throw new BusinessException(
        'DEPOSIT_ALREADY_PROCESSED',
        'This deposit has already been processed.',
        409,
      );
    }

    const wallet = await this.walletRepo.findByUserAndCurrency(
      deposit.userId,
      deposit.currency,
    );
    if (!wallet) throw notFound('Wallet');

    // All-or-nothing: deposit status update + wallet credit + ledger entry
    return await this.prisma.$transaction(async (tx) => {
      // Re-read wallet inside transaction for atomic correctness
      const freshWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      if (!freshWallet) throw notFound('Wallet', wallet.id);

      const balanceBefore = freshWallet.availableBalance.toNumber();
      const pendingBefore = freshWallet.pendingBalance.toNumber();
      const amount = deposit.amount.toNumber();
      const balanceAfter = balanceBefore + amount;
      const pendingAfter = pendingBefore - amount;

      // Update wallet: credit available, decrement pending
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { availableBalance: balanceAfter, pendingBalance: pendingAfter },
      });

      // Create immutable ledger entry
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount: deposit.amount,
          balanceBefore,
          balanceAfter,
          referenceType: WalletTransactionReferenceType.DEPOSIT,
          referenceId: depositId,
          description: 'Deposit approved',
        },
      });

      // Update deposit status
      return await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: DepositStatus.APPROVED,
          approvedBy: adminId,
          approvedAt: new Date(),
        },
      });
    });
  }

  /**
   * Reject a pending deposit.
   * Decrements wallet pending_balance and updates deposit status.
   * No available balance change — funds were never credited.
   */
  async rejectDeposit(
    depositId: string,
    adminId: string,
    reason: string,
  ): Promise<Deposit> {
    const deposit = await this.depositRepo.findByIdOrThrow(depositId);
    if (deposit.status !== DepositStatus.PENDING) {
      throw new BusinessException(
        'DEPOSIT_ALREADY_PROCESSED',
        'This deposit has already been processed.',
        409,
      );
    }

    const wallet = await this.walletRepo.findByUserAndCurrency(
      deposit.userId,
      deposit.currency,
    );

    return await this.prisma.$transaction(async (tx) => {
      // Decrement pending_balance — funds were never received
      if (wallet) {
        const pendingAfter = wallet.pendingBalance.toNumber() - deposit.amount.toNumber();
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { pendingBalance: Math.max(0, pendingAfter) },
        });
      }

      return await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: DepositStatus.REJECTED,
          approvedBy: adminId,
          rejectedAt: new Date(),
          notes: deposit.notes
            ? `${deposit.notes}; rejected: ${reason}`
            : `Rejected: ${reason}`,
        },
      });
    });
  }

  // ─── Queries ───────────────────────────────────────────────────

  async getDeposit(depositId: string): Promise<Deposit> {
    return await this.depositRepo.findByIdOrThrow(depositId);
  }

  async getDeposits(filters: DepositFiltersDto) {
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
      this.depositRepo.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.depositRepo.count({ where }),
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

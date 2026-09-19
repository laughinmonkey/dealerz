import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Currency, WalletTransactionType, WalletTransactionReferenceType } from '@prisma/client';
import type { Wallet, WalletTransaction, Deposit, Withdrawal } from '@prisma/client';

@Injectable()
export class WalletRepository extends BaseRepository {
  constructor(prisma: PrismaService) { super(prisma); }

  async findByUserAndCurrency(userId: string, currency: Currency): Promise<Wallet | null> {
    return await this.prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency } },
    });
  }

  async findByUser(userId: string): Promise<Wallet[]> {
    return await this.prisma.wallet.findMany({ where: { userId } });
  }

  async findById(id: string): Promise<Wallet | null> {
    return await this.prisma.wallet.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<Wallet> {
    const wallet = await this.findById(id);
    if (!wallet) throw new Error(`Wallet with id ${id} not found`);
    return wallet;
  }

  async create(data: Prisma.WalletUncheckedCreateInput): Promise<Wallet> {
    return await this.prisma.wallet.create({ data });
  }

  async updateBalance(
    id: string,
    availableBalance: number,
    pendingBalance?: number,
  ): Promise<Wallet> {
    return await this.prisma.wallet.update({
      where: { id },
      data: { availableBalance, ...(pendingBalance !== undefined && { pendingBalance }) },
    });
  }

  async createWalletsForUser(userId: string): Promise<void> {
    for (const currency of [Currency.USD, Currency.EUR, Currency.BTC]) {
      await this.prisma.wallet.upsert({
        where: { userId_currency: { userId, currency } },
        create: { userId, currency, availableBalance: 0, pendingBalance: 0 },
        update: {},
      });
    }
  }

  async findAll(options: {
    where?: Prisma.WalletWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.WalletOrderByWithRelationInput;
  }): Promise<Wallet[]> {
    return await this.prisma.wallet.findMany(options);
  }

  async count(options: { where?: Prisma.WalletWhereInput }): Promise<number> {
    return await this.prisma.wallet.count(options);
  }

  async findByIdWithTx(
    tx: any,
    id: string,
  ): Promise<Wallet | null> {
    return await tx.wallet.findUnique({ where: { id } });
  }

  async updateBalanceWithTx(
    tx: any,
    id: string,
    availableBalance: number,
    pendingBalance?: number,
  ): Promise<Wallet> {
    const data: any = { availableBalance };
    if (pendingBalance !== undefined) data.pendingBalance = pendingBalance;
    return await tx.wallet.update({ where: { id }, data });
  }
}

@Injectable()
export class WalletTransactionRepository extends BaseRepository {
  constructor(prisma: PrismaService) { super(prisma); }

  async create(data: {
    walletId: string;
    type: WalletTransactionType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    referenceType: WalletTransactionReferenceType;
    referenceId?: string;
    description?: string;
  }): Promise<WalletTransaction> {
    return await this.prisma.walletTransaction.create({ data });
  }

  async findByWallet(walletId: string, options: { skip?: number; take?: number }): Promise<WalletTransaction[]> {
    return await this.prisma.walletTransaction.findMany({
      where: { walletId },
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(options: { where?: Prisma.WalletTransactionWhereInput }): Promise<number> {
    return await this.prisma.walletTransaction.count(options);
  }
}

@Injectable()
export class DepositRepository extends BaseRepository {
  constructor(prisma: PrismaService) { super(prisma); }

  async findById(id: string): Promise<Deposit | null> {
    return await this.prisma.deposit.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<Deposit> {
    const deposit = await this.findById(id);
    if (!deposit) throw new Error(`Deposit with id ${id} not found`);
    return deposit;
  }

  async create(data: Prisma.DepositUncheckedCreateInput): Promise<Deposit> {
    return await this.prisma.deposit.create({ data });
  }

  async update(id: string, data: Prisma.DepositUncheckedUpdateInput): Promise<Deposit> {
    return await this.prisma.deposit.update({ where: { id }, data });
  }

  async findMany(options: {
    where?: Prisma.DepositWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.DepositOrderByWithRelationInput;
  }): Promise<Deposit[]> {
    return await this.prisma.deposit.findMany(options);
  }

  async count(options: { where?: Prisma.DepositWhereInput }): Promise<number> {
    return await this.prisma.deposit.count(options);
  }
}

@Injectable()
export class WithdrawalRepository extends BaseRepository {
  constructor(prisma: PrismaService) { super(prisma); }

  async findById(id: string): Promise<Withdrawal | null> {
    return await this.prisma.withdrawal.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<Withdrawal> {
    const withdrawal = await this.findById(id);
    if (!withdrawal) throw new Error(`Withdrawal with id ${id} not found`);
    return withdrawal;
  }

  async create(data: Prisma.WithdrawalUncheckedCreateInput): Promise<Withdrawal> {
    return await this.prisma.withdrawal.create({ data });
  }

  async update(id: string, data: Prisma.WithdrawalUncheckedUpdateInput): Promise<Withdrawal> {
    return await this.prisma.withdrawal.update({ where: { id }, data });
  }

  async findMany(options: {
    where?: Prisma.WithdrawalWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.WithdrawalOrderByWithRelationInput;
  }): Promise<Withdrawal[]> {
    return await this.prisma.withdrawal.findMany(options);
  }

  async count(options: { where?: Prisma.WithdrawalWhereInput }): Promise<number> {
    return await this.prisma.withdrawal.count(options);
  }
}

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { MarketplaceTransaction } from '@prisma/client';

@Injectable()
export class MarketplaceTransactionRepository extends BaseRepository {
  constructor(prisma: PrismaService) { super(prisma); }

  async findById(id: string): Promise<MarketplaceTransaction | null> {
    return await this.prisma.marketplaceTransaction.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<MarketplaceTransaction> {
    const tx = await this.findById(id);
    if (!tx) throw new Error(`Transaction with id ${id} not found`);
    return tx;
  }

  async findWithRelations(id: string) {
    return await this.prisma.marketplaceTransaction.findUnique({
      where: { id },
      include: {
        listing: { select: { id: true, title: true, saleType: true, listingStatus: true, currency: true } },
        asset: { select: { id: true, title: true, ownerType: true, ownerId: true } },
        buyer: { select: { id: true, username: true } },
      },
    });
  }

  async create(data: Prisma.MarketplaceTransactionUncheckedCreateInput): Promise<MarketplaceTransaction> {
    return await this.prisma.marketplaceTransaction.create({ data });
  }

  async update(id: string, data: Prisma.MarketplaceTransactionUncheckedUpdateInput): Promise<MarketplaceTransaction> {
    return await this.prisma.marketplaceTransaction.update({ where: { id }, data });
  }

  async findMany(options: {
    where?: Prisma.MarketplaceTransactionWhereInput;
    include?: Prisma.MarketplaceTransactionInclude;
    skip?: number;
    take?: number;
    orderBy?: Prisma.MarketplaceTransactionOrderByWithRelationInput;
  }): Promise<MarketplaceTransaction[]> {
    return await this.prisma.marketplaceTransaction.findMany(options);
  }

  async count(options: { where?: Prisma.MarketplaceTransactionWhereInput }): Promise<number> {
    return await this.prisma.marketplaceTransaction.count(options);
  }

  /**
   * Check if a listing already has a successful (non-cancelled, non-failed) transaction.
   */
  async findSuccessfulByListing(listingId: string): Promise<MarketplaceTransaction | null> {
    return await this.prisma.marketplaceTransaction.findFirst({
      where: {
        listingId,
        status: { notIn: ['CANCELLED', 'FAILED'] },
      },
    });
  }

  /**
   * Create a transaction record within an existing DB transaction (tx client).
   */
  async createWithTx(
    tx: any,
    data: {
      listingId: string;
      assetId: string;
      buyerId: string;
      sellerType: string;
      sellerId: string | null;
      transactionSource: string;
      status: string;
      currency: string;
      agreedPrice: number;
      createdBy: string;
    },
  ): Promise<MarketplaceTransaction> {
    return await tx.marketplaceTransaction.create({ data });
  }
}

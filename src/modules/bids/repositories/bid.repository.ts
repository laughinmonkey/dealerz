import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { Bid } from '@prisma/client';

@Injectable()
export class BidRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<Bid | null> {
    return await this.prisma.bid.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<Bid> {
    const bid = await this.findById(id);
    if (!bid) throw new Error(`Bid with id ${id} not found`);
    return bid;
  }

  async findByIdWithRelations(id: string) {
    return await this.prisma.bid.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            listingStatus: true,
            saleType: true,
            currentBid: true,
            startingBid: true,
            currency: true,
            expiresAt: true,
          },
        },
        bidder: {
          select: { id: true, username: true, email: true },
        },
      },
    });
  }

  async create(data: Prisma.BidUncheckedCreateInput): Promise<Bid> {
    return await this.prisma.bid.create({ data });
  }

  async findByListing(
    listingId: string,
    options: { skip?: number; take?: number },
  ) {
    return await this.prisma.bid.findMany({
      where: { listingId },
      include: {
        bidder: { select: { id: true, username: true } },
      },
      orderBy: { amount: 'desc' },
      skip: options.skip,
      take: options.take,
    });
  }

  async count(options: { where?: Prisma.BidWhereInput }): Promise<number> {
    return await this.prisma.bid.count(options);
  }

  async findRecent(limit: number) {
    return await this.prisma.bid.findMany({
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            saleType: true,
            currency: true,
            currentBid: true,
          },
        },
        bidder: { select: { id: true, username: true } },
      },
      orderBy: { placedAt: 'desc' },
      take: limit,
    });
  }

  async findHighest(listingId: string): Promise<Bid | null> {
    return await this.prisma.bid.findFirst({
      where: { listingId },
      orderBy: { amount: 'desc' },
      include: {
        bidder: { select: { id: true, username: true } },
      },
    });
  }

  async findByUser(
    userId: string,
    options: { skip?: number; take?: number },
  ) {
    return await this.prisma.bid.findMany({
      where: { bidderId: userId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            listingStatus: true,
            saleType: true,
            currentBid: true,
            currency: true,
            expiresAt: true,
          },
        },
      },
      orderBy: { placedAt: 'desc' },
      skip: options.skip,
      take: options.take,
    });
  }

  /**
   * Admin: list all bids with filters and pagination.
   */
  async listAll(options: {
    where?: Prisma.BidWhereInput;
    skip?: number;
    take?: number;
  }) {
    return await this.prisma.bid.findMany({
      where: options.where,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            listingStatus: true,
            saleType: true,
            currentBid: true,
            currency: true,
          },
        },
        bidder: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { placedAt: 'desc' },
      skip: options.skip,
      take: options.take,
    });
  }

  async remove(id: string): Promise<Bid> {
    return await this.prisma.bid.delete({ where: { id } });
  }

  async markWinning(id: string): Promise<Bid> {
    return await this.prisma.bid.update({
      where: { id },
      data: { isWinning: true },
    });
  }
}

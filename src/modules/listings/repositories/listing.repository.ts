import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, ListingStatus, SaleType } from '@prisma/client';
import type { Listing } from '@prisma/client';

@Injectable()
export class ListingRepository extends BaseRepository {
  constructor(prisma: PrismaService) { super(prisma); }

  async findById(id: string): Promise<Listing | null> {
    return await this.prisma.listing.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<Listing> {
    const listing = await this.findById(id);
    if (!listing) throw new Error(`Listing with id ${id} not found`);
    return listing;
  }

  async findWithRelations(id: string) {
    return await this.prisma.listing.findUnique({
      where: { id },
      include: {
        asset: { include: { game: true, assetType: true, images: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }] } } },
        bids: { orderBy: { amount: 'desc' }, take: 10 },
        seller: { select: { id: true, username: true, createdAt: true } },
      },
    });
  }

  async incrementViews(id: string): Promise<void> {
    await this.prisma.listing.update({ where: { id }, data: { views: { increment: 1 } } });
  }

  async findMany(options: {
    where?: Prisma.ListingWhereInput;
    include?: Prisma.ListingInclude;
    skip?: number;
    take?: number;
    orderBy?: Prisma.ListingOrderByWithRelationInput;
  }): Promise<Listing[]> {
    return await this.prisma.listing.findMany(options);
  }

  async count(options: { where?: Prisma.ListingWhereInput }): Promise<number> {
    return await this.prisma.listing.count(options);
  }

  async create(data: Prisma.ListingUncheckedCreateInput): Promise<Listing> {
    return await this.prisma.listing.create({ data });
  }

  async update(id: string, data: Prisma.ListingUncheckedUpdateInput): Promise<Listing> {
    return await this.prisma.listing.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Listing> {
    return await this.prisma.listing.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findActiveByAsset(assetId: string): Promise<Listing | null> {
    return await this.prisma.listing.findFirst({
      where: {
        assetId,
        listingStatus: { in: [ListingStatus.ACTIVE, ListingStatus.DRAFT, ListingStatus.PAUSED, ListingStatus.RESERVED] },
        deletedAt: null,
      },
    });
  }
}

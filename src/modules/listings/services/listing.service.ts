import { Injectable, HttpStatus } from '@nestjs/common';
import {
  Prisma,
  ListingStatus,
  SaleType,
  SellerType,
  AssetStatus,
  Currency,
  TransactionStatus,
  TransactionSource,
} from '@prisma/client';
import {
  BusinessErrors,
  BusinessException,
  notFound,
} from '../../../common/exceptions/business.exception';
import { ListingRepository } from '../repositories/listing.repository';
import { AssetService } from '../../assets/services/asset.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateListingDto,
  UpdateListingDto,
  ListingFilters,
} from '../dto/listing.dto';

@Injectable()
export class ListingService {
  constructor(
    private readonly listingRepo: ListingRepository,
    private readonly assetService: AssetService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a listing. Users create listings for their own assets.
   * Admins may override sellerType/sellerId to create listings on behalf
   * of any user or for platform inventory.
   */
  async createListing(userId: string, dto: CreateListingDto, isAdmin = false) {
    // Validate asset exists and is approved
    const asset = await this.assetService.getAsset(dto.assetId);
    if (asset.status !== AssetStatus.APPROVED) {
      throw BusinessErrors.ASSET_NOT_APPROVED();
    }

    // Listings must have at least one image so buyers see a preview
    if (!asset.images || asset.images.length === 0) {
      throw new BusinessException(
        'ASSET_IMAGE_REQUIRED',
        'Assets must have at least one image before they can be listed.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Determine seller identity
    let sellerType: SellerType;
    let sellerId: string | null;

    if (isAdmin && dto.sellerType) {
      // Admin override: create listing on behalf of specified seller
      sellerType = dto.sellerType;
      sellerId =
        dto.sellerType === SellerType.USER ? (dto.sellerId ?? null) : null;

      if (dto.sellerType === SellerType.USER && !dto.sellerId) {
        throw new BusinessException(
          'VALIDATION',
          'sellerId is required when sellerType is USER.',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      // Standard flow: seller = asset owner
      if (asset.ownerType === 'USER' && asset.ownerId !== userId) {
        throw BusinessErrors.NOT_ASSET_OWNER();
      }
      sellerType =
        asset.ownerType === 'PLATFORM' ? SellerType.PLATFORM : SellerType.USER;
      sellerId = asset.ownerType === 'USER' ? asset.ownerId! : null;
    }

    // Validate no other active listing
    const existing = await this.listingRepo.findActiveByAsset(dto.assetId);
    if (existing) throw BusinessErrors.ASSET_ALREADY_LISTED();

    // Validate price fields based on sale type
    this.validatePriceFields(dto);

    // Validate date window
    this.validateDateWindow(dto.startsAt, dto.expiresAt);

    const listing = await this.listingRepo.create({
      assetId: dto.assetId,
      sellerType,
      sellerId,
      saleType: dto.saleType,
      listingStatus: isAdmin ? ListingStatus.ACTIVE : ListingStatus.DRAFT,
      title: dto.title ?? null,
      description: dto.description ?? null,
      askingPrice: dto.askingPrice ?? null,
      startingBid: dto.startingBid ?? null,
      reservePrice: dto.reservePrice ?? null,
      currency: dto.currency ?? Currency.USD,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      publishedAt: isAdmin ? new Date() : null,
      createdBy: userId,
    } as Prisma.ListingUncheckedCreateInput);

    return await this.listingRepo.findWithRelations(listing.id);
  }

  async getListing(listingId: string, incrementView = false) {
    const listing = await this.listingRepo.findWithRelations(listingId);
    if (!listing || listing.deletedAt) throw notFound('Listing', listingId);

    if (incrementView) {
      await this.listingRepo.incrementViews(listingId);
      listing.views = (listing.views ?? 0) + 1;
    }

    return listing;
  }

  async updateListing(listingId: string, dto: UpdateListingDto) {
    await this.listingRepo.findByIdOrThrow(listingId);
    const data: Prisma.ListingUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.askingPrice !== undefined) data.askingPrice = dto.askingPrice;
    if (dto.startingBid !== undefined) data.startingBid = dto.startingBid;
    if (dto.reservePrice !== undefined) data.reservePrice = dto.reservePrice;
    if (dto.startsAt) data.startsAt = new Date(dto.startsAt);
    if (dto.expiresAt) data.expiresAt = new Date(dto.expiresAt);

    await this.listingRepo.update(listingId, data);
    return await this.listingRepo.findWithRelations(listingId);
  }

  async searchListings(
    filters: ListingFilters & {
      page?: number;
      pageSize?: number;
      sort?: string;
      search?: string;
    },
    includeAllStatuses = false,
  ) {
    const { page = 1, pageSize = 20, sort, search, ...rest } = filters;
    const where: Prisma.ListingWhereInput = {
      deletedAt: null,
    };

    // Public views default to ACTIVE only. Admin views can opt into all
    // statuses, or pass an explicit status filter.
    if (rest.status) {
      where.listingStatus = rest.status;
    } else if (!includeAllStatuses) {
      where.listingStatus = ListingStatus.ACTIVE;
    }

    if (rest.saleType) where.saleType = rest.saleType;
    if (rest.sellerType) where.sellerType = rest.sellerType as SellerType;
    if (rest.currency) where.currency = rest.currency;
    if (rest.gameId) where.asset = { gameId: rest.gameId };
    if (rest.assetTypeId)
      where.asset = {
        ...((where.asset as object) || {}),
        assetTypeId: rest.assetTypeId,
      };
    if (rest.minPrice !== undefined || rest.maxPrice !== undefined) {
      where.askingPrice = {};
      if (rest.minPrice !== undefined) where.askingPrice.gte = rest.minPrice;
      if (rest.maxPrice !== undefined) where.askingPrice.lte = rest.maxPrice;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Sort mapping
    let orderBy: Prisma.ListingOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    else if (sort === 'price_asc') orderBy = { askingPrice: 'asc' };
    else if (sort === 'price_desc') orderBy = { askingPrice: 'desc' };
    else if (sort === 'ending_soon') orderBy = { expiresAt: 'asc' };
    else if (sort === 'popular') orderBy = { views: 'desc' };

    const [listings, total] = await Promise.all([
      this.listingRepo.findMany({
        where,
        include: {
          asset: {
            include: {
              game: true,
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
          seller: { select: { id: true, username: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      this.listingRepo.count({ where }),
    ]);

    return {
      data: listings,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ─── Public Market Data ───────────────────────────────────────

  /**
   * Deterministic, simulated price history for a listing.
   *
   * Uses a seed derived from the listing ID plus the current day so the
   * generated series is stable within a day but changes over time,
   * producing a consistent simulated trend without persisting data.
   */
  async getPriceHistory(listingId: string) {
    const listing = await this.getListing(listingId);
    const basePrice = Number(
      listing.askingPrice ?? listing.currentBid ?? listing.startingBid ?? 0,
    );
    if (basePrice <= 0) return [];

    const dayBucket = new Date().toISOString().slice(0, 10);
    const seed = this.seedFromString(`${listingId}:${dayBucket}`);
    const rng = this.mulberry32(seed);

    const points: { date: string; price: number; volume: number }[] = [];
    let price = basePrice;
    const now = Date.now();

    for (let i = 90; i >= 0; i--) {
      const change = (rng() - 0.48) * 0.06;
      price = Math.min(Math.max(price * (1 + change), basePrice * 0.7), basePrice * 1.4);
      points.push({
        date: new Date(now - i * 86_400_000).toISOString().split('T')[0],
        price: Math.round(price * 100) / 100,
        volume: Math.floor(rng() * 50) + 5,
      });
    }

    return points;
  }

  /**
   * Real completed sales for a listing's asset, newest first.
   */
  async getSalesHistory(listingId: string) {
    const listing = await this.getListing(listingId);

    const transactions = await this.prisma.marketplaceTransaction.findMany({
      where: {
        assetId: listing.assetId,
        status: TransactionStatus.COMPLETED,
      },
      include: {
        buyer: { select: { id: true, username: true } },
        listing: { select: { id: true, title: true, saleType: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    return transactions.map((tx) => ({
      id: tx.id,
      price: Number(tx.agreedPrice),
      buyer: tx.buyer?.username ?? 'User',
      seller: listing.seller?.username ?? 'Platform',
      type: tx.transactionSource === TransactionSource.AUCTION ? 'Auction' : 'Fixed Price',
      date: tx.completedAt ?? tx.createdAt,
      status: tx.status,
    }));
  }

  /**
   * Aggregated public seller stats for a listing's seller.
   */
  async getSellerStats(listingId: string) {
    const listing = await this.getListing(listingId);
    const sellerId = listing.sellerType === SellerType.USER ? listing.sellerId : null;

    const where: Prisma.MarketplaceTransactionWhereInput = sellerId
      ? { sellerId }
      : { sellerType: SellerType.PLATFORM };

    const [completed, cancelled, failed, disputed, totalListings] = await Promise.all([
      this.prisma.marketplaceTransaction.count({ where: { ...where, status: TransactionStatus.COMPLETED } }),
      this.prisma.marketplaceTransaction.count({ where: { ...where, status: TransactionStatus.CANCELLED } }),
      this.prisma.marketplaceTransaction.count({ where: { ...where, status: TransactionStatus.FAILED } }),
      this.prisma.marketplaceTransaction.count({ where: { ...where, status: TransactionStatus.DISPUTED } }),
      this.prisma.listing.count({
        where: sellerId ? { sellerId, deletedAt: null } : { sellerType: SellerType.PLATFORM, deletedAt: null },
      }),
    ]);

    const closedTotal = completed + cancelled + failed + disputed;

    return {
      totalSales: completed,
      totalListings,
      successRate: closedTotal > 0 ? Math.round((completed / closedTotal) * 100) : 100,
      memberSince: listing.seller?.createdAt ?? listing.createdAt,
    };
  }

  // ─── Lifecycle ─────────────────────────────────────────────────

  /**
   * Publish a DRAFT listing, making it ACTIVE.
   * Used when a listing is first saved as draft then published later.
   */
  async publishListing(listingId: string) {
    const listing = await this.listingRepo.findByIdOrThrow(listingId);
    if (listing.listingStatus !== ListingStatus.DRAFT) {
      throw new BusinessException(
        'INVALID_TRANSITION',
        'Only draft listings can be published.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return await this.listingRepo.update(listingId, {
      listingStatus: ListingStatus.ACTIVE,
      publishedAt: new Date(),
    });
  }

  /**
   * Pause an ACTIVE listing. Paused listings are hidden from public search.
   */
  async pauseListing(listingId: string) {
    const listing = await this.listingRepo.findByIdOrThrow(listingId);
    if (listing.listingStatus !== ListingStatus.ACTIVE) {
      throw new BusinessException(
        'INVALID_TRANSITION',
        'Only active listings can be paused.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return await this.listingRepo.update(listingId, {
      listingStatus: ListingStatus.PAUSED,
    });
  }

  /**
   * Resume a PAUSED listing back to ACTIVE.
   */
  async resumeListing(listingId: string) {
    const listing = await this.listingRepo.findByIdOrThrow(listingId);
    if (listing.listingStatus !== ListingStatus.PAUSED) {
      throw new BusinessException(
        'INVALID_TRANSITION',
        'Only paused listings can be resumed.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return await this.listingRepo.update(listingId, {
      listingStatus: ListingStatus.ACTIVE,
    });
  }

  /**
   * Cancel a listing. Prevents further transactions.
   * Cannot cancel listings that are already in a terminal state.
   */
  async cancelListing(listingId: string) {
    const listing = await this.listingRepo.findByIdOrThrow(listingId);
    const terminalStatuses: ListingStatus[] = [
      ListingStatus.COMPLETED,
      ListingStatus.CANCELLED,
      ListingStatus.EXPIRED,
    ];
    if (terminalStatuses.includes(listing.listingStatus as ListingStatus)) {
      throw new BusinessException(
        'INVALID_TRANSITION',
        'Cannot cancel a completed, expired, or already cancelled listing.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return await this.listingRepo.update(listingId, {
      listingStatus: ListingStatus.CANCELLED,
      cancelledAt: new Date(),
    });
  }

  /**
   * Complete a listing after a successful sale.
   * Called by the Marketplace Transactions module.
   */
  async completeListing(listingId: string) {
    return await this.listingRepo.update(listingId, {
      listingStatus: ListingStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  /**
   * Reject a DRAFT listing — moves to CANCELLED.
   * Used by admins to decline listings that don't meet requirements.
   */
  async rejectListing(listingId: string): Promise<any> {
    const listing = await this.listingRepo.findByIdOrThrow(listingId);
    if (listing.listingStatus !== ListingStatus.DRAFT) {
      throw new BusinessException(
        'INVALID_TRANSITION',
        'Only draft listings can be rejected.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return await this.listingRepo.update(listingId, {
      listingStatus: ListingStatus.CANCELLED,
      cancelledAt: new Date(),
    });
  }

  /**
   * Expire a listing that has passed its expiresAt timestamp.
   * Can be called manually by admins or via scheduled job.
   */
  async expireListing(listingId: string) {
    const listing = await this.listingRepo.findByIdOrThrow(listingId);
    const terminalStatuses: ListingStatus[] = [
      ListingStatus.COMPLETED,
      ListingStatus.CANCELLED,
      ListingStatus.EXPIRED,
    ];
    if (terminalStatuses.includes(listing.listingStatus as ListingStatus)) {
      throw new BusinessException(
        'INVALID_TRANSITION',
        'Cannot expire a listing that is already in a terminal state.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return await this.listingRepo.update(listingId, {
      listingStatus: ListingStatus.EXPIRED,
    });
  }

  /**
   * Reserve a listing when a purchase process begins.
   * Prevents concurrent purchases. Called by Marketplace Transactions.
   */
  async reserveListing(listingId: string) {
    const listing = await this.listingRepo.findByIdOrThrow(listingId);
    if (listing.listingStatus !== ListingStatus.ACTIVE) {
      throw new BusinessException(
        'INVALID_TRANSITION',
        'Only active listings can be reserved.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return await this.listingRepo.update(listingId, {
      listingStatus: ListingStatus.RESERVED,
    });
  }

  /**
   * Update current bid on auction listings. Called by the Bidding module.
   */
  async setCurrentBid(
    listingId: string,
    amount: number,
    winningBidId?: string,
  ) {
    return await this.listingRepo.update(listingId, {
      currentBid: amount,
      ...(winningBidId && { winningBidId }),
    } as Prisma.ListingUncheckedUpdateInput);
  }

  /**
   * Soft-delete a listing. Only for admin use.
   */
  async deleteListing(listingId: string): Promise<any> {
    await this.listingRepo.findByIdOrThrow(listingId);
    return await this.listingRepo.softDelete(listingId);
  }

  async validateListingEligibility(
    assetId: string,
  ): Promise<{ eligible: boolean; reason?: string }> {
    let asset;
    try {
      asset = await this.assetService.getAsset(assetId);
    } catch {
      return { eligible: false, reason: 'Asset not found.' };
    }
    if (asset.status !== AssetStatus.APPROVED)
      return { eligible: false, reason: 'Asset not approved.' };

    const existing = await this.listingRepo.findActiveByAsset(assetId);
    if (existing)
      return {
        eligible: false,
        reason: 'Asset already has an active listing.',
      };

    return { eligible: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // Deterministic RNG Helpers
  // ═══════════════════════════════════════════════════════════════

  private seedFromString(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Validation Helpers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validate price fields based on sale type.
   */
  private validatePriceFields(dto: CreateListingDto): void {
    if (dto.saleType === SaleType.FIXED_PRICE && !dto.askingPrice) {
      throw new BusinessException(
        'VALIDATION',
        'Fixed price listings require an asking price.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (dto.saleType === SaleType.AUCTION && !dto.startingBid) {
      throw new BusinessException(
        'VALIDATION',
        'Auction listings require a starting bid.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  /**
   * Validate that expiresAt is after startsAt when both are provided.
   */
  private validateDateWindow(startsAt?: string, expiresAt?: string): void {
    if (startsAt && expiresAt) {
      const start = new Date(startsAt);
      const end = new Date(expiresAt);
      if (end <= start) {
        throw new BusinessException(
          'VALIDATION',
          'expiresAt must be after startsAt.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }
  }
}

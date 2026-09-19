import { Injectable } from '@nestjs/common';
import { Prisma, ListingStatus, SaleType, OnboardingStage } from '@prisma/client';
import {
  BusinessErrors,
  BusinessException,
  notFound,
} from '../../../common/exceptions/business.exception';
import { BidRepository } from '../repositories/bid.repository';
import { ListingService } from '../../listings/services/listing.service';
import { IdentityService } from '../../identity/services/identity.service';
import { WalletService } from '../../wallets/services/wallet.service';
import type { BidValidation, BidFilters } from '../dto/bid.dto';

@Injectable()
export class BidService {
  constructor(
    private readonly bidRepo: BidRepository,
    private readonly listingService: ListingService,
    private readonly identityService: IdentityService,
    private readonly walletService: WalletService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // Public Operations
  // ═══════════════════════════════════════════════════════════════

  /**
   * Place a bid on an auction listing. Runs full validation before
   * persisting the bid.
   */
  async placeBid(
    listingId: string,
    bidderId: string,
    amount: number,
  ) {
    // 0. KYC check — user must be KYC approved before bidding
    const bidder = await this.identityService.getUserById(bidderId);
    const kycApproved = bidder.onboardingStage === OnboardingStage.KYC_APPROVED
      || bidder.onboardingStage === OnboardingStage.TRADING_ENABLED;
    if (!kycApproved) {
      throw new BusinessException(
        'KYC_REQUIRED',
        'You must complete KYC verification before placing bids.',
        403,
      );
    }

    // 1. Run all validation rules
    const validation = await this.validateBid(listingId, bidderId, amount);
    if (!validation.valid) {
      throw new BusinessException(
        validation.errors[0].code,
        validation.errors[0].message,
        422,
      );
    }

    // 2. Create the bid
    const bid = await this.bidRepo.create({
      listingId,
      bidderId,
      amount,
      createdBy: bidderId,
    });

    // 3. Update the listing's current bid
    await this.listingService.setCurrentBid(listingId, amount);

    return bid;
  }

  /**
   * Run all bid validation rules and return a structured result.
   * Does NOT throw — returns { valid, errors } so callers can
   * inspect every violation at once.
   */
  async validateBid(
    listingId: string,
    bidderId: string,
    amount: number,
  ): Promise<BidValidation> {
    const errors: BidValidation['errors'] = [];

    // Rule 1 — Listing exists
    const listing = await this.listingService.getListing(listingId).catch(() => null);
    if (!listing) {
      errors.push({ code: 'LISTING_NOT_FOUND', message: 'Listing not found.' });
      return { valid: false, errors };
    }

    // Rule 2 — Listing is ACTIVE
    if (listing.listingStatus !== ListingStatus.ACTIVE) {
      errors.push({ code: 'LISTING_NOT_ACTIVE', message: 'This listing is not currently active.' });
    }

    // Rule 3 — sale_type = AUCTION
    if (listing.saleType !== SaleType.AUCTION) {
      errors.push({ code: 'NOT_AUCTION', message: 'This listing does not accept bids.' });
    }

    // Rule 4 — Auction has started (starts_at <= now)
    if (listing.startsAt && new Date(listing.startsAt) > new Date()) {
      errors.push({
        code: 'AUCTION_NOT_STARTED',
        message: 'The auction has not started yet.',
      });
    }

    // Rule 5 — Auction has not ended (ends_at > now)
    if (listing.expiresAt && new Date(listing.expiresAt) <= new Date()) {
      errors.push({ code: 'AUCTION_ALREADY_ENDED', message: 'The auction has already ended.' });
    }

    // Rule 6 — Bidder is not the seller
    if (listing.sellerType === 'USER' && listing.sellerId === bidderId) {
      errors.push({
        code: 'CANNOT_BID_OWN_LISTING',
        message: 'You cannot bid on your own listing.',
      });
    }

    // Rule 7 — User has can_bid permission
    try {
      const user = await this.identityService.getUserById(bidderId);
      if (!user.permissions?.canBid) {
        errors.push({
          code: 'BIDDING_DISABLED',
          message: 'Your account does not have bidding enabled.',
        });
      }
    } catch {
      errors.push({ code: 'BIDDER_NOT_FOUND', message: 'Bidder account not found.' });
    }

    // Rule 8 — Bid amount > current bid (or starting_bid if no bids yet)
    const currentHighest = listing.currentBid
      ? Number(listing.currentBid)
      : listing.startingBid
        ? Number(listing.startingBid)
        : 0;

    if (amount <= currentHighest) {
      errors.push({
        code: 'BID_TOO_LOW',
        message: `Bid must exceed the current bid of ${currentHighest}.`,
      });
    }

    // Rule 9 — Reserve price check (non-blocking validation note)
    // Not enforced at bid time — only at auction completion

    // Rule 10 — Bidder must have sufficient balance in the listing currency
    try {
      const wallet = await this.walletService.getWallet(bidderId, listing.currency);
      if (Number(wallet.availableBalance) < amount) {
        errors.push({
          code: 'INSUFFICIENT_WALLET_BALANCE',
          message: `Insufficient ${listing.currency} balance to place this bid.`,
        });
      }
    } catch {
      errors.push({
        code: 'WALLET_NOT_FOUND',
        message: 'Bidder wallet not found for the listing currency.',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Return the most recent bids across the marketplace.
   */
  async getRecentBids(limit = 10) {
    return await this.bidRepo.findRecent(limit);
  }

  /**
   * Return the highest bid for a listing, or null if no bids placed.
   */
  async getHighestBid(listingId: string) {
    return await this.bidRepo.findHighest(listingId);
  }

  /**
   * Get paginated bids for a specific listing.
   */
  async getListingBids(
    listingId: string,
    page = 1,
    pageSize = 20,
  ) {
    const [bids, total] = await Promise.all([
      this.bidRepo.findByListing(listingId, {
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.bidRepo.count({ where: { listingId } }),
    ]);

    return {
      data: bids,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get paginated bids placed by a specific user.
   */
  async getMyBids(userId: string, page = 1, pageSize = 20) {
    const [bids, total] = await Promise.all([
      this.bidRepo.findByUser(userId, {
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.bidRepo.count({ where: { bidderId: userId } }),
    ]);

    return {
      data: bids,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Admin Operations
  // ═══════════════════════════════════════════════════════════════

  /**
   * Admin: place a bid on behalf of any user. Skips seller-ownership
   * and permission checks, but still validates auction rules.
   */
  async adminPlaceBid(
    listingId: string,
    bidderId: string,
    amount: number,
    adminId: string,
  ) {
    const listing = await this.listingService.getListing(listingId);

    if (listing.listingStatus !== ListingStatus.ACTIVE) {
      throw BusinessErrors.LISTING_NOT_ACTIVE();
    }
    if (listing.saleType !== SaleType.AUCTION) {
      throw new BusinessException(
        'NOT_AUCTION',
        'This listing does not accept bids.',
        422,
      );
    }
    if (listing.startsAt && new Date(listing.startsAt) > new Date()) {
      throw new BusinessException(
        'AUCTION_NOT_STARTED',
        'Auction has not started yet.',
        422,
      );
    }
    if (listing.expiresAt && new Date(listing.expiresAt) <= new Date()) {
      throw BusinessErrors.AUCTION_ALREADY_ENDED();
    }

    const currentHighest = listing.currentBid
      ? Number(listing.currentBid)
      : listing.startingBid
        ? Number(listing.startingBid)
        : 0;

    if (amount <= currentHighest) {
      throw BusinessErrors.BID_TOO_LOW(currentHighest);
    }

    const bid = await this.bidRepo.create({
      listingId,
      bidderId,
      amount,
      createdBy: adminId,
    });

    await this.listingService.setCurrentBid(listingId, amount);

    return bid;
  }

  /**
   * Admin: remove an invalid bid.
   */
  async removeBid(bidId: string, _adminId: string) {
    return await this.bidRepo.remove(bidId);
  }

  /**
   * Mark a bid as the winning bid for its auction.
   */
  async markWinningBid(bidId: string) {
    return await this.bidRepo.markWinning(bidId);
  }

  /**
   * Admin: list all bids with filters and pagination.
   */
  async getAllBids(
    filters: BidFilters & { page?: number; pageSize?: number },
  ) {
    const { page = 1, pageSize = 20, ...rest } = filters;

    const where: Prisma.BidWhereInput = {};

    if (rest.listingId) where.listingId = rest.listingId;
    if (rest.bidderId) where.bidderId = rest.bidderId;
    if (rest.isWinning !== undefined) where.isWinning = rest.isWinning;
    if (rest.minAmount !== undefined || rest.maxAmount !== undefined) {
      where.amount = {};
      if (rest.minAmount !== undefined) where.amount.gte = rest.minAmount;
      if (rest.maxAmount !== undefined) where.amount.lte = rest.maxAmount;
    }
    if (rest.search) {
      where.bidder = {
        username: { contains: rest.search, mode: 'insensitive' },
      };
    }

    const [bids, total] = await Promise.all([
      this.bidRepo.listAll({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.bidRepo.count({ where }),
    ]);

    return {
      data: bids,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Admin: get a single bid with full relations.
   */
  async getBidById(bidId: string) {
    const bid = await this.bidRepo.findByIdWithRelations(bidId);
    if (!bid) throw notFound('Bid', bidId);
    return bid;
  }

  // ═══════════════════════════════════════════════════════════════
  // Auction Lifecycle
  // ═══════════════════════════════════════════════════════════════

  /**
   * Select the winning bid for an auction.
   * Validates: listing is ACTIVE AUCTION, highest bid exists,
   * reserve price is met (if applicable).
   */
  async selectWinner(listingId: string) {
    const listing = await this.listingService.getListing(listingId);

    if (listing.listingStatus !== ListingStatus.ACTIVE) {
      throw BusinessErrors.LISTING_NOT_ACTIVE();
    }
    if (listing.saleType !== SaleType.AUCTION) {
      throw new BusinessException(
        'NOT_AUCTION',
        'Only auction listings can have a winner selected.',
        422,
      );
    }

    const highestBid = await this.bidRepo.findHighest(listingId);
    if (!highestBid) {
      throw new BusinessException(
        'NO_BIDS',
        'No bids were placed on this auction.',
        422,
      );
    }

    // Check reserve price
    if (
      listing.reservePrice &&
      Number(highestBid.amount) < Number(listing.reservePrice)
    ) {
      throw new BusinessException(
        'RESERVE_NOT_MET',
        `Highest bid (${highestBid.amount}) does not meet reserve price (${listing.reservePrice}).`,
        422,
      );
    }

    // Mark winning bid and set on listing
    await this.bidRepo.markWinning(highestBid.id);
    await this.listingService.setCurrentBid(
      listingId,
      Number(highestBid.amount),
      highestBid.id,
    );

    return highestBid;
  }

  /**
   * Complete an auction:
   * 1. Select the winning bid
   * 2. Reserve the listing
   * 3. Return the winning bid for downstream transaction creation
   *
   * The caller (controller / Marketplace Transaction module) is
   * responsible for creating the marketplace transaction and
   * completing the purchase flow.
   */
  async completeAuction(listingId: string) {
    // Select winner (throws if no valid bids)
    const winningBid = await this.selectWinner(listingId);

    // Reserve the listing to prevent further bids
    await this.listingService.reserveListing(listingId);

    return winningBid;
  }
}

import { Injectable } from '@nestjs/common';
import { TransactionStatus, TransactionSource, SellerType, ListingStatus, SaleType, WalletTransactionReferenceType, OnboardingStage, AssetStatus } from '@prisma/client';
import { BusinessErrors, BusinessException, notFound } from '../../../common/exceptions/business.exception';
import { MarketplaceTransactionRepository } from '../repositories/marketplace-transaction.repository';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { ListingService } from '../../listings/services/listing.service';
import { AssetService } from '../../assets/services/asset.service';
import { WalletService } from '../../wallets/services/wallet.service';
import { BidService } from '../../bids/services/bid.service';
import { IdentityService } from '../../identity/services/identity.service';

@Injectable()
export class MarketplaceTransactionService {
  constructor(
    private readonly txRepo: MarketplaceTransactionRepository,
    private readonly listingService: ListingService,
    private readonly assetService: AssetService,
    private readonly walletService: WalletService,
    private readonly bidService: BidService,
    private readonly identityService: IdentityService,
  ) {}

  // ─── Fixed Price Purchase ──────────────────────────────────────

  async purchaseListing(listingId: string, buyerId: string) {
    // KYC check — user must be KYC approved before purchasing
    const buyer = await this.identityService.getUserById(buyerId);
    const kycApproved = buyer.onboardingStage === OnboardingStage.KYC_APPROVED
      || buyer.onboardingStage === OnboardingStage.TRADING_ENABLED;
    if (!kycApproved) {
      throw new BusinessException(
        'KYC_REQUIRED',
        'You must complete KYC verification before making purchases.',
        403,
      );
    }

    // Permission check — user must have can_buy enabled
    if (!buyer.permissions?.canBuy) {
      throw new BusinessException(
        'PURCHASE_DISABLED',
        'Your account does not have purchasing enabled.',
        403,
      );
    }

    return await this.txRepo.transaction(async (tx) => {
      const listing = await tx.listing.findUnique({ where: { id: listingId } });
      if (!listing) throw notFound('Listing', listingId);

      if (listing.saleType !== SaleType.FIXED_PRICE) {
        throw new BusinessException(
          'NOT_FIXED_PRICE',
          'This listing is not a fixed-price listing.',
          422,
        );
      }

      if (listing.listingStatus !== ListingStatus.ACTIVE) {
        throw BusinessErrors.LISTING_NOT_ACTIVE();
      }

      // Self-purchase check — sellers cannot buy their own listings
      if (listing.sellerType === SellerType.USER && listing.sellerId === buyerId) {
        throw new BusinessException(
          'CANNOT_PURCHASE_OWN_LISTING',
          'You cannot purchase your own listing.',
          422,
        );
      }

      // Prevent double purchase of the same listing
      const existingTx = await tx.marketplaceTransaction.findFirst({
        where: {
          listingId,
          status: { notIn: [TransactionStatus.CANCELLED, TransactionStatus.FAILED] },
        },
      });
      if (existingTx) throw BusinessErrors.LISTING_ALREADY_SOLD();

      const price = Number(listing.askingPrice ?? 0);
      if (!price || price <= 0) {
        throw new BusinessException(
          'INVALID_PRICE',
          'This listing does not have a valid asking price.',
          422,
        );
      }

      // Buyer must have sufficient balance in the listing currency
      const buyerWallet = await tx.wallet.findFirst({
        where: { userId: buyerId, currency: listing.currency },
      });
      if (!buyerWallet) {
        throw BusinessErrors.INSUFFICIENT_WALLET_BALANCE(listing.currency);
      }

      const buyerBalance = Number(buyerWallet.availableBalance);
      if (buyerBalance < price) {
        throw BusinessErrors.INSUFFICIENT_WALLET_BALANCE(listing.currency);
      }

      const created = await tx.marketplaceTransaction.create({
        data: {
          listingId,
          assetId: listing.assetId,
          buyerId,
          sellerType: listing.sellerType,
          sellerId: listing.sellerId,
          transactionSource: TransactionSource.FIXED_PRICE,
          status: TransactionStatus.COMPLETED,
          currency: listing.currency,
          agreedPrice: price,
          createdBy: buyerId,
          paymentConfirmedAt: new Date(),
          assetTransferredAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Debit buyer wallet
      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: { availableBalance: buyerBalance - price },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: buyerWallet.id,
          type: 'PURCHASE',
          amount: price,
          balanceBefore: buyerBalance,
          balanceAfter: buyerBalance - price,
          referenceType: 'MARKETPLACE_TRANSACTION',
          referenceId: created.id,
          description: `Purchase of listing ${listingId}`,
        },
      });

      // Credit seller wallet (user-owned listings only)
      if (listing.sellerType === SellerType.USER && listing.sellerId) {
        const sellerWallet = await tx.wallet.findFirst({
          where: { userId: listing.sellerId, currency: listing.currency },
        });
        if (sellerWallet) {
          const sellerBalance = Number(sellerWallet.availableBalance);
          await tx.wallet.update({
            where: { id: sellerWallet.id },
            data: { availableBalance: sellerBalance + price },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: sellerWallet.id,
              type: 'SALE',
              amount: price,
              balanceBefore: sellerBalance,
              balanceAfter: sellerBalance + price,
              referenceType: 'MARKETPLACE_TRANSACTION',
              referenceId: created.id,
              description: `Sale of listing ${listingId}`,
            },
          });
        }
      }

      // Transfer asset ownership to the buyer, record the purchase price,
      // and mark it as owned/available
      await tx.asset.update({
        where: { id: listing.assetId },
        data: { ownerType: 'USER', ownerId: buyerId, status: AssetStatus.AVAILABLE, purchasePrice: price },
      });

      // Complete the listing
      await tx.listing.update({
        where: { id: listingId },
        data: { listingStatus: ListingStatus.COMPLETED, completedAt: new Date() },
      });

      return created;
    }).then((created) => this.txRepo.findWithRelations(created.id));
  }

  // ─── Auction Purchase ──────────────────────────────────────────

  /**
   * Settle an ended auction:
   * 1. Select the winning bid (validates auction state and reserve price).
   * 2. Reserve the listing.
   * 3. Create a payment-pending marketplace transaction for the winner.
   */
  async completeAuction(listingId: string) {
    const winningBid = await this.bidService.completeAuction(listingId);
    const listing = await this.listingService.getListing(listingId);

    const transaction = await this.txRepo.create({
      listingId,
      assetId: listing.assetId,
      buyerId: winningBid.bidderId,
      sellerType: listing.sellerType,
      sellerId: listing.sellerId,
      transactionSource: TransactionSource.AUCTION,
      status: TransactionStatus.PAYMENT_PENDING,
      currency: listing.currency,
      agreedPrice: Number(winningBid.amount),
      createdBy: winningBid.bidderId,
    });

    return await this.txRepo.findWithRelations(transaction.id);
  }

  /**
   * Admin creates a marketplace transaction record directly.
   * Used to manually register a transaction outside the normal
   * buy/auction flows (e.g. off-platform sales or corrections).
   */
  async createTransaction(dto: CreateTransactionDto, createdBy?: string) {
    await this.listingService.getListing(dto.listingId);
    await this.assetService.getAsset(dto.assetId);
    await this.identityService.getUserById(dto.buyerId);

    const transaction = await this.txRepo.create({
      listingId: dto.listingId,
      assetId: dto.assetId,
      buyerId: dto.buyerId,
      sellerType: dto.sellerType,
      sellerId: dto.sellerId ?? null,
      transactionSource: dto.transactionSource,
      status: TransactionStatus.PENDING,
      currency: dto.currency,
      agreedPrice: dto.agreedPrice,
      createdBy: createdBy ?? dto.buyerId,
    });

    return await this.txRepo.findWithRelations(transaction.id);
  }

  // ─── Lifecycle ─────────────────────────────────────────────────

  async confirmPayment(transactionId: string, adminId?: string) {
    const tx = await this.txRepo.findByIdOrThrow(transactionId);
    if (tx.status !== TransactionStatus.PENDING && tx.status !== TransactionStatus.PAYMENT_PENDING) {
      throw new BusinessException('INVALID_TRANSITION', 'Cannot confirm payment in current state.', 422);
    }

    return await this.txRepo.update(transactionId, {
      status: TransactionStatus.PAYMENT_CONFIRMED,
      paymentConfirmedAt: new Date(),
      updatedBy: adminId ?? tx.createdBy,
    } as any);
  }

  async transferAsset(transactionId: string) {
    return await this.txRepo.transaction(async (tx) => {
      const txn = await tx.marketplaceTransaction.findUnique({ where: { id: transactionId } });
      if (!txn || txn.status !== TransactionStatus.PAYMENT_CONFIRMED) {
        throw new BusinessException('INVALID_TRANSITION', 'Payment must be confirmed first.', 422);
      }

      // Transfer asset ownership
      const newOwnerType = txn.sellerType === SellerType.PLATFORM ? 'USER' as const : 'USER' as const;
      await tx.asset.update({
        where: { id: txn.assetId },
        data: { ownerType: newOwnerType, ownerId: txn.buyerId },
      });

      return await tx.marketplaceTransaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.TRANSFERRING_ASSET,
          assetTransferredAt: new Date(),
        },
      });
    });
  }

  async completeTransaction(transactionId: string) {
    return await this.txRepo.transaction(async (tx) => {
      const txn = await tx.marketplaceTransaction.findUnique({ where: { id: transactionId } });
      if (!txn || txn.status !== TransactionStatus.TRANSFERRING_ASSET) {
        throw new BusinessException('INVALID_TRANSITION', 'Asset must be transferred before completing.', 422);
      }

      // Get wallets for settlement
      const buyerWallets = await tx.wallet.findMany({ where: { userId: txn.buyerId } });
      const buyerWallet = buyerWallets.find((w: any) => w.currency === txn.currency);

      // Debit buyer
      if (buyerWallet) {
        const buyerBalance = Number(buyerWallet.availableBalance);
        const agreedPrice = Number(txn.agreedPrice);
        if (buyerBalance < agreedPrice) {
          throw BusinessErrors.INSUFFICIENT_WALLET_BALANCE(txn.currency);
        }
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { availableBalance: buyerBalance - agreedPrice },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: buyerWallet.id,
            type: 'PURCHASE',
            amount: agreedPrice,
            balanceBefore: buyerBalance,
            balanceAfter: buyerBalance - agreedPrice,
            referenceType: 'MARKETPLACE_TRANSACTION',
            referenceId: transactionId,
            description: `Purchase of listing ${txn.listingId}`,
          },
        });
      }

      // Credit seller
      if (txn.sellerType === 'USER' && txn.sellerId) {
        const sellerWallets = await tx.wallet.findMany({ where: { userId: txn.sellerId } });
        const sellerWallet = sellerWallets.find((w: any) => w.currency === txn.currency);
        if (sellerWallet) {
          const sellerBalance = Number(sellerWallet.availableBalance);
          const amount = Number(txn.agreedPrice);
          await tx.wallet.update({
            where: { id: sellerWallet.id },
            data: { availableBalance: sellerBalance + amount },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: sellerWallet.id,
              type: 'SALE',
              amount,
              balanceBefore: sellerBalance,
              balanceAfter: sellerBalance + amount,
              referenceType: 'MARKETPLACE_TRANSACTION',
              referenceId: transactionId,
              description: `Sale of listing ${txn.listingId}`,
            },
          });
        }
      }

      // Complete transaction and listing
      await tx.listing.update({
        where: { id: txn.listingId },
        data: { listingStatus: ListingStatus.COMPLETED, completedAt: new Date() },
      });

      return await tx.marketplaceTransaction.update({
        where: { id: transactionId },
        data: { status: TransactionStatus.COMPLETED, completedAt: new Date() },
      });
    });
  }

  async cancelTransaction(transactionId: string, reason?: string) {
    const tx = await this.txRepo.findByIdOrThrow(transactionId);
    const cancellable: TransactionStatus[] = [TransactionStatus.PENDING, TransactionStatus.PAYMENT_PENDING];
    if (!cancellable.includes(tx.status)) {
      throw new BusinessException('INVALID_TRANSITION', 'Transaction cannot be cancelled in its current state.', 422);
    }

    await this.listingService.cancelListing(tx.listingId);

    return await this.txRepo.update(transactionId, {
      status: TransactionStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: reason ?? null,
    } as any);
  }

  async markFailed(transactionId: string, reason: string) {
    const tx = await this.txRepo.findByIdOrThrow(transactionId);
    if (tx.status === TransactionStatus.COMPLETED) {
      throw new BusinessException('INVALID_TRANSITION', 'Cannot mark a completed transaction as failed.', 422);
    }

    return await this.txRepo.update(transactionId, {
      status: TransactionStatus.FAILED,
      cancellationReason: reason,
    } as any);
  }

  async openDispute(transactionId: string, reason: string) {
    const tx = await this.txRepo.findByIdOrThrow(transactionId);
    if (tx.status !== TransactionStatus.COMPLETED && tx.status !== TransactionStatus.PAYMENT_CONFIRMED) {
      throw new BusinessException('INVALID_TRANSITION', 'Disputes can only be opened on completed or payment-confirmed transactions.', 422);
    }

    return await this.txRepo.update(transactionId, {
      status: TransactionStatus.DISPUTED,
      cancellationReason: reason,
    } as any);
  }

  // ─── Queries ───────────────────────────────────────────────────

  async getTransaction(transactionId: string) {
    const tx = await this.txRepo.findWithRelations(transactionId);
    if (!tx) throw notFound('Transaction', transactionId);
    return tx;
  }

  async getTransactions(filters: {
    buyerId?: string;
    sellerId?: string;
    status?: TransactionStatus;
    page?: number;
    pageSize?: number;
  }) {
    const { page = 1, pageSize = 20, ...rest } = filters;
    const where: any = {};
    if (rest.buyerId) where.buyerId = rest.buyerId;
    if (rest.sellerId) where.sellerId = rest.sellerId;
    if (rest.status) where.status = rest.status;

    const [data, total] = await Promise.all([
      this.txRepo.findMany({
        where,
        include: {
          listing: { select: { id: true, title: true, saleType: true } },
          asset: { select: { id: true, title: true } },
          buyer: { select: { id: true, username: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' } as any,
      }),
      this.txRepo.count({ where }),
    ]);

    return {
      data,
      meta: { page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize) },
    };
  }
}

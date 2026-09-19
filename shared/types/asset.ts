// Asset, Listing, and Bid types — Assets Marketplace
import {
  OwnerType,
  AssetStatus,
  ListingStatus,
  SaleType,
  SellerType,
  AttributeType,
  Currency,
} from './enums';

// ─── Asset ───────────────────────────────────────────────────────

export interface Asset {
  id: string;
  ownerType: OwnerType;
  ownerId: string | null;
  gameId: string;
  assetTypeId: string;
  title: string;
  description: string | null;
  status: AssetStatus;
  visibility: string;
  verificationStatus: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationNotes: string | null;
  estimatedValue: number | null;
  createdAt: string;
  updatedAt: string;
  game?: Game;
  assetType?: AssetType;
  attributes?: AssetAttribute[];
  images?: AssetImage[];
}

export interface AssetAttribute {
  id: string;
  assetId: string;
  name: string;
  value: string;
  type: AttributeType;
  isSensitive: boolean;
  isPublic: boolean;
  displayOrder: number;
}

export interface AssetImage {
  id: string;
  assetId: string;
  imageUrl: string;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

// ─── Catalog ─────────────────────────────────────────────────────

export interface Game {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  developer: string | null;
  publisher: string | null;
  website: string | null;
  logoFileId: string | null;
  bannerFileId: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  category?: Category;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconFileId: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface AssetType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

// ─── Listing ─────────────────────────────────────────────────────

export interface Listing {
  id: string;
  assetId: string;
  sellerType: SellerType;
  sellerId: string | null;
  saleType: SaleType;
  listingStatus: ListingStatus;
  title: string | null;
  description: string | null;
  askingPrice: number | null;
  reservePrice: number | null;
  startingBid: number | null;
  currentBid: number | null;
  winningBidId: string | null;
  currency: Currency;
  views: number;
  watchers: number;
  startsAt: string | null;
  expiresAt: string | null;
  publishedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  asset?: Asset;
  bids?: Bid[];
  seller?: { id: string; username: string };
}

export interface Bid {
  id: string;
  listingId: string;
  bidderId: string;
  amount: number;
  isWinning: boolean;
  placedAt: string;
  bidder?: { id: string; username: string };
}

// ─── DTOs ────────────────────────────────────────────────────────

export interface CreateAssetDto {
  gameId: string;
  assetTypeId: string;
  title: string;
  description?: string;
  estimatedValue?: number;
  attributes?: CreateAttributeDto[];
}

export interface CreateAttributeDto {
  name: string;
  value: string;
  type?: AttributeType;
  isSensitive?: boolean;
  isPublic?: boolean;
  displayOrder?: number;
}

export interface CreateImageDto {
  imageUrl: string;
  altText?: string;
  isPrimary?: boolean;
}

export interface CreateListingDto {
  assetId: string;
  saleType: SaleType;
  title?: string;
  description?: string;
  currency?: Currency;
  // Fixed Price
  askingPrice?: number;
  // Auction
  startingBid?: number;
  reservePrice?: number;
  startsAt?: string;
  expiresAt?: string;
}

export interface UpdateListingDto {
  title?: string;
  description?: string;
  askingPrice?: number;
  startingBid?: number;
  reservePrice?: number;
  startsAt?: string;
  expiresAt?: string;
}

// ─── Market Data ──────────────────────────────────────────────────

export interface MarketDepth {
  buys: { price: number; count: number }[];
  sells: { price: number; count: number }[];
}

export interface PricePoint {
  date: string;
  price: number;
  volume?: number;
}

export interface TradingStats {
  volume24h: number;
  highestSale: number;
  lowestSale: number;
  averagePrice: number;
  activeListings: number;
  completedSales: number;
}

export interface ListingFilters extends Record<string, unknown> {
  status?: ListingStatus;
  saleType?: SaleType;
  sellerType?: SellerType;
  gameId?: string;
  assetTypeId?: string;
  currency?: Currency;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular' | 'ending_soon';
  search?: string;
}

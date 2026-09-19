import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsIn,
  IsDateString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaleType, Currency, ListingStatus, SellerType } from '@prisma/client';

export class CreateListingDto {
  @ApiProperty({ description: 'Asset to list for sale' })
  @IsUUID()
  assetId: string;

  @ApiProperty({ enum: SaleType, description: 'FIXED_PRICE or AUCTION' })
  @IsIn(['FIXED_PRICE', 'AUCTION'])
  saleType: SaleType;

  @ApiPropertyOptional({ description: 'Optional custom listing title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Optional custom listing description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: Currency, default: 'USD' })
  @IsOptional()
  @IsIn(['USD', 'EUR', 'BTC'])
  currency?: Currency;

  // Fixed Price
  @ApiPropertyOptional({
    description:
      'Price for FIXED_PRICE listings (required if saleType=FIXED_PRICE)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  askingPrice?: number;

  // Auction
  @ApiPropertyOptional({
    description:
      'Opening bid for AUCTION listings (required if saleType=AUCTION)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  startingBid?: number;

  @ApiPropertyOptional({
    description: 'Minimum sale price for auction (optional)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reservePrice?: number;

  @ApiPropertyOptional({
    description: 'When the listing becomes visible (optional)',
  })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({
    description:
      'When the listing closes automatically (optional, must be after startsAt)',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  // Admin-only: create listing on behalf of another seller
  @ApiPropertyOptional({
    enum: SellerType,
    description: '[ADMIN] Override seller type',
  })
  @IsOptional()
  @IsIn(['USER', 'PLATFORM'])
  sellerType?: SellerType;

  @ApiPropertyOptional({
    description:
      '[ADMIN] Override seller user ID (required when sellerType=USER)',
  })
  @IsOptional()
  @IsUUID()
  @ValidateIf((o) => o.sellerType === 'USER')
  sellerId?: string;
}

export class UpdateListingDto {
  @ApiPropertyOptional({ description: 'Custom listing title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Custom listing description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Updated fixed price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  askingPrice?: number;

  @ApiPropertyOptional({ description: 'Updated starting bid' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  startingBid?: number;

  @ApiPropertyOptional({ description: 'Updated reserve price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reservePrice?: number;

  @ApiPropertyOptional({ description: 'Updated start time' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({
    description: 'Updated expiry time (must be after startsAt)',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ListingFilters {
  @ApiPropertyOptional({
    enum: ListingStatus,
    description: 'Filter by listing status',
  })
  @IsOptional()
  @IsIn(Object.values(ListingStatus))
  status?: ListingStatus;

  @ApiPropertyOptional({
    enum: ['FIXED_PRICE', 'AUCTION'],
    description: 'Filter by sale type',
  })
  @IsOptional()
  @IsIn(['FIXED_PRICE', 'AUCTION'])
  saleType?: SaleType;

  @ApiPropertyOptional({
    enum: ['USER', 'PLATFORM'],
    description: 'Filter by seller type',
  })
  @IsOptional()
  @IsIn(['USER', 'PLATFORM'])
  sellerType?: string;

  @ApiPropertyOptional({ description: 'Filter by game' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  gameId?: string;

  @ApiPropertyOptional({ description: 'Filter by asset type' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  assetTypeId?: string;

  @ApiPropertyOptional({
    enum: ['USD', 'EUR', 'BTC'],
    description: 'Filter by currency',
  })
  @IsOptional()
  @IsIn(['USD', 'EUR', 'BTC'])
  currency?: Currency;

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Full-text search in title and description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: [
      'newest',
      'oldest',
      'price_asc',
      'price_desc',
      'popular',
      'ending_soon',
    ],
  })
  @IsOptional()
  @IsIn([
    'newest',
    'oldest',
    'price_asc',
    'price_desc',
    'popular',
    'ending_soon',
  ])
  sort?: string;
}

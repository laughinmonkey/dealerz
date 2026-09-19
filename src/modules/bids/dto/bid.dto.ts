import { IsNumber, IsOptional, IsUUID, IsBoolean, IsString, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for placing a bid as an authenticated user.
 * Only amount is required — listing and user come from route/context.
 */
export class PlaceBidDto {
  @ApiProperty({ description: 'Bid amount', example: 50.0 })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

/**
 * DTO for admin placing a bid on behalf of another user.
 */
export class AdminPlaceBidDto extends PlaceBidDto {
  @ApiProperty({ description: 'User ID to place bid on behalf of' })
  @IsUUID()
  bidderId: string;
}

/**
 * Result of bid validation — used by validateBid().
 */
export interface BidValidation {
  valid: boolean;
  errors: BidValidationError[];
}

export interface BidValidationError {
  code: string;
  message: string;
}

/**
 * Filter parameters for querying bids.
 */
export class BidFilters {
  @ApiPropertyOptional({ description: 'Filter by listing' })
  @IsOptional()
  @IsUUID()
  listingId?: string;

  @ApiPropertyOptional({ description: 'Filter by bidder' })
  @IsOptional()
  @IsUUID()
  bidderId?: string;

  @ApiPropertyOptional({ description: 'Only winning bids' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isWinning?: boolean;

  @ApiPropertyOptional({ description: 'Minimum bid amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum bid amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Search by bidder username' })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * Combined pagination + filter DTO for admin list endpoint.
 */
export class AdminBidQueryDto extends BidFilters {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 20;
}

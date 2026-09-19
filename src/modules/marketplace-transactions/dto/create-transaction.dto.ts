import {
  IsOptional,
  IsUUID,
  IsIn,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus, TransactionSource, SellerType, Currency } from '@prisma/client';

// ─── Create Transaction (Admin) ──────────────────────────────────

export class CreateTransactionDto {
  @ApiProperty({ description: 'Listing UUID' })
  @IsUUID()
  listingId: string;

  @ApiProperty({ description: 'Asset UUID' })
  @IsUUID()
  assetId: string;

  @ApiProperty({ description: 'Buyer UUID' })
  @IsUUID()
  buyerId: string;

  @ApiProperty({ enum: SellerType })
  @IsEnum(SellerType)
  sellerType: SellerType;

  @ApiPropertyOptional({ description: 'Seller UUID when sellerType is USER' })
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @ApiProperty({ enum: TransactionSource })
  @IsEnum(TransactionSource)
  transactionSource: TransactionSource;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({ description: 'Agreed transaction price' })
  @IsNumber()
  @Min(0.01)
  agreedPrice: number;
}

// ─── Update Transaction (Admin PATCH) ────────────────────────────

export class UpdateTransactionDto {
  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

// ─── Transaction Filters ─────────────────────────────────────────

export class TransactionFiltersDto {
  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ enum: TransactionSource })
  @IsOptional()
  @IsEnum(TransactionSource)
  transactionSource?: TransactionSource;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  buyerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  pageSize?: number = 20;
}

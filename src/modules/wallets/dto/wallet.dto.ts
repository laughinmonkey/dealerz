import {
  IsNumber,
  IsOptional,
  IsUUID,
  IsIn,
  Min,
  IsString,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  WalletTransactionType,
  WalletTransactionReferenceType,
  DepositStatus,
  WithdrawalStatus,
} from '@prisma/client';

// ─── Deposit DTOs ────────────────────────────────────────────────

export class CreateDepositDto {
  @ApiProperty({ enum: Currency })
  @IsIn(['USD', 'EUR', 'BTC'])
  currency: Currency;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DepositFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: DepositStatus })
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: DepositStatus;

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

// ─── Withdrawal DTOs ─────────────────────────────────────────────

export class CreateWithdrawalDto {
  @ApiProperty({ enum: Currency })
  @IsIn(['USD', 'EUR', 'BTC'])
  currency: Currency;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class WithdrawalFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: WithdrawalStatus })
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: WithdrawalStatus;

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

// ─── Wallet Filters DTO ─────────────────────────────────────────

export class WalletFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsIn(['USD', 'EUR', 'BTC'])
  currency?: Currency;

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

// ─── Wallet / Admin DTOs ─────────────────────────────────────────

export class BalanceAdjustDto {
  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsString()
  reason: string;
}

export class RejectDto {
  @ApiProperty()
  @IsString()
  reason: string;
}

// ─── Ledger DTOs ─────────────────────────────────────────────────

export class CreateLedgerEntryDto {
  @ApiProperty()
  @IsUUID()
  walletId: string;

  @ApiProperty({ enum: WalletTransactionType })
  @IsEnum(WalletTransactionType)
  type: WalletTransactionType;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsNumber()
  balanceBefore: number;

  @ApiProperty()
  @IsNumber()
  balanceAfter: number;

  @ApiProperty({ enum: WalletTransactionReferenceType })
  @IsEnum(WalletTransactionReferenceType)
  referenceType: WalletTransactionReferenceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class LedgerFiltersDto {
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

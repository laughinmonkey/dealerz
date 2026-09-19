import { IsString, IsInt, Min, Max, IsOptional, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutMethod } from '@prisma/client';

export class CreateCardDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MaxLength(255)
  cardHolderName: string;

  @ApiProperty({ example: '4111111111111111' })
  @IsString()
  @MaxLength(19)
  cardNumber: string;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth: number;

  @ApiProperty({ example: 2028 })
  @IsInt()
  @Min(2024)
  expiryYear: number;

  @ApiProperty({ example: '123' })
  @IsString()
  @MaxLength(4)
  cvv: string;

  @ApiPropertyOptional({ example: '4567', description: 'Card PIN for authorization' })
  @IsOptional()
  @IsString()
  @MaxLength(6)
  pin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  billingAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

export class UpdateCardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cardHolderName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(2024)
  expiryYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(6)
  pin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  billingAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

export class CreatePayoutAccountDto {
  @ApiProperty({ enum: PayoutMethod })
  @IsIn(['BANK', 'CRYPTO'])
  method: PayoutMethod;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MaxLength(255)
  accountHolderName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  iban?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  swiftCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  walletAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['USD', 'EUR', 'BTC'])
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

export class UpdatePayoutAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  accountHolderName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  iban?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  swiftCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  walletAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['USD', 'EUR', 'BTC'])
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

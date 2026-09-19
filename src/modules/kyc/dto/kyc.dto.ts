import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitKycDto {
  @ApiPropertyOptional({ description: 'Optional notes for KYC submission' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class RejectKycDto {
  @ApiProperty({ description: 'Reason for rejecting the KYC request' })
  @IsString()
  @MaxLength(2000)
  reason: string;
}

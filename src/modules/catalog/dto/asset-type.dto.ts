import {
  IsString,
  IsOptional,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Create ──────────────────────────────────────────────────────

export class CreateAssetTypeDto {
  @ApiProperty({ example: 'Game Account', description: 'Unique asset type name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'game-account', description: 'URL-friendly unique slug' })
  @IsString()
  @MaxLength(255)
  slug: string;

  @ApiPropertyOptional({ description: 'Asset type description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the asset type is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Update ──────────────────────────────────────────────────────

export class UpdateAssetTypeDto {
  @ApiPropertyOptional({ example: 'Game Account', description: 'Unique asset type name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'game-account', description: 'URL-friendly unique slug' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({ description: 'Asset type description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the asset type is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Filters ─────────────────────────────────────────────────────

export class AssetTypeFilterDto {
  @ApiPropertyOptional({ description: 'Search by asset type name' })
  @IsOptional()
  @IsString()
  search?: string;
}

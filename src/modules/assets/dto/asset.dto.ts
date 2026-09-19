import {
  IsString, IsOptional, IsNumber, IsBoolean, IsInt,
  MaxLength, IsIn, IsUUID, IsEnum, IsNotEmpty, Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OwnerType, AssetStatus, AttributeType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// Asset CRUD DTOs
// ═══════════════════════════════════════════════════════════════

export class CreateAssetDto {
  @ApiProperty({ description: 'UUID of the Game this asset belongs to' })
  @IsUUID()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({ description: 'UUID of the Asset Type' })
  @IsUUID()
  @IsNotEmpty()
  assetTypeId: string;

  @ApiProperty({ description: 'Asset title', maxLength: 255, example: 'Dragon Sword' })
  @IsString()
  @MaxLength(255)
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Asset description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Estimated monetary value', example: 49.99 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedValue?: number;
}

export class UpdateAssetDto {
  @ApiPropertyOptional({ description: 'Updated title', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Updated estimated value', nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedValue?: number | null;

  @ApiPropertyOptional({ description: 'Asset visibility', enum: ['PUBLIC', 'PRIVATE'] })
  @IsOptional()
  @IsIn(['PUBLIC', 'PRIVATE'])
  visibility?: string;
}

// ═══════════════════════════════════════════════════════════════
// Asset Admin DTOs
// ═══════════════════════════════════════════════════════════════

export class RejectAssetDto {
  @ApiProperty({
    description: 'Reason for rejecting the asset',
    example: 'Insufficient information about the digital product.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason: string;
}

export class ChangeOwnerDto {
  @ApiProperty({ description: 'New owner type', enum: OwnerType })
  @IsEnum(OwnerType)
  ownerType: OwnerType;

  @ApiPropertyOptional({
    description: 'New owner UUID (required when ownerType is USER, null when PLATFORM)',
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

export class AdminCreateAssetDto extends CreateAssetDto {
  @ApiProperty({ description: 'Owner type for admin-created assets', enum: OwnerType })
  @IsEnum(OwnerType)
  ownerType: OwnerType;

  @ApiPropertyOptional({
    description: 'Owner UUID (required when ownerType is USER)',
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

// ═══════════════════════════════════════════════════════════════
// Attribute DTOs
// ═══════════════════════════════════════════════════════════════

export class CreateAttributeDto {
  @ApiProperty({ description: 'Attribute name', example: 'Username', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Attribute value', example: 'player_one' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ description: 'Data type of the attribute', enum: AttributeType })
  @IsOptional()
  @IsEnum(AttributeType)
  type?: AttributeType;

  @ApiPropertyOptional({ description: 'Whether the value contains sensitive data', default: false })
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @ApiPropertyOptional({ description: 'Whether visible to the public', default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Display sort order', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpdateAttributeDto {
  @ApiPropertyOptional({ description: 'Updated attribute name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Updated attribute value' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ description: 'Updated data type', enum: AttributeType })
  @IsOptional()
  @IsEnum(AttributeType)
  type?: AttributeType;

  @ApiPropertyOptional({ description: 'Updated sensitive flag' })
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @ApiPropertyOptional({ description: 'Updated public visibility' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Updated sort order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

// ═══════════════════════════════════════════════════════════════
// Image DTOs
// ═══════════════════════════════════════════════════════════════

export class CreateImageDto {
  @ApiProperty({
    description: 'Image URL (either provide URL directly or use the upload endpoint)',
    example: 'https://cdn.example.com/asset.png',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsNotEmpty()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'Alt text for accessibility', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({ description: 'Set as primary image', default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateImageDto {
  @ApiPropertyOptional({ description: 'Updated image URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Updated alt text' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({ description: 'Set as primary image' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Updated sort order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

// ═══════════════════════════════════════════════════════════════
// Query / Filter DTOs
// ═══════════════════════════════════════════════════════════════

export class AssetFilters {
  @ApiPropertyOptional({ description: 'Filter by Game UUID' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  gameId?: string;

  @ApiPropertyOptional({ description: 'Filter by Asset Type UUID' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  assetTypeId?: string;

  @ApiPropertyOptional({ description: 'Filter by asset status', enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ description: 'Filter by owner type', enum: OwnerType })
  @IsOptional()
  @IsEnum(OwnerType)
  ownerType?: OwnerType;

  @ApiPropertyOptional({ description: 'Filter by owner UUID' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Full-text search on title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Only return public-visible assets (for public API)', default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  @IsBoolean()
  activeOnly?: boolean;
}

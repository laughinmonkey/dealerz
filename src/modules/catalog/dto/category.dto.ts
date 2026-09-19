import {
  IsString,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsInt,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Create ──────────────────────────────────────────────────────

export class CreateCategoryDto {
  @ApiProperty({ example: 'FPS', description: 'Unique category name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'fps', description: 'URL-friendly unique slug' })
  @IsString()
  @MaxLength(255)
  slug: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the category is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display sort order', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'File ID of the category icon image' })
  @IsOptional()
  @IsUUID()
  iconFileId?: string | null;
}

// ─── Update ──────────────────────────────────────────────────────

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'FPS', description: 'Unique category name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'fps', description: 'URL-friendly unique slug' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the category is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display sort order' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'File ID of the category icon image' })
  @IsOptional()
  @IsUUID()
  iconFileId?: string | null;
}

// ─── Filters ─────────────────────────────────────────────────────

export class CategoryFilterDto {
  @ApiPropertyOptional({ description: 'Search by category name' })
  @IsOptional()
  @IsString()
  search?: string;
}

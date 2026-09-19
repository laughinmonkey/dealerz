import {
  IsString,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsInt,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Create ──────────────────────────────────────────────────────

export class CreateGameDto {
  @ApiProperty({ example: 'Counter Strike 2', description: 'Unique game name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'counter-strike-2', description: 'URL-friendly unique slug' })
  @IsString()
  @MaxLength(255)
  slug: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001', description: 'Category UUID' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ description: 'Game description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Valve', description: 'Game developer' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  developer?: string;

  @ApiPropertyOptional({ example: 'Valve', description: 'Game publisher' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  publisher?: string;

  @ApiPropertyOptional({ example: 'https://counterstrike.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ description: 'Whether the game is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display sort order', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'File ID of the game logo' })
  @IsOptional()
  @IsUUID()
  logoFileId?: string | null;

  @ApiPropertyOptional({ description: 'File ID of the game banner / category image' })
  @IsOptional()
  @IsUUID()
  bannerFileId?: string | null;
}

// ─── Update ──────────────────────────────────────────────────────

export class UpdateGameDto {
  @ApiPropertyOptional({ example: 'Counter Strike 2', description: 'Unique game name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'counter-strike-2', description: 'URL-friendly unique slug' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({ description: 'Category UUID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Game description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Valve' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  developer?: string;

  @ApiPropertyOptional({ example: 'Valve' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  publisher?: string;

  @ApiPropertyOptional({ example: 'https://counterstrike.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ description: 'Whether the game is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display sort order' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'File ID of the game logo' })
  @IsOptional()
  @IsUUID()
  logoFileId?: string | null;

  @ApiPropertyOptional({ description: 'File ID of the game banner / category image' })
  @IsOptional()
  @IsUUID()
  bannerFileId?: string | null;
}

// ─── Filters ─────────────────────────────────────────────────────

export class GameFilterDto {
  @ApiPropertyOptional({ description: 'Search by game name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category UUID' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  categoryId?: string;
}

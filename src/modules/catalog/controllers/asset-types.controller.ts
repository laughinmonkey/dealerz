import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogService } from '../services/catalog.service';
import { Public, Roles } from '../../../common/decorators/auth.decorator';
import { CreateAssetTypeDto, UpdateAssetTypeDto, AssetTypeFilterDto } from '../dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

// ─── Public Controller ───────────────────────────────────────────

@ApiTags('Catalog — Asset Types')
@Controller('asset-types')
export class PublicAssetTypeController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active asset types (public)' })
  async listAssetTypes(
    @Query() pagination: PaginationDto,
    @Query() filters: AssetTypeFilterDto,
  ) {
    return this.catalogService.getAssetTypes({
      ...pagination,
      search: filters.search,
      activeOnly: true,
    });
  }

  @Public()
  @Get(':assetTypeId')
  @ApiOperation({ summary: 'Get an asset type by ID (public, active only)' })
  async getAssetType(@Param('assetTypeId') assetTypeId: string) {
    return this.catalogService.getAssetType(assetTypeId, true);
  }
}

// ─── Admin Controller ────────────────────────────────────────────

@ApiTags('Admin — Asset Types')
@Controller('admin/asset-types')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminAssetTypeController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List all asset types (admin)' })
  async listAllAssetTypes(
    @Query() pagination: PaginationDto,
    @Query() filters: AssetTypeFilterDto,
  ) {
    return this.catalogService.getAssetTypes({
      ...pagination,
      search: filters.search,
    });
  }

  @Get(':assetTypeId')
  @ApiOperation({ summary: 'Get an asset type by ID (admin)' })
  async getAssetType(@Param('assetTypeId') assetTypeId: string) {
    return this.catalogService.getAssetType(assetTypeId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new asset type' })
  async createAssetType(@Body() dto: CreateAssetTypeDto) {
    return this.catalogService.createAssetType(dto);
  }

  @Patch(':assetTypeId')
  @ApiOperation({ summary: 'Update an asset type' })
  async updateAssetType(
    @Param('assetTypeId') assetTypeId: string,
    @Body() dto: UpdateAssetTypeDto,
  ) {
    return this.catalogService.updateAssetType(assetTypeId, dto);
  }

  @Delete(':assetTypeId')
  @ApiOperation({ summary: 'Soft-delete an asset type' })
  async deleteAssetType(@Param('assetTypeId') assetTypeId: string) {
    return this.catalogService.deleteAssetType(assetTypeId);
  }
}

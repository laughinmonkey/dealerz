import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Req, UseInterceptors,
  UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery,
} from '@nestjs/swagger';
import { Roles, Public } from '../../../common/decorators/auth.decorator';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { AssetService } from '../services/asset.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  CreateAssetDto, UpdateAssetDto,
  CreateAttributeDto, UpdateAttributeDto,
  CreateImageDto, UpdateImageDto,
  AssetFilters, RejectAssetDto, ChangeOwnerDto,
  AdminCreateAssetDto,
} from '../dto/asset.dto';

// ═══════════════════════════════════════════════════════════════
// Public & Authenticated Asset Controller
// ═══════════════════════════════════════════════════════════════

@ApiTags('Assets')
@Controller('assets')
@ApiBearerAuth()
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  // ─── Asset CRUD ──────────────────────────────────────────────

  @Get()
  @Public()
  @ApiOperation({ summary: 'List publicly available assets' })
  @ApiQuery({ name: 'gameId', required: false, description: 'Filter by Game UUID' })
  @ApiQuery({ name: 'assetTypeId', required: false, description: 'Filter by Asset Type UUID' })
  @ApiQuery({ name: 'status', required: false, enum: ['APPROVED', 'AVAILABLE', 'LISTED', 'CREATED', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'ARCHIVED'], description: 'Filter by asset status' })
  @ApiQuery({ name: 'ownerType', required: false, enum: ['PLATFORM', 'USER'], description: 'Filter by owner type' })
  @ApiQuery({ name: 'search', required: false, description: 'Full-text search on asset title' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Items per page (default 20, max 100)' })
  async list(
    @Query() pagination: PaginationDto,
    @Query() filters: AssetFilters,
  ) {
    return this.assetService.getAssets({
      ...pagination,
      ...filters,
      activeOnly: filters.activeOnly ?? true,
    });
  }

  @Get('my')
  @ApiOperation({ summary: 'List assets owned by the current user' })
  async listMy(
    @Req() req: AuthenticatedRequest,
    @Query() pagination: PaginationDto,
    @Query() filters: AssetFilters,
  ) {
    return this.assetService.getMyAssets(req.user.sub, {
      ...pagination,
      ...filters,
    });
  }

  @Get(':assetId')
  @Public()
  @ApiOperation({ summary: 'Get asset detail by ID' })
  async get(@Param('assetId') assetId: string) {
    return this.assetService.getAsset(assetId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user-owned asset' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetService.createAsset(req.user.sub, dto);
  }

  @Patch(':assetId')
  @ApiOperation({ summary: 'Update asset metadata' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetService.updateAsset(assetId, req.user.sub, dto);
  }

  @Delete(':assetId')
  @ApiOperation({ summary: 'Soft-delete an asset' })
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
  ) {
    return this.assetService.deleteAsset(assetId, req.user.sub);
  }

  @Post(':assetId/submit')
  @ApiOperation({ summary: 'Submit a created asset for review' })
  async submit(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
  ) {
    return this.assetService.submitAsset(assetId, req.user.sub);
  }

  // ─── Attributes ──────────────────────────────────────────────

  @Get(':assetId/attributes')
  @Public()
  @ApiOperation({ summary: 'List public attributes for an asset (sensitive values masked)' })
  async getAttributes(@Param('assetId') assetId: string) {
    return this.assetService.getPublicAttributes(assetId);
  }

  @Post(':assetId/attributes')
  @ApiOperation({ summary: 'Add an attribute to an asset' })
  async addAttribute(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Body() dto: CreateAttributeDto,
  ) {
    return this.assetService.addAttribute(assetId, req.user.sub, dto);
  }

  @Patch(':assetId/attributes/:attributeId')
  @ApiOperation({ summary: 'Update an attribute' })
  async updateAttribute(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Param('attributeId') attributeId: string,
    @Body() dto: UpdateAttributeDto,
  ) {
    return this.assetService.updateAttribute(assetId, attributeId, req.user.sub, dto);
  }

  @Delete(':assetId/attributes/:attributeId')
  @ApiOperation({ summary: 'Delete an attribute' })
  async deleteAttribute(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Param('attributeId') attributeId: string,
  ) {
    return this.assetService.deleteAttribute(assetId, attributeId, req.user.sub);
  }

  // ─── Images ──────────────────────────────────────────────────

  @Get(':assetId/images')
  @Public()
  @ApiOperation({ summary: 'List images for an asset' })
  async getImages(@Param('assetId') assetId: string) {
    return this.assetService.getImages(assetId);
  }

  @Post(':assetId/images')
  @ApiOperation({ summary: 'Add an image by URL' })
  async addImage(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Body() dto: CreateImageDto,
  ) {
    return this.assetService.addImage(assetId, req.user.sub, dto);
  }

  @Post(':assetId/images/upload')
  @ApiOperation({ summary: 'Upload an image file for an asset' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (png, jpg, gif, webp; max 5MB)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
          new FileTypeValidator({ fileType: /^image\/(png|jpeg|gif|webp)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.assetService.uploadImage(assetId, req.user.sub, file);
  }

  @Patch(':assetId/images/:imageId')
  @ApiOperation({ summary: 'Update an image record' })
  async updateImage(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateImageDto,
  ) {
    return this.assetService.updateImage(assetId, imageId, req.user.sub, dto);
  }

  @Delete(':assetId/images/:imageId')
  @ApiOperation({ summary: 'Delete an image' })
  async deleteImage(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.assetService.deleteImage(assetId, imageId, req.user.sub);
  }

  @Post(':assetId/images/:imageId/primary')
  @ApiOperation({ summary: 'Set an image as the primary for this asset' })
  async setPrimaryImage(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Param('imageId') imageId: string,
  ) {
    await this.assetService.setPrimaryImage(assetId, imageId, req.user.sub);
    return { success: true, message: 'Primary image updated.' };
  }
}

// ═══════════════════════════════════════════════════════════════
// Admin Asset Controller
// ═══════════════════════════════════════════════════════════════

@ApiTags('Admin — Assets')
@Controller('admin')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminAssetController {
  constructor(private readonly assetService: AssetService) {}

  // ─── Global Asset Management ─────────────────────────────────

  @Get('assets')
  @ApiOperation({ summary: 'List all assets (admin, includes all statuses)' })
  @ApiQuery({ name: 'gameId', required: false, description: 'Filter by Game UUID' })
  @ApiQuery({ name: 'assetTypeId', required: false, description: 'Filter by Asset Type UUID' })
  @ApiQuery({ name: 'status', required: false, enum: ['APPROVED', 'AVAILABLE', 'LISTED', 'CREATED', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'ARCHIVED'], description: 'Filter by asset status' })
  @ApiQuery({ name: 'ownerType', required: false, enum: ['PLATFORM', 'USER'], description: 'Filter by owner type' })
  @ApiQuery({ name: 'ownerId', required: false, description: 'Filter by owner UUID' })
  @ApiQuery({ name: 'search', required: false, description: 'Full-text search on asset title' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Items per page (default 20, max 100)' })
  async listAll(
    @Query() pagination: PaginationDto,
    @Query() filters: AssetFilters,
  ) {
    return this.assetService.getAssets({ ...pagination, ...filters });
  }

  @Post('assets')
  @ApiOperation({ summary: 'Create an asset (platform or on behalf of a user)' })
  async createAsset(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AdminCreateAssetDto,
  ) {
    return this.assetService.adminCreateAsset(req.user.sub, dto);
  }

  @Get('assets/:assetId')
  @ApiOperation({ summary: 'Get asset detail (admin)' })
  async get(@Param('assetId') assetId: string) {
    return this.assetService.getAsset(assetId);
  }

  @Patch('assets/:assetId')
  @ApiOperation({ summary: 'Update asset metadata (admin override)' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetService.adminUpdateAsset(assetId, req.user.sub, dto);
  }

  @Delete('assets/:assetId')
  @ApiOperation({ summary: 'Soft-delete an asset (admin)' })
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
  ) {
    return this.assetService.deleteAsset(assetId, req.user.sub);
  }

  @Post('assets/:assetId/submit')
  @ApiOperation({ summary: 'Submit an asset for review (admin override)' })
  async submit(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
  ) {
    return this.assetService.submitAsset(assetId, req.user.sub);
  }

  // ─── Admin Operations ────────────────────────────────────────

  @Post('assets/:assetId/approve')
  @ApiOperation({ summary: 'Approve a submitted asset' })
  async approve(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
  ) {
    return this.assetService.approveAsset(assetId, req.user.sub);
  }

  @Post('assets/:assetId/reject')
  @ApiOperation({ summary: 'Reject an asset with a reason' })
  async reject(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Body() dto: RejectAssetDto,
  ) {
    return this.assetService.rejectAsset(assetId, req.user.sub, dto);
  }

  @Post('assets/:assetId/archive')
  @ApiOperation({ summary: 'Archive an asset' })
  async archive(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
  ) {
    return this.assetService.archiveAsset(assetId, req.user.sub);
  }

  @Post('assets/:assetId/restore')
  @ApiOperation({ summary: 'Restore an archived asset' })
  async restore(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
  ) {
    return this.assetService.restoreAsset(assetId, req.user.sub);
  }

  @Post('assets/:assetId/change-owner')
  @ApiOperation({ summary: 'Transfer asset ownership' })
  async changeOwner(
    @Param('assetId') assetId: string,
    @Body() dto: ChangeOwnerDto,
  ) {
    return this.assetService.transferOwnership(assetId, dto);
  }

  // Alias for frontend compatibility
  @Post('assets/:assetId/transfer')
  @ApiOperation({ summary: 'Transfer asset ownership (alias)' })
  async transferOwnership(
    @Param('assetId') assetId: string,
    @Body() dto: ChangeOwnerDto,
  ) {
    return this.assetService.transferOwnership(assetId, dto);
  }

  // ─── Admin Asset Images ───────────────────────────────────

  @Post('assets/:assetId/images/upload')
  @ApiOperation({ summary: 'Upload an image file for an asset (admin)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(png|jpeg|gif|webp)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.assetService.uploadImage(assetId, req.user.sub, file);
  }

  @Post('assets/:assetId/images/:imageId/primary')
  @ApiOperation({ summary: 'Set an image as primary for an asset (admin)' })
  async setPrimaryImage(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Param('imageId') imageId: string,
  ) {
    await this.assetService.setPrimaryImage(assetId, imageId, req.user.sub);
    return { success: true, message: 'Primary image updated.' };
  }

  // ─── Platform Inventory ───────────────────────────────────

  @Get('platform/inventory')
  @ApiOperation({ summary: 'List all platform-owned assets (alias for inventory)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async listPlatformInventory(@Query() pagination: PaginationDto) {
    return this.assetService.getAssets({
      ...pagination,
      ownerType: 'PLATFORM' as any,
    });
  }

  @Get('platform/assets')
  @ApiOperation({ summary: 'List all platform-owned assets' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Items per page (default 20, max 100)' })
  async listPlatformAssets(@Query() pagination: PaginationDto) {
    return this.assetService.getAssets({
      ...pagination,
      ownerType: 'PLATFORM' as any,
    });
  }

  @Post('platform/assets')
  @ApiOperation({ summary: 'Create a new platform-owned asset' })
  async createPlatformAsset(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetService.adminCreateAsset(req.user.sub, {
      ...dto,
      ownerType: 'PLATFORM' as any,
    });
  }

  // ─── User Inventory (Admin-managed) ──────────────────────────

  @Get('users/:userId/assets')
  @ApiOperation({ summary: 'List assets owned by a specific user (admin)' })
  @ApiQuery({ name: 'gameId', required: false, description: 'Filter by Game UUID' })
  @ApiQuery({ name: 'assetTypeId', required: false, description: 'Filter by Asset Type UUID' })
  @ApiQuery({ name: 'status', required: false, enum: ['APPROVED', 'AVAILABLE', 'LISTED', 'CREATED', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'ARCHIVED'], description: 'Filter by asset status' })
  @ApiQuery({ name: 'search', required: false, description: 'Full-text search on asset title' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Items per page (default 20, max 100)' })
  async listUserAssets(
    @Param('userId') userId: string,
    @Query() pagination: PaginationDto,
    @Query() filters: AssetFilters,
  ) {
    return this.assetService.getMyAssets(userId, { ...pagination, ...filters });
  }

  @Post('users/:userId/assets')
  @ApiOperation({ summary: 'Create an asset on behalf of a user (admin)' })
  async createUserAsset(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetService.adminCreateAsset(req.user.sub, {
      ...dto,
      ownerType: 'USER' as any,
      ownerId: userId,
    });
  }
}

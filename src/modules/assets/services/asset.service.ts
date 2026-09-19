import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma, AssetStatus, OwnerType, AttributeType } from '@prisma/client';
import {
  BusinessException,
  BusinessErrors,
  notFound,
} from '../../../common/exceptions/business.exception';
import { CatalogService } from '../../catalog/services/catalog.service';
import {
  AssetRepository,
  AssetAttributeRepository,
  AssetImageRepository,
} from '../repositories/asset.repositories';
import { FileStorageService } from '../../media/services/file-storage.service';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AdminCreateAssetDto,
  CreateAttributeDto,
  UpdateAttributeDto,
  CreateImageDto,
  UpdateImageDto,
  ChangeOwnerDto,
  AssetFilters,
  RejectAssetDto,
} from '../dto/asset.dto';

// ─── Helpers ─────────────────────────────────────────────────────

function paginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    data,
    meta: {
      page,
      pageSize,
      totalItems: total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/** Allowed transitions for each asset status */
const VALID_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  [AssetStatus.CREATED]: [AssetStatus.SUBMITTED, AssetStatus.ARCHIVED],
  [AssetStatus.SUBMITTED]: [
    AssetStatus.UNDER_REVIEW,
    AssetStatus.ARCHIVED,
    AssetStatus.APPROVED,
  ],
  [AssetStatus.UNDER_REVIEW]: [
    AssetStatus.APPROVED,
    AssetStatus.REJECTED,
    AssetStatus.ARCHIVED,
  ],
  [AssetStatus.APPROVED]: [AssetStatus.AVAILABLE, AssetStatus.ARCHIVED],
  [AssetStatus.REJECTED]: [AssetStatus.SUBMITTED, AssetStatus.ARCHIVED],
  [AssetStatus.AVAILABLE]: [AssetStatus.LISTED, AssetStatus.ARCHIVED],
  [AssetStatus.LISTED]: [AssetStatus.AVAILABLE, AssetStatus.ARCHIVED],
  [AssetStatus.ARCHIVED]: [AssetStatus.CREATED],
};

@Injectable()
export class AssetService {
  constructor(
    private readonly assetRepo: AssetRepository,
    private readonly attributeRepo: AssetAttributeRepository,
    private readonly imageRepo: AssetImageRepository,
    private readonly catalogService: CatalogService,
    private readonly storageService: FileStorageService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // Asset CRUD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a user-owned asset. Validates game & asset-type exist and are active.
   */
  async createAsset(userId: string, dto: CreateAssetDto): Promise<any> {
    await this.validateAssetReferences(dto.gameId, dto.assetTypeId);

    const asset = await this.assetRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      gameId: dto.gameId,
      assetTypeId: dto.assetTypeId,
      estimatedValue: dto.estimatedValue ?? null,
      ownerType: OwnerType.USER,
      ownerId: userId,
      status: AssetStatus.CREATED,
      verificationStatus: 'UNVERIFIED',
      visibility: 'PUBLIC',
      createdBy: userId,
    });

    return await this.assetRepo.findWithRelations(asset.id);
  }

  /**
   * Admin creates an asset — can assign to PLATFORM or any USER.
   */
  async adminCreateAsset(
    adminId: string,
    dto: AdminCreateAssetDto,
  ): Promise<any> {
    await this.validateAssetReferences(dto.gameId, dto.assetTypeId);

    if (dto.ownerType === OwnerType.USER && !dto.ownerId) {
      throw new BusinessException(
        'VALIDATION',
        'ownerId is required when ownerType is USER.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const asset = await this.assetRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      gameId: dto.gameId,
      assetTypeId: dto.assetTypeId,
      estimatedValue: dto.estimatedValue ?? null,
      ownerType: dto.ownerType,
      ownerId: dto.ownerType === OwnerType.USER ? dto.ownerId! : null,
      status: AssetStatus.APPROVED,
      verificationStatus: 'VERIFIED',
      verificationNotes: 'Admin-created asset',
      verifiedBy: adminId,
      verifiedAt: new Date(),
      visibility: 'PUBLIC',
      createdBy: adminId,
    });

    return await this.assetRepo.findWithRelations(asset.id);
  }

  async getAsset(assetId: string) {
    const asset = await this.assetRepo.findWithRelations(assetId);
    if (!asset || asset.deletedAt) throw notFound('Asset', assetId);
    return asset;
  }

  /**
   * Update asset metadata. Non-owners receive FORBIDDEN.
   */
  async updateAsset(
    assetId: string,
    userId: string,
    dto: UpdateAssetDto,
  ): Promise<any> {
    const asset = await this.getAsset(assetId);
    this.assertOwnership(asset, userId);

    const updateData: Prisma.AssetUncheckedUpdateInput = {
      updatedBy: userId,
    };
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.estimatedValue !== undefined)
      updateData.estimatedValue = dto.estimatedValue;
    if (dto.visibility !== undefined) updateData.visibility = dto.visibility;

    await this.assetRepo.update(assetId, updateData);
    return await this.assetRepo.findWithRelations(assetId);
  }

  /**
   * Admin updates any asset — bypasses ownership check.
   */
  async adminUpdateAsset(
    assetId: string,
    adminId: string,
    dto: UpdateAssetDto,
  ): Promise<any> {
    const asset = await this.getAsset(assetId);

    const updateData: Prisma.AssetUncheckedUpdateInput = {
      updatedBy: adminId,
    };
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.estimatedValue !== undefined)
      updateData.estimatedValue = dto.estimatedValue;
    if (dto.visibility !== undefined) updateData.visibility = dto.visibility;

    await this.assetRepo.update(assetId, updateData);
    return await this.assetRepo.findWithRelations(assetId);
  }

  /**
   * Soft-delete an asset. Only owners or admins may delete.
   */
  async deleteAsset(assetId: string, userId: string): Promise<any> {
    const asset = await this.getAsset(assetId);
    this.assertOwnership(asset, userId);
    return await this.assetRepo.softDelete(assetId, userId);
  }

  /**
   * List assets with filters, pagination, and optional public-only view.
   */
  async getAssets(
    filters: AssetFilters & { page?: number; pageSize?: number },
  ): Promise<any> {
    const { page = 1, pageSize = 20, activeOnly = false, ...rest } = filters;
    const where: Prisma.AssetWhereInput = { deletedAt: null };

    if (rest.gameId) where.gameId = rest.gameId;
    if (rest.assetTypeId) where.assetTypeId = rest.assetTypeId;
    if (rest.status) where.status = rest.status as AssetStatus;
    if (rest.ownerType) where.ownerType = rest.ownerType as OwnerType;
    if (rest.ownerId) where.ownerId = rest.ownerId;
    if (rest.search) {
      where.title = { contains: rest.search, mode: 'insensitive' };
    }
    if (activeOnly) {
      where.status = {
        in: [AssetStatus.APPROVED, AssetStatus.AVAILABLE, AssetStatus.LISTED],
      };
    }

    const [assets, total] = await Promise.all([
      this.assetRepo.findMany({
        where,
        include: {
          game: true,
          assetType: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.assetRepo.count({ where }),
    ]);

    return paginatedResult(assets, total, page, pageSize);
  }

  /**
   * Returns assets owned by a specific user.
   */
  async getMyAssets(
    userId: string,
    filters: AssetFilters & { page?: number; pageSize?: number },
  ): Promise<any> {
    return this.getAssets({
      ...filters,
      ownerType: OwnerType.USER,
      ownerId: userId,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Ownership
  // ═══════════════════════════════════════════════════════════════

  /**
   * Submit an asset for review. Valid for CREATED or REJECTED status.
   * Only the owner may submit.
   */
  async submitAsset(assetId: string, userId: string): Promise<any> {
    const asset = await this.getAsset(assetId);
    this.assertOwnership(asset, userId);

    // Allow submission from CREATED or REJECTED status
    if (
      asset.status === AssetStatus.CREATED ||
      asset.status === AssetStatus.REJECTED
    ) {
      await this.assetRepo.update(assetId, {
        status: AssetStatus.SUBMITTED,
        updatedBy: userId,
      });
      return await this.assetRepo.findWithRelations(assetId);
    }

    throw BusinessErrors.INVALID_ASSET_STATUS_TRANSITION(
      asset.status,
      AssetStatus.SUBMITTED,
    );
  }

  /**
   * Transfer asset ownership. Creates an immutable audit record.
   */
  async transferOwnership(assetId: string, dto: ChangeOwnerDto): Promise<any> {
    const asset = await this.getAsset(assetId);

    if (dto.ownerType === OwnerType.USER && !dto.ownerId) {
      throw new BusinessException(
        'VALIDATION',
        'ownerId is required when ownerType is USER.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Record the previous owner for the audit log
    const previousOwnerType = asset.ownerType;
    const previousOwnerId = asset.ownerId;

    const updated = await this.assetRepo.transferOwnership(
      assetId,
      dto.ownerType,
      dto.ownerType === OwnerType.USER ? (dto.ownerId ?? null) : null,
    );

    // Log ownership change to admin activity table via Prisma directly
    // (since AdminActivityService is in a different module, we log inline)
    try {
      await this.assetRepo.createTransferRecord({
        assetId,
        previousOwnerType,
        previousOwnerId,
        newOwnerType: dto.ownerType,
        newOwnerId:
          dto.ownerType === OwnerType.USER ? (dto.ownerId ?? null) : null,
      });
    } catch {
      // Non-critical: transfer succeeded even if audit log fails
    }

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════
  // Admin Operations
  // ═══════════════════════════════════════════════════════════════

  /**
   * Approve asset. Validates status transition.
   */
  async approveAsset(assetId: string, adminId: string): Promise<any> {
    const asset = await this.getAsset(assetId);
    this.assertTransition(asset.status, AssetStatus.APPROVED);

    await this.assetRepo.update(assetId, {
      status: AssetStatus.APPROVED,
      verificationStatus: 'VERIFIED',
      verifiedBy: adminId,
      verifiedAt: new Date(),
      verificationNotes: null,
      updatedBy: adminId,
    });

    return await this.assetRepo.findWithRelations(assetId);
  }

  /**
   * Reject asset with mandatory reason. Validates status transition.
   */
  async rejectAsset(
    assetId: string,
    adminId: string,
    dto: RejectAssetDto,
  ): Promise<any> {
    const asset = await this.getAsset(assetId);
    this.assertTransition(asset.status, AssetStatus.REJECTED);

    await this.assetRepo.update(assetId, {
      status: AssetStatus.REJECTED,
      verificationNotes: dto.reason,
      verifiedBy: adminId,
      verifiedAt: new Date(),
      updatedBy: adminId,
    } as Prisma.AssetUncheckedUpdateInput);

    return await this.assetRepo.findWithRelations(assetId);
  }

  /**
   * Archive asset. Available from any non-terminal status.
   */
  async archiveAsset(assetId: string, adminId: string): Promise<any> {
    const asset = await this.getAsset(assetId);
    this.assertTransition(asset.status, AssetStatus.ARCHIVED);

    await this.assetRepo.update(assetId, {
      status: AssetStatus.ARCHIVED,
      updatedBy: adminId,
    });

    return await this.assetRepo.findWithRelations(assetId);
  }

  /**
   * Restore an archived asset back to CREATED state for re-submission.
   */
  async restoreAsset(assetId: string, adminId: string): Promise<any> {
    const asset = await this.getAsset(assetId);
    this.assertTransition(asset.status, AssetStatus.CREATED);

    await this.assetRepo.update(assetId, {
      status: AssetStatus.CREATED,
      verificationStatus: 'UNVERIFIED',
      verificationNotes: null,
      verifiedBy: null,
      verifiedAt: null,
      updatedBy: adminId,
    });

    return await this.assetRepo.findWithRelations(assetId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Attributes
  // ═══════════════════════════════════════════════════════════════

  async addAttribute(
    assetId: string,
    userId: string,
    dto: CreateAttributeDto,
  ): Promise<any> {
    const asset = await this.getAsset(assetId);
    this.assertOwnership(asset, userId);

    return await this.attributeRepo.create({
      assetId,
      name: dto.name,
      value: dto.value,
      type: ((dto.type as string) ?? 'STRING') as AttributeType,
      isSensitive: dto.isSensitive ?? false,
      isPublic: dto.isPublic ?? true,
      displayOrder: dto.displayOrder ?? 0,
    });
  }

  async updateAttribute(
    assetId: string,
    attributeId: string,
    userId: string,
    dto: UpdateAttributeDto,
  ): Promise<any> {
    const asset = await this.getAsset(assetId);
    this.assertOwnership(asset, userId);

    // Ensure attribute belongs to this asset
    const attribute = await this.attributeRepo.findById(attributeId);
    if (!attribute || attribute.assetId !== assetId) {
      throw notFound('Attribute', attributeId);
    }

    return await this.attributeRepo.update(attributeId, dto);
  }

  async deleteAttribute(
    assetId: string,
    attributeId: string,
    userId: string,
  ): Promise<any> {
    const asset = await this.getAsset(assetId);
    this.assertOwnership(asset, userId);

    const attribute = await this.attributeRepo.findById(attributeId);
    if (!attribute || attribute.assetId !== assetId) {
      throw notFound('Attribute', attributeId);
    }

    return await this.attributeRepo.delete(attributeId);
  }

  async getAttributes(assetId: string): Promise<any[]> {
    await this.getAsset(assetId); // ensures asset exists
    return await this.attributeRepo.findByAsset(assetId);
  }

  /**
   * Returns only public attributes and masks sensitive values.
   * Used by the public/unauthenticated endpoint.
   */
  async getPublicAttributes(assetId: string): Promise<any[]> {
    await this.getAsset(assetId);
    const all = await this.attributeRepo.findByAsset(assetId);

    return all
      .filter((attr) => attr.isPublic)
      .map((attr) => ({
        ...attr,
        value: attr.isSensitive ? '***' : attr.value,
      }));
  }

  // ═══════════════════════════════════════════════════════════════
  // Images
  // ═══════════════════════════════════════════════════════════════

  async addImage(
    assetId: string,
    userId: string,
    dto: CreateImageDto,
  ): Promise<any> {
    const asset = await this.getAsset(assetId);
    this.assertOwnership(asset, userId);

    const existingImages = await this.imageRepo.findByAsset(assetId);
    return await this.imageRepo.create({
      assetId,
      imageUrl: dto.imageUrl,
      altText: dto.altText ?? null,
      isPrimary: dto.isPrimary ?? existingImages.length === 0,
    });
  }

  /**
   * Upload an image file, persist to storage, and save the URL.
   */
  async uploadImage(
    assetId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<any> {
    const asset = await this.getAsset(assetId);
    this.assertOwnership(asset, userId);

    const existingImages = await this.imageRepo.findByAsset(assetId);

    const imageUrl = await this.storageService.upload(file, {
      folder: 'assets',
      category: 'ASSETS',
      uploadedBy: userId,
    });

    return await this.imageRepo.create({
      assetId,
      imageUrl,
      altText: file.originalname ?? null,
      isPrimary: existingImages.length === 0,
    });
  }

  async updateImage(
    assetId: string,
    imageId: string,
    userId: string,
    dto: UpdateImageDto,
  ): Promise<any> {
    const asset = await this.getAsset(assetId);
    this.assertOwnership(asset, userId);

    const image = await this.imageRepo.findById(imageId);
    if (!image || image.assetId !== assetId) {
      throw notFound('Image', imageId);
    }

    return await this.imageRepo.update(imageId, dto);
  }

  async deleteImage(
    assetId: string,
    imageId: string,
    userId: string,
  ): Promise<any> {
    const asset = await this.getAsset(assetId);
    this.assertOwnership(asset, userId);

    const image = await this.imageRepo.findById(imageId);
    if (!image || image.assetId !== assetId) {
      throw notFound('Image', imageId);
    }

    // Delete the file from storage (provider handles local/cloudinary/r2 internally)
    await this.storageService.delete(image.imageUrl).catch(() => {});

    return await this.imageRepo.delete(imageId);
  }

  async getImages(assetId: string): Promise<any[]> {
    await this.getAsset(assetId);
    return await this.imageRepo.findByAsset(assetId);
  }

  async setPrimaryImage(
    assetId: string,
    imageId: string,
    userId: string,
  ): Promise<void> {
    const asset = await this.getAsset(assetId);
    this.assertOwnership(asset, userId);

    const image = await this.imageRepo.findById(imageId);
    if (!image || image.assetId !== assetId) {
      throw notFound('Image', imageId);
    }

    await this.imageRepo.setPrimary(assetId, imageId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Validation Helpers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Ensure the referenced game and asset type exist and are active.
   */
  private async validateAssetReferences(
    gameId: string,
    assetTypeId: string,
  ): Promise<void> {
    try {
      const game = await this.catalogService.getGame(gameId);
      if (!game.isActive) throw BusinessErrors.GAME_NOT_ACTIVE();
    } catch (err) {
      if (err instanceof BusinessException) throw err;
      throw BusinessErrors.GAME_NOT_FOUND(gameId);
    }

    try {
      const assetType = await this.catalogService.getAssetType(assetTypeId);
      if (!assetType.isActive) throw BusinessErrors.ASSET_TYPE_NOT_ACTIVE();
    } catch (err) {
      if (err instanceof BusinessException) throw err;
      throw BusinessErrors.ASSET_TYPE_NOT_FOUND(assetTypeId);
    }
  }

  /**
   * Verify that the requesting user is the asset owner.
   */
  private assertOwnership(asset: any, userId: string): void {
    if (asset.ownerType === OwnerType.USER && asset.ownerId !== userId) {
      throw BusinessErrors.NOT_ASSET_OWNER();
    }
    // Platform-owned assets can only be modified by admins (enforced at controller level)
  }

  /**
   * Validate that a status transition is allowed.
   */
  private assertTransition(current: AssetStatus, target: AssetStatus): void {
    const allowed = VALID_TRANSITIONS[current];
    if (!allowed || !allowed.includes(target)) {
      throw BusinessErrors.INVALID_ASSET_STATUS_TRANSITION(current, target);
    }
  }
}

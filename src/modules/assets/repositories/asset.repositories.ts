import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, OwnerType } from '@prisma/client';
import type { Asset, AssetAttribute, AssetImage } from '@prisma/client';

// ─── Asset Repository ───────────────────────────────────────────

@Injectable()
export class AssetRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<Asset | null> {
    return await this.prisma.asset.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<Asset> {
    const asset = await this.findById(id);
    if (!asset) {
      throw new Error(`Asset with id ${id} not found`);
    }
    return asset;
  }

  async findWithRelations(id: string) {
    return await this.prisma.asset.findUnique({
      where: { id },
      include: {
        game: true,
        assetType: true,
        attributes: { orderBy: { displayOrder: 'asc' } },
        images: { orderBy: { displayOrder: 'asc' } },
        owner: { select: { id: true, username: true } },
      },
    });
  }

  async findMany(options: {
    where?: Prisma.AssetWhereInput;
    include?: Prisma.AssetInclude;
    skip?: number;
    take?: number;
    orderBy?: Prisma.AssetOrderByWithRelationInput;
  }): Promise<Asset[]> {
    return await this.prisma.asset.findMany(options);
  }

  async count(options: { where?: Prisma.AssetWhereInput }): Promise<number> {
    return await this.prisma.asset.count(options);
  }

  async create(data: Prisma.AssetUncheckedCreateInput): Promise<Asset> {
    return await this.prisma.asset.create({ data });
  }

  async update(id: string, data: Prisma.AssetUncheckedUpdateInput): Promise<Asset> {
    return await this.prisma.asset.update({ where: { id }, data });
  }

  async softDelete(id: string, deletedBy?: string): Promise<Asset> {
    return await this.prisma.asset.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: deletedBy ?? null,
      },
    });
  }

  async transferOwnership(
    id: string,
    ownerType: OwnerType,
    ownerId: string | null,
  ): Promise<Asset> {
    return await this.prisma.asset.update({
      where: { id },
      data: { ownerType, ownerId },
    });
  }

  /**
   * Creates an immutable ownership transfer audit record.
   * Uses admin_activity_logs as the audit sink for ownership transfers.
   */
  async createTransferRecord(params: {
    assetId: string;
    previousOwnerType: string;
    previousOwnerId: string | null;
    newOwnerType: string;
    newOwnerId: string | null;
  }): Promise<void> {
    await this.prisma.adminActivityLog.create({
      data: {
        adminId: params.newOwnerId ?? '00000000-0000-0000-0000-000000000000', // system or new owner
        action: 'ASSET_OWNERSHIP_TRANSFERRED',
        targetResource: 'Asset',
        resourceId: params.assetId,
        summary: `Ownership transferred from ${params.previousOwnerType}/${params.previousOwnerId ?? 'N/A'} to ${params.newOwnerType}/${params.newOwnerId ?? 'N/A'}`,
        metadata: {
          assetId: params.assetId,
          previousOwnerType: params.previousOwnerType,
          previousOwnerId: params.previousOwnerId,
          newOwnerType: params.newOwnerType,
          newOwnerId: params.newOwnerId,
        },
      },
    });
  }
}

// ─── Asset Attribute Repository ──────────────────────────────────

@Injectable()
export class AssetAttributeRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByAsset(assetId: string): Promise<AssetAttribute[]> {
    return await this.prisma.assetAttribute.findMany({
      where: { assetId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findById(id: string): Promise<AssetAttribute | null> {
    return await this.prisma.assetAttribute.findUnique({ where: { id } });
  }

  async create(data: Prisma.AssetAttributeUncheckedCreateInput): Promise<AssetAttribute> {
    return await this.prisma.assetAttribute.create({ data });
  }

  async update(
    id: string,
    data: Prisma.AssetAttributeUncheckedUpdateInput,
  ): Promise<AssetAttribute> {
    return await this.prisma.assetAttribute.update({ where: { id }, data });
  }

  async delete(id: string): Promise<AssetAttribute> {
    return await this.prisma.assetAttribute.delete({ where: { id } });
  }
}

// ─── Asset Image Repository ──────────────────────────────────────

@Injectable()
export class AssetImageRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByAsset(assetId: string): Promise<AssetImage[]> {
    return await this.prisma.assetImage.findMany({
      where: { assetId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findById(id: string): Promise<AssetImage | null> {
    return await this.prisma.assetImage.findUnique({ where: { id } });
  }

  async create(data: Prisma.AssetImageUncheckedCreateInput): Promise<AssetImage> {
    return await this.prisma.assetImage.create({ data });
  }

  async update(
    id: string,
    data: Prisma.AssetImageUncheckedUpdateInput,
  ): Promise<AssetImage> {
    return await this.prisma.assetImage.update({ where: { id }, data });
  }

  async delete(id: string): Promise<AssetImage> {
    return await this.prisma.assetImage.delete({ where: { id } });
  }

  /**
   * Sets one image as primary while clearing all others for this asset.
   * Uses a transaction to ensure atomicity.
   */
  async setPrimary(assetId: string, imageId: string): Promise<void> {
    await this.transaction(async (tx) => {
      await tx.assetImage.updateMany({
        where: { assetId },
        data: { isPrimary: false },
      });
      await tx.assetImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      });
    });
  }
}

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { AssetType } from '@prisma/client';

@Injectable()
export class AssetTypeRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<AssetType | null> {
    return this.prisma.assetType.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<AssetType | null> {
    return this.prisma.assetType.findUnique({ where: { name } });
  }

  async findBySlug(slug: string): Promise<AssetType | null> {
    return this.prisma.assetType.findUnique({ where: { slug } });
  }

  async findMany(options: {
    where?: Prisma.AssetTypeWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.AssetTypeOrderByWithRelationInput;
  }): Promise<AssetType[]> {
    return this.prisma.assetType.findMany(options);
  }

  async count(options: { where?: Prisma.AssetTypeWhereInput }): Promise<number> {
    return this.prisma.assetType.count(options);
  }

  async create(data: Prisma.AssetTypeUncheckedCreateInput): Promise<AssetType> {
    return this.prisma.assetType.create({ data });
  }

  async update(id: string, data: Prisma.AssetTypeUncheckedUpdateInput): Promise<AssetType> {
    return this.prisma.assetType.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<AssetType> {
    return this.prisma.assetType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

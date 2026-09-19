import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { Category } from '@prisma/client';

@Injectable()
export class CategoryRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { name } });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { slug } });
  }

  async findMany(options: {
    where?: Prisma.CategoryWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.CategoryOrderByWithRelationInput;
  }): Promise<Category[]> {
    return this.prisma.category.findMany(options);
  }

  async count(options: { where?: Prisma.CategoryWhereInput }): Promise<number> {
    return this.prisma.category.count(options);
  }

  async create(data: Prisma.CategoryUncheckedCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  async update(id: string, data: Prisma.CategoryUncheckedUpdateInput): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

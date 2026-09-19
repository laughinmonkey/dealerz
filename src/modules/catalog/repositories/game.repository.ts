import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { notFound } from '../../../common/exceptions/business.exception';
import { Prisma } from '@prisma/client';
import type { Game, Category } from '@prisma/client';

@Injectable()
export class GameRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<Game | null> {
    return this.prisma.game.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<Game> {
    const game = await this.findById(id);
    if (!game) throw notFound('Game', id);
    return game;
  }

  async findWithCategory(id: string): Promise<(Game & { category: Category }) | null> {
    return this.prisma.game.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  async findByName(name: string): Promise<Game | null> {
    return this.prisma.game.findUnique({ where: { name } });
  }

  async findBySlug(slug: string): Promise<Game | null> {
    return this.prisma.game.findUnique({ where: { slug } });
  }

  async findMany(options: {
    where?: Prisma.GameWhereInput;
    include?: Prisma.GameInclude;
    skip?: number;
    take?: number;
    orderBy?: Prisma.GameOrderByWithRelationInput;
  }): Promise<Game[]> {
    return this.prisma.game.findMany(options);
  }

  async count(options: { where?: Prisma.GameWhereInput }): Promise<number> {
    return this.prisma.game.count(options);
  }

  async countActiveByCategory(categoryId: string): Promise<number> {
    return this.prisma.game.count({
      where: { categoryId, isActive: true, deletedAt: null },
    });
  }

  async create(data: Prisma.GameUncheckedCreateInput): Promise<Game> {
    return this.prisma.game.create({ data });
  }

  async update(id: string, data: Prisma.GameUncheckedUpdateInput): Promise<Game> {
    return this.prisma.game.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Game> {
    return this.prisma.game.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

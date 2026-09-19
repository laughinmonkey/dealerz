import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  BusinessException,
  notFound,
} from '../../../common/exceptions/business.exception';
import {
  GameRepository,
  CategoryRepository,
  AssetTypeRepository,
} from '../repositories';
import {
  CreateGameDto,
  UpdateGameDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateAssetTypeDto,
  UpdateAssetTypeDto,
} from '../dto';

// ─── Helpers ─────────────────────────────────────────────────────

const UNIQUE_VIOLATION = 'P2002';

function handleUniqueError(
  err: unknown,
  resource: string,
): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === UNIQUE_VIOLATION
  ) {
    const target = (err.meta as Record<string, unknown> | undefined)?.target;
    const fields: string[] = Array.isArray(target) ? (target as string[]) : [];
    const fieldLabel = fields.join('/') || 'field';
    throw new BusinessException(
      'DUPLICATE_ENTRY',
      `${resource} with this ${fieldLabel} already exists.`,
      HttpStatus.CONFLICT,
    );
  }
  throw err;
}

function paginatedResult<T>(data: T[], total: number, page: number, pageSize: number) {
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

// ─── Catalog Service ─────────────────────────────────────────────

@Injectable()
export class CatalogService {
  constructor(
    private readonly gameRepo: GameRepository,
    private readonly categoryRepo: CategoryRepository,
    private readonly assetTypeRepo: AssetTypeRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // Games
  // ═══════════════════════════════════════════════════════════════

  async createGame(dto: CreateGameDto) {
    // Validate referenced category exists
    const category = await this.categoryRepo.findById(dto.categoryId);
    if (!category || category.deletedAt) {
      throw new BusinessException(
        'CATEGORY_NOT_FOUND',
        `Category with ID ${dto.categoryId} not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      return await this.gameRepo.create({
        name: dto.name,
        slug: dto.slug,
        categoryId: dto.categoryId,
        description: dto.description,
        developer: dto.developer,
        publisher: dto.publisher,
        website: dto.website,
        logoFileId: dto.logoFileId ?? null,
        bannerFileId: dto.bannerFileId ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      });
    } catch (err) {
      handleUniqueError(err, 'Game');
    }
  }

  async updateGame(gameId: string, dto: UpdateGameDto) {
    await this.gameRepo.findByIdOrThrow(gameId);

    // Validate category if it's being changed
    if (dto.categoryId) {
      const category = await this.categoryRepo.findById(dto.categoryId);
      if (!category || category.deletedAt) {
        throw new BusinessException(
          'CATEGORY_NOT_FOUND',
          `Category with ID ${dto.categoryId} not found.`,
          HttpStatus.NOT_FOUND,
        );
      }
    }

    try {
      return await this.gameRepo.update(gameId, dto as Prisma.GameUncheckedUpdateInput);
    } catch (err) {
      handleUniqueError(err, 'Game');
    }
  }

  async deleteGame(gameId: string) {
    await this.gameRepo.findByIdOrThrow(gameId);
    return this.gameRepo.softDelete(gameId);
  }

  async activateGame(gameId: string) {
    const game = await this.gameRepo.findByIdOrThrow(gameId);
    if (game.deletedAt) throw notFound('Game', gameId);
    return this.gameRepo.update(gameId, { isActive: true });
  }

  async deactivateGame(gameId: string) {
    const game = await this.gameRepo.findByIdOrThrow(gameId);
    if (game.deletedAt) throw notFound('Game', gameId);
    return this.gameRepo.update(gameId, { isActive: false });
  }

  async getGame(gameId: string, activeOnly = false) {
    const game = await this.gameRepo.findWithCategory(gameId);
    if (!game || game.deletedAt) throw notFound('Game', gameId);
    if (activeOnly && !game.isActive) throw notFound('Game', gameId);
    return game;
  }

  async getGames(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    categoryId?: string;
    activeOnly?: boolean;
  }) {
    const { page = 1, pageSize = 20, search, categoryId, activeOnly = false } = params;
    const where: Prisma.GameWhereInput = { deletedAt: null };

    if (activeOnly) where.isActive = true;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (categoryId) where.categoryId = categoryId;

    const [games, total] = await Promise.all([
      this.gameRepo.findMany({
        where,
        include: { category: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sortOrder: 'asc' },
      }),
      this.gameRepo.count({ where }),
    ]);

    // Resolve file IDs to URLs
    const gamesWithUrls = await Promise.all(games.map(async (game) => {
      const result: any = { ...game };
      if (game.logoFileId) {
        const f = await this.prisma.file.findUnique({ where: { id: game.logoFileId }, select: { fileUrl: true } });
        result.logoUrl = f?.fileUrl || null;
      }
      if (game.bannerFileId) {
        const f = await this.prisma.file.findUnique({ where: { id: game.bannerFileId }, select: { fileUrl: true } });
        result.bannerUrl = f?.fileUrl || null;
      }
      return result;
    }));

    return paginatedResult(gamesWithUrls, total, page, pageSize);
  }

  // ═══════════════════════════════════════════════════════════════
  // Categories
  // ═══════════════════════════════════════════════════════════════

  async createCategory(dto: CreateCategoryDto) {
    try {
      return await this.categoryRepo.create({
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        iconFileId: dto.iconFileId ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      });
    } catch (err) {
      handleUniqueError(err, 'Category');
    }
  }

  async updateCategory(categoryId: string, dto: UpdateCategoryDto) {
    const cat = await this.categoryRepo.findById(categoryId);
    if (!cat || cat.deletedAt) throw notFound('Category', categoryId);
    try {
      return await this.categoryRepo.update(categoryId, dto as Prisma.CategoryUncheckedUpdateInput);
    } catch (err) {
      handleUniqueError(err, 'Category');
    }
  }

  async deleteCategory(categoryId: string) {
    const cat = await this.categoryRepo.findById(categoryId);
    if (!cat || cat.deletedAt) throw notFound('Category', categoryId);

    // Categories cannot be deleted while active games reference them
    const activeGameCount = await this.gameRepo.countActiveByCategory(categoryId);
    if (activeGameCount > 0) {
      throw new BusinessException(
        'CATEGORY_IN_USE',
        `Cannot delete category: ${activeGameCount} active game(s) still reference it.`,
        HttpStatus.CONFLICT,
      );
    }

    return this.categoryRepo.softDelete(categoryId);
  }

  async getCategory(categoryId: string, activeOnly = false) {
    const cat = await this.categoryRepo.findById(categoryId);
    if (!cat || cat.deletedAt) throw notFound('Category', categoryId);
    if (activeOnly && !cat.isActive) throw notFound('Category', categoryId);

    let iconUrl: string | null = null;
    if (cat.iconFileId) {
      const f = await this.prisma.file.findUnique({ where: { id: cat.iconFileId }, select: { fileUrl: true } });
      iconUrl = f?.fileUrl || null;
    }

    return { ...cat, iconUrl };
  }

  async getCategories(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    activeOnly?: boolean;
  }) {
    const { page = 1, pageSize = 20, search, activeOnly = false } = params;
    const where: Prisma.CategoryWhereInput = { deletedAt: null };

    if (activeOnly) where.isActive = true;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [categories, total] = await Promise.all([
      this.categoryRepo.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sortOrder: 'asc' },
      }),
      this.categoryRepo.count({ where }),
    ]);

    // Resolve icon file IDs to URLs
    const categoriesWithUrls = await Promise.all(categories.map(async (cat) => {
      const result: any = { ...cat };
      if (cat.iconFileId) {
        const f = await this.prisma.file.findUnique({ where: { id: cat.iconFileId }, select: { fileUrl: true } });
        result.iconUrl = f?.fileUrl || null;
      }
      return result;
    }));

    return paginatedResult(categoriesWithUrls, total, page, pageSize);
  }

  // ═══════════════════════════════════════════════════════════════
  // Asset Types
  // ═══════════════════════════════════════════════════════════════

  async createAssetType(dto: CreateAssetTypeDto) {
    try {
      return await this.assetTypeRepo.create({
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        isActive: dto.isActive ?? true,
      });
    } catch (err) {
      handleUniqueError(err, 'Asset Type');
    }
  }

  async updateAssetType(id: string, dto: UpdateAssetTypeDto) {
    const at = await this.assetTypeRepo.findById(id);
    if (!at || at.deletedAt) throw notFound('Asset Type', id);
    try {
      return await this.assetTypeRepo.update(id, dto as Prisma.AssetTypeUncheckedUpdateInput);
    } catch (err) {
      handleUniqueError(err, 'Asset Type');
    }
  }

  async deleteAssetType(id: string) {
    const at = await this.assetTypeRepo.findById(id);
    if (!at || at.deletedAt) throw notFound('Asset Type', id);
    return this.assetTypeRepo.softDelete(id);
  }

  async getAssetType(id: string, activeOnly = false) {
    const at = await this.assetTypeRepo.findById(id);
    if (!at || at.deletedAt) throw notFound('Asset Type', id);
    if (activeOnly && !at.isActive) throw notFound('Asset Type', id);
    return at;
  }

  async getAssetTypes(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    activeOnly?: boolean;
  }) {
    const { page = 1, pageSize = 20, search, activeOnly = false } = params;
    const where: Prisma.AssetTypeWhereInput = { deletedAt: null };

    if (activeOnly) where.isActive = true;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [types, total] = await Promise.all([
      this.assetTypeRepo.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
      this.assetTypeRepo.count({ where }),
    ]);

    return paginatedResult(types, total, page, pageSize);
  }
}

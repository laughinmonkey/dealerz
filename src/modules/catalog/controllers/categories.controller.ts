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
import { CreateCategoryDto, UpdateCategoryDto, CategoryFilterDto } from '../dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

// ─── Public Controller ───────────────────────────────────────────

@ApiTags('Catalog — Categories')
@Controller('categories')
export class PublicCategoryController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active categories (public)' })
  async listCategories(
    @Query() pagination: PaginationDto,
    @Query() filters: CategoryFilterDto,
  ) {
    return this.catalogService.getCategories({
      ...pagination,
      search: filters.search,
      activeOnly: true,
    });
  }

  @Public()
  @Get(':categoryId')
  @ApiOperation({ summary: 'Get a category by ID (public, active only)' })
  async getCategory(@Param('categoryId') categoryId: string) {
    return this.catalogService.getCategory(categoryId, true);
  }
}

// ─── Admin Controller ────────────────────────────────────────────

@ApiTags('Admin — Categories')
@Controller('admin/categories')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminCategoryController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories (admin)' })
  async listAllCategories(
    @Query() pagination: PaginationDto,
    @Query() filters: CategoryFilterDto,
  ) {
    return this.catalogService.getCategories({
      ...pagination,
      search: filters.search,
    });
  }

  @Get(':categoryId')
  @ApiOperation({ summary: 'Get a category by ID (admin)' })
  async getCategory(@Param('categoryId') categoryId: string) {
    return this.catalogService.getCategory(categoryId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Patch(':categoryId')
  @ApiOperation({ summary: 'Update a category' })
  async updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.catalogService.updateCategory(categoryId, dto);
  }

  @Delete(':categoryId')
  @ApiOperation({ summary: 'Soft-delete a category (fails if games reference it)' })
  async deleteCategory(@Param('categoryId') categoryId: string) {
    return this.catalogService.deleteCategory(categoryId);
  }
}

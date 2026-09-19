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
import { CreateGameDto, UpdateGameDto, GameFilterDto } from '../dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

// ─── Public Controller ───────────────────────────────────────────

@ApiTags('Catalog — Games')
@Controller('games')
export class PublicGameController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active games (public)' })
  async listGames(
    @Query() pagination: PaginationDto,
    @Query() filters: GameFilterDto,
  ) {
    return this.catalogService.getGames({
      ...pagination,
      search: filters.search,
      categoryId: filters.categoryId,
      activeOnly: true,
    });
  }

  @Public()
  @Get(':gameId')
  @ApiOperation({ summary: 'Get a game by ID (public, active only)' })
  async getGame(@Param('gameId') gameId: string) {
    return this.catalogService.getGame(gameId, true);
  }
}

// ─── Admin Controller ────────────────────────────────────────────

@ApiTags('Admin — Games')
@Controller('admin/games')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminGameController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List all games (admin, includes inactive/soft-deleted)' })
  async listAllGames(
    @Query() pagination: PaginationDto,
    @Query() filters: GameFilterDto,
  ) {
    return this.catalogService.getGames({
      ...pagination,
      search: filters.search,
      categoryId: filters.categoryId,
    });
  }

  @Get(':gameId')
  @ApiOperation({ summary: 'Get a game by ID (admin)' })
  async getGame(@Param('gameId') gameId: string) {
    return this.catalogService.getGame(gameId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new game' })
  async createGame(@Body() dto: CreateGameDto) {
    return this.catalogService.createGame(dto);
  }

  @Patch(':gameId')
  @ApiOperation({ summary: 'Update a game' })
  async updateGame(
    @Param('gameId') gameId: string,
    @Body() dto: UpdateGameDto,
  ) {
    return this.catalogService.updateGame(gameId, dto);
  }

  @Delete(':gameId')
  @ApiOperation({ summary: 'Soft-delete a game' })
  async deleteGame(@Param('gameId') gameId: string) {
    return this.catalogService.deleteGame(gameId);
  }

  @Post(':gameId/activate')
  @ApiOperation({ summary: 'Activate a game' })
  async activateGame(@Param('gameId') gameId: string) {
    return this.catalogService.activateGame(gameId);
  }

  @Post(':gameId/deactivate')
  @ApiOperation({ summary: 'Deactivate a game' })
  async deactivateGame(@Param('gameId') gameId: string) {
    return this.catalogService.deactivateGame(gameId);
  }
}

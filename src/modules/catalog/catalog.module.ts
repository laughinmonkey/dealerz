import { Module } from '@nestjs/common';
import {
  PublicGameController,
  AdminGameController,
} from './controllers/games.controller';
import {
  PublicCategoryController,
  AdminCategoryController,
} from './controllers/categories.controller';
import {
  PublicAssetTypeController,
  AdminAssetTypeController,
} from './controllers/asset-types.controller';
import { CatalogService } from './services/catalog.service';
import {
  GameRepository,
  CategoryRepository,
  AssetTypeRepository,
} from './repositories';

@Module({
  controllers: [
    // Public
    PublicGameController,
    PublicCategoryController,
    PublicAssetTypeController,
    // Admin
    AdminGameController,
    AdminCategoryController,
    AdminAssetTypeController,
  ],
  providers: [CatalogService, GameRepository, CategoryRepository, AssetTypeRepository],
  exports: [CatalogService],
})
export class CatalogModule {}

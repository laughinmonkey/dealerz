import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import {
  AssetController,
  AdminAssetController,
} from './controllers/asset.controller';
import { AssetService } from './services/asset.service';
import {
  AssetRepository,
  AssetAttributeRepository,
  AssetImageRepository,
} from './repositories/asset.repositories';

@Module({
  imports: [CatalogModule],
  controllers: [AssetController, AdminAssetController],
  providers: [
    AssetService,
    AssetRepository,
    AssetAttributeRepository,
    AssetImageRepository,
  ],
  exports: [AssetService],
})
export class AssetsModule {}

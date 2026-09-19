import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { ListingController, AdminListingController } from './controllers/listing.controller';
import { ListingService } from './services/listing.service';
import { ListingRepository } from './repositories/listing.repository';

@Module({
  imports: [AssetsModule],
  controllers: [ListingController, AdminListingController],
  providers: [ListingService, ListingRepository],
  exports: [ListingService],
})
export class ListingsModule {}

import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { IdentityModule } from '../identity/identity.module';
import { WalletsModule } from '../wallets/wallets.module';
import { BidController, AdminBidController } from './controllers/bid.controller';
import { BidService } from './services/bid.service';
import { BidRepository } from './repositories/bid.repository';

@Module({
  imports: [ListingsModule, IdentityModule, WalletsModule],
  controllers: [BidController, AdminBidController],
  providers: [BidService, BidRepository],
  exports: [BidService],
})
export class BidsModule {}

import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { AssetsModule } from '../assets/assets.module';
import { WalletsModule } from '../wallets/wallets.module';
import { BidsModule } from '../bids/bids.module';
import { IdentityModule } from '../identity/identity.module';
import { TransactionController, AdminTransactionController } from './controllers/marketplace-transaction.controller';
import { MarketplaceTransactionService } from './services/marketplace-transaction.service';
import { MarketplaceTransactionRepository } from './repositories/marketplace-transaction.repository';

@Module({
  imports: [ListingsModule, AssetsModule, WalletsModule, BidsModule, IdentityModule],
  controllers: [TransactionController, AdminTransactionController],
  providers: [MarketplaceTransactionService, MarketplaceTransactionRepository],
  exports: [MarketplaceTransactionService],
})
export class MarketplaceTransactionsModule {}

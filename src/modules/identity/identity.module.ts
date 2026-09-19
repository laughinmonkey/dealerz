import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuthController } from './controllers/auth.controller';
import { ProfileController } from './controllers/profile.controller';
import { PaymentCardController } from './controllers/payment-card.controller';
import { PayoutAccountController } from './controllers/payout-account.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { WatchlistController } from '../watchlist/watchlist.controller';
import { PreferencesController } from '../preferences/preferences.controller';
import { IdentityService } from './services/identity.service';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import {
  UserRepository,
  UserProfileRepository,
  UserPermissionRepository,
  UserIdentityDocumentRepository,
  PaymentCardRepository,
  PayoutAccountRepository,
  RefreshTokenRepository,
} from './repositories/identity.repositories';

@Module({
  imports: [AdminModule],
  controllers: [
    AuthController,
    ProfileController,
    PaymentCardController,
    PayoutAccountController,
    AdminUserController,
    WatchlistController,
    PreferencesController,
  ],
  providers: [
    // Services
    IdentityService,
    AuthService,
    TokenService,
    // Repositories
    UserRepository,
    UserProfileRepository,
    UserPermissionRepository,
    UserIdentityDocumentRepository,
    PaymentCardRepository,
    PayoutAccountRepository,
    RefreshTokenRepository,
  ],
  exports: [IdentityService, AuthService, TokenService, UserRepository],
})
export class IdentityModule {}

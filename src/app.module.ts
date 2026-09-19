import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './common/logger/logger.module';
import { MediaModule } from './modules/media/media.module';
import { IdentityModule } from './modules/identity/identity.module';
import { KycModule } from './modules/kyc/kyc.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { AssetsModule } from './modules/assets/assets.module';
import { ListingsModule } from './modules/listings/listings.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { BidsModule } from './modules/bids/bids.module';
import { MarketplaceTransactionsModule } from './modules/marketplace-transactions/marketplace-transactions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';

@Module({
  imports: [
    // Logger must be first so every downstream provider can inject it
    LoggerModule,
    // Media must be early — provides FileStorageService globally
    MediaModule,
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '32000m' as const },
      }),
      global: true,
    }),
    PrismaModule,
    IdentityModule,
    KycModule,
    CatalogModule,
    AssetsModule,
    ListingsModule,
    WalletsModule,
    BidsModule,
    MarketplaceTransactionsModule,
    NotificationsModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Response interceptor runs first (wraps output), then logging (traces method calls)
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}

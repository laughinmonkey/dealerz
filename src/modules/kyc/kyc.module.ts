import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IdentityModule } from '../identity/identity.module';
import { KycController, AdminKycController } from './controllers/kyc.controller';
import { KycService } from './services/kyc.service';
import {
  KycRequestRepository,
  KycDocumentRepository,
} from './repositories/kyc.repositories';

@Module({
  imports: [
    IdentityModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    }),
  ],
  controllers: [KycController, AdminKycController],
  providers: [
    KycService,
    KycRequestRepository,
    KycDocumentRepository,
  ],
  exports: [KycService],
})
export class KycModule {}

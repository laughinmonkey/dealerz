import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LocalStorageProvider } from './providers/local.provider';
import { CloudinaryProvider } from './providers/cloudinary.provider';
import { R2Provider } from './providers/r2.provider';
import { FileController } from './controllers/file.controller';
import { FileStorageFactory } from './services/file-storage.factory';
import { FileStorageService } from './services/file-storage.service';

/**
 * Global media module — provides file storage that can be swapped
 * between local, Cloudinary, and Cloudflare R2 via admin settings.
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [FileController],
  providers: [
    LocalStorageProvider,
    CloudinaryProvider,
    R2Provider,
    FileStorageFactory,
    FileStorageService,
  ],
  exports: [FileStorageService],
})
export class MediaModule {}

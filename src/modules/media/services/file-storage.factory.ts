import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageProvider } from '../interfaces/storage-provider.interface';
import { LocalStorageProvider } from '../providers/local.provider';
import { CloudinaryProvider } from '../providers/cloudinary.provider';
import { R2Provider } from '../providers/r2.provider';
import { PrismaService } from '../../../prisma/prisma.service';

export type StorageProviderType = 'local' | 'cloudinary' | 'r2';

/**
 * Factory that selects the active file storage provider.
 *
 * Priority:
 * 1. STORAGE_PROVIDER environment variable
 * 2. `storage_provider` setting in the database
 * 3. Falls back to 'r2' (default)
 */
@Injectable()
export class FileStorageFactory {
  private readonly logger = new Logger(FileStorageFactory.name);
  private cachedProvider: IStorageProvider | null = null;
  private cachedType: string | null = null;

  constructor(
    private readonly local: LocalStorageProvider,
    private readonly cloudinary: CloudinaryProvider,
    private readonly r2: R2Provider,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getProvider(): Promise<IStorageProvider> {
    let type: string;

    // 1. Check env var first
    const envProvider = this.configService.get<string>('STORAGE_PROVIDER');
    if (envProvider && ['local', 'cloudinary', 'r2'].includes(envProvider)) {
      type = envProvider;
    } else {
      // 2. Check DB setting
      try {
        const setting = await this.prisma.setting.findUnique({
          where: { key: 'storage_provider' },
        });
        type = setting?.value || 'r2';
      } catch {
        type = 'r2';
      }
    }

    // Return cached if same type
    if (this.cachedProvider && this.cachedType === type) {
      return this.cachedProvider;
    }

    this.cachedType = type;
    this.cachedProvider = this.selectProvider(type);
    this.logger.log(`Active storage provider: ${this.cachedProvider.name}`);

    return this.cachedProvider;
  }

  /** Force-refresh the cached provider (called when settings change) */
  clearCache(): void {
    this.cachedProvider = null;
    this.cachedType = null;
  }

  private selectProvider(type: string): IStorageProvider {
    switch (type) {
      case 'cloudinary':
        return this.cloudinary;
      case 'r2':
        return this.r2;
      case 'local':
      default:
        return this.local;
    }
  }
}

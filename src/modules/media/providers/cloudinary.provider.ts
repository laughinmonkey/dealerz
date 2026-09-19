import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { IStorageProvider } from '../interfaces/storage-provider.interface';

/**
 * Cloudinary storage provider.
 * Environment variables required:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */
@Injectable()
export class CloudinaryProvider implements IStorageProvider {
  readonly name = 'cloudinary';
  private readonly logger = new Logger(CloudinaryProvider.name);
  private configured = false;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      this.configured = true;
    } else {
      this.logger.warn('Cloudinary credentials missing — provider will fall back');
    }
  }

  async upload(file: Express.Multer.File, folder = 'general'): Promise<string> {
    if (!this.configured) {
      throw new Error('Cloudinary is not configured');
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (err, result) => (err ? reject(err) : resolve(result!)),
      );
      stream.end(file.buffer);
    });

    this.logger.log(`[cloudinary] Uploaded ${result.public_id} (${result.bytes} bytes)`);
    return result.secure_url;
  }

  async delete(fileUrl: string): Promise<void> {
    if (!this.configured) return;

    try {
      // Extract public_id from Cloudinary URL
      // Format: https://res.cloudinary.com/{cloud}/image/upload/v1234567/{folder}/{filename}
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const uploadIdx = pathParts.indexOf('upload');
      if (uploadIdx === -1) return;

      // Everything after /upload/v{version}/ is the public_id (minus extension)
      const publicIdParts = pathParts.slice(uploadIdx + 2);
      const publicId = publicIdParts.join('/').replace(/\.[^.]+$/, '');

      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`[cloudinary] Deleted ${publicId}`);
    } catch (err) {
      this.logger.warn(`[cloudinary] Failed to delete ${fileUrl}: ${(err as Error).message}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { IStorageProvider } from '../interfaces/storage-provider.interface';

/**
 * Cloudflare R2 storage provider (S3-compatible).
 * Environment variables required:
 *   R2_ACCOUNT_ID        — Cloudflare account ID
 *   R2_ACCESS_KEY_ID     — R2 access key
 *   R2_SECRET_ACCESS_KEY — R2 secret key
 *   R2_BUCKET_NAME       — Bucket name
 *   R2_PUBLIC_URL        — Public base URL for the bucket (or custom domain)
 */
@Injectable()
export class R2Provider implements IStorageProvider {
  readonly name = 'r2';
  private readonly logger = new Logger(R2Provider.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private configured = false;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    const bucket = this.configService.get<string>('R2_BUCKET_NAME');
    const publicUrl = this.configService.get<string>('R2_PUBLIC_URL');

    if (accountId && accessKeyId && secretAccessKey && bucket) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.bucket = bucket;
      this.publicUrl = publicUrl || `https://${bucket}.${accountId}.r2.cloudflarestorage.com`;
      this.configured = true;
    } else {
      this.logger.warn('R2 credentials missing — provider will fall back');
      this.client = new S3Client({ region: 'auto' });
      this.bucket = '';
      this.publicUrl = '';
    }
  }

  async upload(file: Express.Multer.File, folder = 'general'): Promise<string> {
    if (!this.configured) {
      throw new Error('R2 is not configured');
    }

    const ext = path.extname(file.originalname);
    const key = `${folder}/${randomUUID()}${ext}`;

    const contentType = file.mimetype || 'application/octet-stream';

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
        ContentLength: file.size,
      }),
    );

    const url = `${this.publicUrl}/${key}`;
    this.logger.log(`[r2] Uploaded ${key} (${file.size} bytes)`);
    return url;
  }

  async getPresignedUploadUrl(
    fileName: string,
    folder = 'general',
    contentType = 'application/octet-stream',
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    if (!this.configured) {
      throw new Error('R2 is not configured');
    }

    const ext = path.extname(fileName);
    const key = `${folder}/${randomUUID()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    // Presigned URL valid for 10 minutes
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 600 });
    const publicUrl = `${this.publicUrl}/${key}`;

    this.logger.log(`[r2] Generated presigned upload URL for ${key}`);
    return { uploadUrl, publicUrl };
  }

  async delete(fileUrl: string): Promise<void> {
    if (!this.configured) return;

    try {
      const url = new URL(fileUrl);
      // Key is the path without the leading slash
      const key = url.pathname.replace(/^\//, '');

      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`[r2] Deleted ${key}`);
    } catch (err) {
      this.logger.warn(`[r2] Failed to delete ${fileUrl}: ${(err as Error).message}`);
    }
  }
}

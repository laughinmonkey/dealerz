import { Injectable } from '@nestjs/common';
import { FileStorageFactory } from './file-storage.factory';
import { PrismaService } from '../../../prisma/prisma.service';

export interface UploadOptions {
  /** Folder/category for the file (e.g., 'assets', 'kyc', 'avatars') */
  folder?: string;
  /** User who uploaded the file */
  uploadedBy?: string;
  /** Category tag for the central files table */
  category?: string;
}

/**
 * Unified file storage service.
 * Every module that needs file upload/delete injects THIS service.
 *
 * Two responsibilities:
 * 1. Upload/delete bytes via the active provider (local/Cloudinary/R2)
 * 2. Maintain a central file registry in the `files` table
 *
 * Domain-specific tables (asset_images, kyc_documents) store their own
 * metadata — the `files` table is the cross-cutting audit trail.
 */
@Injectable()
export class FileStorageService {
  constructor(
    private readonly factory: FileStorageFactory,
    private readonly prisma: PrismaService,
  ) {}

  async upload(file: Express.Multer.File, options: UploadOptions = {}): Promise<string> {
    const provider = await this.factory.getProvider();
    const folder = options.folder || 'general';
    const url = await provider.upload(file, folder);

    // Register in the central files table
    await this.prisma.file.create({
      data: {
        fileName: file.originalname,
        fileUrl: url,
        fileType: file.mimetype || 'application/octet-stream',
        fileSize: file.size,
        category: options.category || folder.toUpperCase(),
        uploadedBy: options.uploadedBy || null,
      },
    });

    return url;
  }

  async delete(fileUrl: string): Promise<void> {
    const provider = await this.factory.getProvider();
    await provider.delete(fileUrl);

    // Soft-delete from the central registry
    await this.prisma.file.updateMany({
      where: { fileUrl },
      data: { deletedAt: new Date() },
    });
  }

  /** Returns the name of the currently active provider (for logging) */
  async getProviderName(): Promise<string> {
    const provider = await this.factory.getProvider();
    return provider.name;
  }

  /**
   * Generate a presigned upload URL for direct-to-storage uploads.
   * The client uploads directly to R2/S3, bypassing the backend.
   */
  async getPresignedUploadUrl(
    fileName: string,
    folder: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    const provider = await this.factory.getProvider();

    if (!provider.getPresignedUploadUrl) {
      throw new Error(`Provider '${provider.name}' does not support presigned uploads`);
    }

    return provider.getPresignedUploadUrl(fileName, folder, contentType);
  }

  /**
   * Register a completed presigned upload in the files table.
   * Called by the client after a successful direct-to-storage upload.
   */
  async confirmUpload(
    fileUrl: string,
    metadata: { fileName: string; fileType: string; fileSize: number; category?: string; uploadedBy?: string },
  ): Promise<{ id: string }> {
    const file = await this.prisma.file.create({
      data: {
        fileName: metadata.fileName,
        fileUrl,
        fileType: metadata.fileType,
        fileSize: metadata.fileSize,
        category: metadata.category || 'GENERAL',
        uploadedBy: metadata.uploadedBy || null,
      },
    });

    return { id: file.id };
  }
}

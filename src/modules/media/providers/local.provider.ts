import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { IStorageProvider } from '../interfaces/storage-provider.interface';

/**
 * Local filesystem storage provider.
 * Stores files under /uploads/{folder}/ and serves them via the app's static assets.
 */
@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  readonly name = 'local';
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly baseDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const port = this.configService.get<string>('PORT', '3000');
    this.baseDir = path.resolve(process.cwd(), 'uploads');
    this.baseUrl = `http://localhost:${port}/uploads`;
  }

  async upload(file: Express.Multer.File, folder = 'general'): Promise<string> {
    const ext = path.extname(file.originalname);
    const filename = `${randomUUID()}${ext}`;
    const dir = path.join(this.baseDir, folder);
    const filepath = path.join(dir, filename);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(filepath, file.buffer);
    this.logger.log(`[local] Uploaded ${filename} → ${folder}/ (${file.size} bytes)`);

    return `${this.baseUrl}/${folder}/${filename}`;
  }

  async delete(fileUrl: string): Promise<void> {
    try {
      const url = new URL(fileUrl);
      const relativePath = url.pathname.replace(/^\/uploads\//, '');
      const filepath = path.join(this.baseDir, relativePath);

      if (fs.existsSync(filepath)) {
        await fs.promises.unlink(filepath);
        this.logger.log(`[local] Deleted ${relativePath}`);
      }
    } catch (err) {
      this.logger.warn(`[local] Failed to delete ${fileUrl}: ${(err as Error).message}`);
    }
  }
}

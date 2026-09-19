/**
 * Abstract file storage provider.
 * Implementations: Local, Cloudinary, Cloudflare R2.
 * The calling service never knows which provider is active.
 */
export interface IStorageProvider {
  /** Upload a file and return its public URL */
  upload(file: Express.Multer.File, folder?: string): Promise<string>;

  /** Delete a file by its URL */
  delete(fileUrl: string): Promise<void>;

  /**
   * Generate a presigned URL for direct-to-storage uploads (bypasses the backend).
   * Returns the presigned URL and the final public URL the file will have after upload.
   * Not all providers support this — unsupported providers throw.
   */
  getPresignedUploadUrl?(fileName: string, folder: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string }>;

  /** Provider name for logging/audit */
  readonly name: string;
}

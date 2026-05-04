import sharp from 'sharp';
import { ErrorCode } from '../constants/error-codes';
import { AppException } from '../exceptions/app.exception';
import type { StorageProvider } from '../../storage/storage.interface';

export const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
export const ALLOWED_AVATAR_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export interface UploadedAvatarFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export async function processAndStoreAvatar(
  storage: StorageProvider,
  userId: string,
  file: UploadedAvatarFile | undefined,
): Promise<string> {
  if (!file) {
    throw new AppException(ErrorCode.VALIDATION_FAILED, {
      message: 'No file provided.',
    });
  }
  if (!ALLOWED_AVATAR_MIME.has(file.mimetype)) {
    throw new AppException(ErrorCode.VALIDATION_FAILED, {
      message: 'Avatar must be a JPEG, PNG, or WEBP image.',
    });
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new AppException(ErrorCode.VALIDATION_FAILED, {
      message: 'Avatar exceeds 10MB.',
    });
  }

  const processed = await sharp(file.buffer)
    .rotate()
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  const key = `avatars/${userId}_${Date.now()}.webp`;
  await storage.put(key, processed, {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000, immutable',
  });
  return key;
}

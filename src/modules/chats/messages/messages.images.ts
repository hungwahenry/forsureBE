import sharp from 'sharp';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import type { StorageProvider } from '../../../storage/storage.interface';
import type { UploadedImageFile } from '../chats.interface';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_MAX_DIMENSION = 1920;

export async function processAndStoreChatImage(
  storage: StorageProvider,
  activityId: string,
  file: UploadedImageFile,
): Promise<string> {
  if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
    throw new AppException(ErrorCode.VALIDATION_FAILED, {
      message: 'Image must be JPEG, PNG, or WEBP.',
    });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new AppException(ErrorCode.VALIDATION_FAILED, {
      message: 'Image exceeds 10MB.',
    });
  }
  const processed = await sharp(file.buffer)
    .rotate()
    .resize(IMAGE_MAX_DIMENSION, IMAGE_MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();

  const key = `chat-images/${activityId}/${createId('img')}.webp`;
  await storage.put(key, processed, {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000, immutable',
  });
  return key;
}

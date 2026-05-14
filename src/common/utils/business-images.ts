import sharp from 'sharp';
import { ErrorCode } from '../constants/error-codes';
import { AppException } from '../exceptions/app.exception';
import { createId } from './id';
import type { StorageProvider } from '../../storage/storage.interface';

export const MAX_BUSINESS_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface UploadedBusinessImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

interface ProcessOpts {
  /** Long edge in pixels. */
  maxDimension: number;
  /** Storage key prefix, e.g. `business-logos/bus_…` */
  keyPrefix: string;
}

async function processAndStore(
  storage: StorageProvider,
  file: UploadedBusinessImage,
  opts: ProcessOpts,
): Promise<string> {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new AppException(ErrorCode.VALIDATION_FAILED, {
      message: 'Image must be JPEG, PNG, or WEBP.',
    });
  }
  if (file.size > MAX_BUSINESS_IMAGE_BYTES) {
    throw new AppException(ErrorCode.VALIDATION_FAILED, {
      message: 'Image exceeds 10MB.',
    });
  }
  const processed = await sharp(file.buffer)
    .rotate()
    .resize(opts.maxDimension, opts.maxDimension, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();

  const key = `${opts.keyPrefix}/${createId('img')}.webp`;
  await storage.put(key, processed, {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000, immutable',
  });
  return key;
}

export function processBusinessLogo(
  storage: StorageProvider,
  businessId: string,
  file: UploadedBusinessImage,
): Promise<string> {
  return processAndStore(storage, file, {
    maxDimension: 1024,
    keyPrefix: `business-logos/${businessId}`,
  });
}

export function processBusinessCover(
  storage: StorageProvider,
  businessId: string,
  file: UploadedBusinessImage,
): Promise<string> {
  return processAndStore(storage, file, {
    maxDimension: 1920,
    keyPrefix: `business-covers/${businessId}`,
  });
}

export function processVenuePhoto(
  storage: StorageProvider,
  venueId: string,
  file: UploadedBusinessImage,
): Promise<string> {
  return processAndStore(storage, file, {
    maxDimension: 1920,
    keyPrefix: `venue-photos/${venueId}`,
  });
}

/** For onboarding — logo uploaded before the business id exists. */
export function processBusinessLogoForUser(
  storage: StorageProvider,
  userId: string,
  file: UploadedBusinessImage,
): Promise<string> {
  return processAndStore(storage, file, {
    maxDimension: 1024,
    keyPrefix: `business-logos/onboarding/${userId}`,
  });
}

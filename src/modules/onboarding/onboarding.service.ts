import { Inject, Injectable } from '@nestjs/common';
import { Prisma, Profile, User } from '@prisma/client';
import sharp from 'sharp';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { createId } from '../../common/utils/id';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_PROVIDER_TOKEN } from '../../storage/storage.interface';
import type { StorageProvider } from '../../storage/storage.interface';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

const MIN_AGE_YEARS = 18;
const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
const ALLOWED_AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'api',
  'auth',
  'help',
  'me',
  'root',
  'system',
  'support',
  'forsure',
  'about',
  'settings',
]);

interface UploadedAvatarFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async isUsernameAvailable(username: string): Promise<boolean> {
    if (RESERVED_USERNAMES.has(username)) return false;
    const existing = await this.prisma.profile.findUnique({
      where: { username },
      select: { id: true },
    });
    return !existing;
  }

  async uploadAvatar(
    userId: string,
    file: UploadedAvatarFile | undefined,
  ): Promise<{ key: string; url: string }> {
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
      .rotate() // honor EXIF orientation before metadata is dropped
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const key = `avatars/${userId}_${Date.now()}.webp`;
    await this.storage.put(key, processed, {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    });

    return { key, url: this.storage.publicUrl(key) };
  }

  async complete(
    userId: string,
    dto: CompleteOnboardingDto,
  ): Promise<{ user: User; profile: Profile }> {
    if (calculateAge(dto.dateOfBirth) < MIN_AGE_YEARS) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'You must be 18 or older to use forsure.',
      });
    }

    if (RESERVED_USERNAMES.has(dto.username)) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'That username is reserved.',
      });
    }

    const existing = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    });
    if (existing.onboardingCompletedAt) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'Profile already exists.',
      });
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const profile = await tx.profile.create({
          data: {
            id: createId('prf'),
            userId,
            username: dto.username,
            displayName: dto.displayName,
            dateOfBirth: dto.dateOfBirth,
            gender: dto.gender,
            avatarKey: dto.avatarKey,
            locationLat: dto.location.lat,
            locationLng: dto.location.lng,
            placeName: dto.location.placeName,
          },
        });
        const user = await tx.user.update({
          where: { id: userId },
          data: { onboardingCompletedAt: new Date() },
        });
        return { user, profile };
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
          message: 'That username is taken.',
        });
      }
      throw e;
    }
  }
}

function calculateAge(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < dob.getDate())
  ) {
    age--;
  }
  return age;
}

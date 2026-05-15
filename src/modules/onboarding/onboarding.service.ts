import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import {
  processAndStoreAvatar,
  type UploadedAvatarFile,
} from '../../common/utils/avatar';
import { createId } from '../../common/utils/id';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_PROVIDER_TOKEN } from '../../storage/storage.interface';
import type { StorageProvider } from '../../storage/storage.interface';
import {
  serializeUser,
  type PublicUserDto,
} from '../auth/auth.serializer';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import {
  serializeAvatarUpload,
  serializeOnboardingProfile,
  type AvatarUploadDto,
  type OnboardingProfileDto,
} from './onboarding.serializer';

const MIN_AGE_YEARS = 18;
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
  ): Promise<AvatarUploadDto> {
    const key = await processAndStoreAvatar(this.storage, userId, file);
    return serializeAvatarUpload(this.storage, key);
  }

  async complete(
    userId: string,
    dto: CompleteOnboardingDto,
  ): Promise<{ user: PublicUserDto; profile: OnboardingProfileDto }> {
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
        return {
          user: serializeUser(this.storage, {
            ...user,
            profile: { avatarKey: profile.avatarKey },
          }),
          profile: serializeOnboardingProfile(profile),
        };
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
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

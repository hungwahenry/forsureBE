import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { FeatureFlagService } from '../../../common/feature-flags/feature-flag.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import {
  processBusinessLogoForUser,
  type UploadedBusinessImage,
} from '../../../common/utils/business-images';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../storage/storage.interface';
import {
  serializeBusinessMembership,
  type BusinessMembershipDto,
} from '../business.serializer';
import type { CreateBusinessDto } from './dto/create-business.dto';

export interface UploadResult {
  key: string;
  url: string;
}

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async createBusiness(
    userId: string,
    dto: CreateBusinessDto,
  ): Promise<BusinessMembershipDto> {
    const signupEnabled = await this.featureFlags.isEnabled(
      'business_signup_enabled',
      true,
    );
    if (!signupEnabled) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'New business signups are temporarily disabled.',
      });
    }

    const existing = await this.prisma.businessMember.findFirst({
      where: { userId },
      select: { businessId: true },
    });
    if (existing) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'You already manage a business.',
      });
    }

    const category = await this.prisma.businessCategory.findUnique({
      where: { id: dto.categoryId },
      select: { id: true, active: true },
    });
    if (!category || !category.active) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'Pick an active category.',
      });
    }

    const slug = await this.uniqueSlugFor(dto.name);

    const row = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          id: createId('bus'),
          slug,
          name: dto.name,
          categoryId: category.id,
          logoKey: dto.logoKey,
          shortDescription: dto.shortDescription,
        },
      });
      const member = await tx.businessMember.create({
        data: {
          id: createId('bmm'),
          businessId: business.id,
          userId,
          role: 'OWNER',
        },
      });
      return { ...member, business };
    });

    return serializeBusinessMembership(this.storage, row);
  }

  async uploadLogoForUser(
    userId: string,
    file: UploadedBusinessImage | undefined,
  ): Promise<UploadResult> {
    if (!file) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'No file provided.',
      });
    }
    const key = await processBusinessLogoForUser(this.storage, userId, file);
    return { key, url: this.storage.publicUrl(key) };
  }

  private async uniqueSlugFor(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'business';
    let candidate = base;
    let attempt = 0;
    while (true) {
      try {
        const taken = await this.prisma.business.findUnique({
          where: { slug: candidate },
          select: { id: true },
        });
        if (!taken) return candidate;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          // Race — fall through to a new candidate
        } else {
          throw err;
        }
      }
      attempt += 1;
      candidate = `${base}-${attempt}`;
      if (attempt > 50) {
        return `${base}-${createId('').replace(/^_/, '').slice(0, 6)}`;
      }
    }
  }
}

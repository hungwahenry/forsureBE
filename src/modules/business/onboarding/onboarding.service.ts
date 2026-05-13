import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
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

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async createBusiness(
    userId: string,
    dto: CreateBusinessDto,
  ): Promise<BusinessMembershipDto> {
    const existing = await this.prisma.businessMember.findFirst({
      where: { userId },
      select: { businessId: true },
    });
    if (existing) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: 'You already manage a business.',
      });
    }

    const slug = await this.uniqueSlugFor(dto.name);

    const row = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          id: createId('bus'),
          slug,
          name: dto.name,
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

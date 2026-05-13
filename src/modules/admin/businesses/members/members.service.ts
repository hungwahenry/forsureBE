import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../../storage/storage.interface';
import {
  serializeAdminBusinessMember,
  type AdminBusinessMemberItem,
} from './members.serializer';

@Injectable()
export class AdminBusinessMembersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async list(businessId: string): Promise<AdminBusinessMemberItem[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Business not found.',
      });
    }
    const rows = await this.prisma.businessMember.findMany({
      where: { businessId },
      include: {
        user: {
          include: {
            profile: {
              select: { username: true, displayName: true, avatarKey: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => serializeAdminBusinessMember(this.storage, row));
  }
}

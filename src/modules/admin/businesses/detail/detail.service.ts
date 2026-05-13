import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../../storage/storage.interface';
import {
  serializeAdminBusinessDetail,
  type AdminBusinessDetail,
} from './detail.serializer';

@Injectable()
export class AdminBusinessesDetailService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async detail(businessId: string): Promise<AdminBusinessDetail> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        suspendedBy: { select: { id: true, email: true } },
      },
    });
    if (!business) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Business not found.',
      });
    }

    const [members, venues, boostsActive, boostsAllTime] = await Promise.all([
      this.prisma.businessMember.count({ where: { businessId } }),
      this.prisma.businessVenue.count({ where: { businessId } }),
      this.prisma.activityBoost.count({
        where: {
          businessId,
          cancelledAt: null,
          startsAt: { lte: new Date() },
          endsAt: { gt: new Date() },
        },
      }),
      this.prisma.activityBoost.count({ where: { businessId } }),
    ]);

    return serializeAdminBusinessDetail(this.storage, business, {
      members,
      venues,
      boostsActive,
      boostsAllTime,
    });
  }
}

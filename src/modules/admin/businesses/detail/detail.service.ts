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
        category: true,
      },
    });
    if (!business) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Business not found.',
      });
    }

    const flagsCutoff = new Date(Date.now() - 30 * 86_400_000);
    const [members, venues, boostsActive, boostsAllTime, recentFlags] =
      await Promise.all([
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
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "Report" r
          JOIN "BusinessVenue" v ON v.id = r."targetId"
          WHERE r."targetType" = 'BUSINESS_VENUE'
            AND v."businessId" = ${businessId}
            AND r."createdAt" >= ${flagsCutoff}
        `,
      ]);

    return serializeAdminBusinessDetail(this.storage, business, {
      members,
      venues,
      boostsActive,
      boostsAllTime,
      recentVenueFlags: Number(recentFlags[0]?.count ?? 0),
    });
  }
}

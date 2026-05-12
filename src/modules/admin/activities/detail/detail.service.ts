import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../../storage/storage.interface';
import {
  serializeAdminActivityDetail,
  type AdminActivityDetail,
} from './detail.serializer';

@Injectable()
export class AdminActivitiesDetailService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async detail(activityId: string): Promise<AdminActivityDetail> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        participants: {
          where: { role: 'HOST' },
          take: 1,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: { username: true, displayName: true, avatarKey: true },
                },
              },
            },
          },
        },
        deletedBy: { select: { id: true, email: true } },
      },
    });
    if (!activity) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Activity not found.',
      });
    }

    const activeReports = await this.prisma.report.count({
      where: {
        targetType: 'ACTIVITY',
        targetId: activityId,
        status: 'PENDING',
      },
    });

    return serializeAdminActivityDetail(this.storage, activity, {
      activeReports,
    });
  }
}

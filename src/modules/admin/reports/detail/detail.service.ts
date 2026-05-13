import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../../storage/storage.interface';
import {
  serializeAdminReportDetail,
  type AdminReportDetail,
} from './detail.serializer';

const PROFILE_BRIEF_SELECT = {
  username: true,
  displayName: true,
  avatarKey: true,
} as const;

@Injectable()
export class AdminReportsDetailService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async detail(reportId: string): Promise<AdminReportDetail> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reason: true,
        reporter: { include: { profile: { select: PROFILE_BRIEF_SELECT } } },
      },
    });
    if (!report) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Report not found.',
      });
    }

    const targets =
      report.targetType === 'USER'
        ? {
            user: await this.prisma.user.findUnique({
              where: { id: report.targetId },
              include: { profile: true },
            }),
          }
        : report.targetType === 'ACTIVITY'
          ? {
              activity: await this.prisma.activity.findUnique({
                where: { id: report.targetId },
                include: {
                  participants: {
                    where: { role: 'HOST' },
                    include: {
                      user: {
                        include: {
                          profile: { select: PROFILE_BRIEF_SELECT },
                        },
                      },
                    },
                    take: 1,
                  },
                },
              }),
            }
          : report.targetType === 'MESSAGE'
            ? {
                message: await this.prisma.chatMessage.findUnique({
                  where: { id: report.targetId },
                  include: {
                    sender: {
                      include: { profile: { select: PROFILE_BRIEF_SELECT } },
                    },
                    activity: {
                      select: { id: true, emoji: true, title: true },
                    },
                  },
                }),
              }
            : report.targetType === 'POST'
              ? {
                  post: await this.prisma.activityPost.findUnique({
                    where: { id: report.targetId },
                    include: {
                      author: {
                        include: { profile: { select: PROFILE_BRIEF_SELECT } },
                      },
                      photos: { orderBy: { sortOrder: 'asc' } },
                      activity: {
                        select: { id: true, emoji: true, title: true },
                      },
                    },
                  }),
                }
              : report.targetType === 'BUSINESS_VENUE'
                ? {
                    businessVenue: await this.prisma.businessVenue.findUnique({
                      where: { id: report.targetId },
                      include: { business: true },
                    }),
                  }
                : {};

    const activityRow = 'activity' in targets ? targets.activity : null;
    const hostRow = activityRow?.participants?.[0]?.user ?? null;

    return serializeAdminReportDetail(this.storage, report, {
      user: 'user' in targets ? targets.user : null,
      activity: activityRow ? { ...activityRow, host: hostRow } : null,
      message: 'message' in targets ? targets.message : null,
      post: 'post' in targets ? targets.post : null,
      businessVenue:
        'businessVenue' in targets ? targets.businessVenue : null,
    });
  }
}

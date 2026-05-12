import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../../storage/storage.interface';
import {
  serializeAdminUserDetail,
  type AdminUserDetail,
} from './detail.serializer';

@Injectable()
export class AdminUsersDetailService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async detail(userId: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        suspendedBy: { select: { id: true, email: true } },
      },
    });
    if (!user) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'User not found.',
      });
    }

    const [
      activeSessions,
      reportsFiled,
      reportsAgainst,
      blocksMade,
      blocksReceived,
    ] = await Promise.all([
      this.prisma.refreshToken.count({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      }),
      this.prisma.report.count({ where: { reporterId: userId } }),
      this.prisma.report.count({
        where: { targetType: 'USER', targetId: userId },
      }),
      this.prisma.userBlock.count({ where: { blockerId: userId } }),
      this.prisma.userBlock.count({ where: { blockedId: userId } }),
    ]);

    return serializeAdminUserDetail(this.storage, user, {
      activeSessions,
      reportsFiled,
      reportsAgainst,
      blocksMade,
      blocksReceived,
    });
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../../../storage/storage.interface';
import {
  serializeAdminPostDetail,
  type AdminPostDetail,
} from './detail.serializer';

@Injectable()
export class AdminPostsDetailService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async detail(postId: string): Promise<AdminPostDetail> {
    const post = await this.prisma.activityPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { username: true, displayName: true, avatarKey: true },
            },
          },
        },
        photos: { orderBy: { sortOrder: 'asc' } },
        activity: {
          select: { id: true, emoji: true, title: true, status: true },
        },
        deletedBy: { select: { id: true, email: true } },
      },
    });
    if (!post) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Post not found.',
      });
    }
    const activeReports = await this.prisma.report.count({
      where: {
        targetType: 'POST',
        targetId: postId,
        status: 'PENDING',
      },
    });
    return serializeAdminPostDetail(this.storage, post, { activeReports });
  }
}

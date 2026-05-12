import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import { STORAGE_PROVIDER_TOKEN } from '../../../storage/storage.interface';
import type { StorageProvider } from '../../../storage/storage.interface';
import { BlocksService } from '../../blocks/blocks.service';
import {
  serializeActivityPreview,
  type ActivityPreviewDto,
} from './preview.serializer';

@Injectable()
export class ActivityPreviewService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
    private readonly blocks: BlocksService,
  ) {}

  /** Public-facing summary of an activity. Visible to any authenticated user;
   *  used for share-link landing pages. */
  async getPreview(
    viewerId: string,
    activityId: string,
  ): Promise<ActivityPreviewDto> {
    const [activity, blockedIds] = await Promise.all([
      this.prisma.activity.findUnique({
        where: { id: activityId },
        include: {
          participants: {
            include: { user: { include: { profile: true } } },
            orderBy: { joinedAt: 'asc' },
          },
        },
      }),
      this.blocks.listEitherBlockedUserIds(viewerId),
    ]);

    if (!activity || activity.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }

    return serializeActivityPreview(
      this.storage,
      viewerId,
      activity,
      new Set(blockedIds),
    );
  }
}

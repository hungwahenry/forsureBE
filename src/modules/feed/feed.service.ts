import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../common/constants/error-codes';
import type { CursorPage } from '../../common/dto/pagination.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_PROVIDER_TOKEN } from '../../storage/storage.interface';
import type { StorageProvider } from '../../storage/storage.interface';
import { activityVisibleGenderPreferences } from '../activities/gender-policy';
import { FeedQueryDto } from './dto/feed.dto';
import { decodeFeedCursor, encodeFeedCursor } from './feed.cursor';
import { findFeedPage } from './feed.queries';
import { serializeFeedItem, type FeedItem } from './feed.serializer';

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
  ) {}

  async getFeed(
    viewerUserId: string,
    query: FeedQueryDto,
  ): Promise<CursorPage<FeedItem>> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: viewerUserId },
      select: { gender: true },
    });
    if (!profile) {
      throw new AppException(ErrorCode.ONBOARDING_REQUIRED);
    }

    const cursor = query.cursor ? decodeFeedCursor(query.cursor) : null;
    const limit = query.limit;
    const visibleGenderPrefs = activityVisibleGenderPreferences(profile.gender);

    // Fetch limit + 1 to detect hasMore.
    const rows = await findFeedPage(this.prisma, {
      viewerUserId,
      lat: query.lat,
      lng: query.lng,
      radiusMeters: query.radiusKm * 1000,
      visibleGenderPrefs,
      cursor,
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeFeedCursor({
            bucket: Number(last.bucket),
            distanceKm: Number(last.distanceKm),
            id: last.id,
          })
        : null;

    return {
      items: page.map((r) => serializeFeedItem(this.storage, r)),
      pageInfo: { nextCursor, hasMore },
    };
  }
}

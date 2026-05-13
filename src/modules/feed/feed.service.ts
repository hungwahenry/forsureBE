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
import type { FeedRow } from './feed.interface';
import { findActiveBoosts, findFeedPage } from './feed.queries';
import { serializeFeedItem, type FeedItem } from './feed.serializer';

const ORGANIC_PER_SPONSORED = 5;
const BOOSTS_PER_PAGE = 3;

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
    const radiusMeters = query.radiusKm * 1000;
    const isFirstPage = !cursor;

    const [rows, boostRows] = await Promise.all([
      findFeedPage(this.prisma, {
        viewerUserId,
        lat: query.lat,
        lng: query.lng,
        radiusMeters,
        visibleGenderPrefs,
        cursor,
        limit: limit + 1,
      }),
      isFirstPage
        ? findActiveBoosts(this.prisma, {
            viewerUserId,
            lat: query.lat,
            lng: query.lng,
            viewerRadiusMeters: radiusMeters,
            visibleGenderPrefs,
            limit: BOOSTS_PER_PAGE,
          })
        : Promise.resolve<FeedRow[]>([]),
    ]);

    const hasMore = rows.length > limit;
    const organicPage = hasMore ? rows.slice(0, limit) : rows;
    const last = organicPage[organicPage.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeFeedCursor({
            bucket: Number(last.bucket),
            distanceKm: Number(last.distanceKm),
            id: last.id,
          })
        : null;

    const boostByActivityId = new Map(
      boostRows.flatMap((r) => (r.boost ? [[r.id, r.boost] as const] : [])),
    );
    const annotatedOrganic = organicPage.map((r) => {
      const boost = boostByActivityId.get(r.id);
      if (!boost) return r;
      boostByActivityId.delete(r.id);
      return { ...r, boost };
    });
    const remainingBoosts = boostRows.filter((b) =>
      boostByActivityId.has(b.id),
    );
    const merged = interleaveWithBoosts(annotatedOrganic, remainingBoosts);

    return {
      items: merged.map((r) => serializeFeedItem(this.storage, r)),
      pageInfo: { nextCursor, hasMore },
    };
  }
}

function interleaveWithBoosts(
  organic: FeedRow[],
  boosts: FeedRow[],
): FeedRow[] {
  if (boosts.length === 0) return organic;
  const result: FeedRow[] = [];
  let oIdx = 0;
  let bIdx = 0;
  while (oIdx < organic.length || bIdx < boosts.length) {
    const isSponsoredSlot =
      result.length > 0 &&
      result.length % (ORGANIC_PER_SPONSORED + 1) === ORGANIC_PER_SPONSORED;
    if (isSponsoredSlot && bIdx < boosts.length) {
      result.push(boosts[bIdx++]);
    } else if (oIdx < organic.length) {
      result.push(organic[oIdx++]);
    } else {
      result.push(boosts[bIdx++]);
    }
  }
  return result;
}

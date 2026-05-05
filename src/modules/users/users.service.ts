import { Inject, Injectable } from '@nestjs/common';
import { ActivityRole, ActivityStatus, PostVisibility } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import type { CursorPage } from '../../common/dto/pagination.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProvider,
} from '../../storage/storage.interface';
import { decodeTsIdCursor, encodeTsIdCursor } from '../../common/utils/cursor';
import { BlocksService } from '../blocks/blocks.service';
import { ListUserActivitiesDto } from './dto/list-user-activities.dto';
import { ListUserPostsDto } from './dto/list-user-posts.dto';
import {
  serializeMyProfile,
  serializePublicProfile,
  serializeUserActivity,
  serializeUserPost,
  type MyProfileDto,
  type PublicProfileDto,
  type UserActivityDto,
  type UserActivityRow,
  type UserPostDto,
  type UserPostRow,
} from './users.serializer';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProvider,
    private readonly blocks: BlocksService,
  ) {}

  async getMyProfile(viewerUserId: string): Promise<MyProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: viewerUserId },
      include: { profile: true },
    });
    if (!user) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }
    return serializeMyProfile(this.storage, user);
  }

  async getProfileByUsername(
    viewerUserId: string,
    username: string,
  ): Promise<MyProfileDto | PublicProfileDto> {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      include: { user: { include: { profile: true } } },
    });
    if (!profile) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'No user with that username.',
      });
    }
    if (profile.userId === viewerUserId) {
      return serializeMyProfile(this.storage, profile.user);
    }
    if (await this.blocks.isEitherBlocked(viewerUserId, profile.userId)) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'No user with that username.',
      });
    }
    return serializePublicProfile(this.storage, profile.user);
  }

  async listPostsByUsername(
    viewerUserId: string,
    username: string,
    query: ListUserPostsDto,
  ): Promise<CursorPage<UserPostDto>> {
    const target = await this.prisma.profile.findUnique({
      where: { username },
      select: { userId: true },
    });
    if (!target) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'No user with that username.',
      });
    }
    const isSelf = target.userId === viewerUserId;
    if (
      !isSelf &&
      (await this.blocks.isEitherBlocked(viewerUserId, target.userId))
    ) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'No user with that username.',
      });
    }
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const rows = (await this.prisma.activityPost.findMany({
      where: {
        authorId: target.userId,
        ...(isSelf
          ? {}
          : {
              visibility: PostVisibility.PUBLIC,
              activity: {
                status: 'DONE',
                memoriesShareablePublicly: true,
              },
            }),
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.ts) } },
                {
                  createdAt: new Date(cursor.ts),
                  id: { lt: cursor.id },
                },
              ],
            }
          : {}),
      },
      include: {
        photos: true,
        activity: {
          select: {
            id: true,
            emoji: true,
            title: true,
            startsAt: true,
            placeName: true,
            participantCount: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    })) as UserPostRow[];

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeTsIdCursor({
            ts: last.createdAt.getTime(),
            id: last.id,
          })
        : null;

    return {
      items: page.map((p) => serializeUserPost(this.storage, p)),
      pageInfo: { nextCursor, hasMore },
    };
  }

  async listActivitiesByUsername(
    viewerUserId: string,
    username: string,
    query: ListUserActivitiesDto,
  ): Promise<CursorPage<UserActivityDto>> {
    const target = await this.prisma.profile.findUnique({
      where: { username },
      select: { userId: true },
    });
    if (!target) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'No user with that username.',
      });
    }
    const isSelf = target.userId === viewerUserId;
    if (
      !isSelf &&
      (await this.blocks.isEitherBlocked(viewerUserId, target.userId))
    ) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'No user with that username.',
      });
    }
    const cursor = query.cursor ? decodeTsIdCursor(query.cursor) : null;

    const rows = (await this.prisma.activityParticipant.findMany({
      where: {
        userId: target.userId,
        ...(isSelf ? {} : { role: ActivityRole.HOST }),
        activity: {
          status: ActivityStatus.DONE,
          ...(cursor ? { startsAt: { lt: new Date(cursor.ts) } } : {}),
        },
      },
      include: {
        activity: {
          select: {
            id: true,
            emoji: true,
            title: true,
            startsAt: true,
            placeName: true,
            status: true,
            participantCount: true,
          },
        },
      },
      orderBy: { activity: { startsAt: 'desc' } },
      take: query.limit + 1,
    })) as UserActivityRow[];

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeTsIdCursor({
            ts: last.activity.startsAt.getTime(),
            id: last.activity.id,
          })
        : null;

    return {
      items: page.map((p) => serializeUserActivity(p)),
      pageInfo: { nextCursor, hasMore },
    };
  }
}

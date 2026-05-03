import type {
  Activity,
  ActivityPost,
  ActivityPostPhoto,
  ActivityRole,
  Profile,
  User,
} from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import type { StorageProvider } from '../../storage/storage.interface';
import type {
  ActivityPostAuthorDto,
  ActivityPostPhotoDto,
} from '../activities/posts/posts.serializer';

export interface ExplorePostActivityDto {
  id: string;
  emoji: string;
  title: string;
  startsAt: string;
  placeName: string;
  hostUsername: string;
  participantCount: number;
  participantAvatarUrls: string[];
}

export interface ExplorePostDto {
  id: string;
  caption: string | null;
  createdAt: string;
  author: ActivityPostAuthorDto;
  photos: ActivityPostPhotoDto[];
  activity: ExplorePostActivityDto;
}

export type ExplorePostRow = ActivityPost & {
  photos: ActivityPostPhoto[];
  author: User & { profile: Profile | null };
  activity: Pick<
    Activity,
    'id' | 'emoji' | 'title' | 'startsAt' | 'placeName' | 'participantCount'
  > & {
    participants: Array<{
      role: ActivityRole;
      user: {
        profile: { username: string; avatarKey: string } | null;
      };
    }>;
  };
};

export function serializeExplorePost(
  storage: StorageProvider,
  p: ExplorePostRow,
): ExplorePostDto {
  if (!p.author.profile) {
    throw new AppException(ErrorCode.INTERNAL_ERROR, {
      message: 'Post author is missing a profile.',
    });
  }
  const host = p.activity.participants.find((part) => part.role === 'HOST');
  if (!host?.user.profile) {
    throw new AppException(ErrorCode.INTERNAL_ERROR, {
      message: 'Activity is missing a host profile.',
    });
  }
  const participantAvatarUrls = p.activity.participants
    .filter((part) => part.user.profile != null)
    .map((part) => storage.publicUrl(part.user.profile!.avatarKey));
  return {
    id: p.id,
    caption: p.caption,
    createdAt: p.createdAt.toISOString(),
    author: {
      id: p.author.id,
      username: p.author.profile.username,
      displayName: p.author.profile.displayName,
      avatarUrl: storage.publicUrl(p.author.profile.avatarKey),
    },
    photos: [...p.photos]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((photo) => ({
        id: photo.id,
        imageUrl: storage.publicUrl(photo.imageKey),
        sortOrder: photo.sortOrder,
      })),
    activity: {
      id: p.activity.id,
      emoji: p.activity.emoji,
      title: p.activity.title,
      startsAt: p.activity.startsAt.toISOString(),
      placeName: p.activity.placeName,
      hostUsername: host.user.profile.username,
      participantCount: p.activity.participantCount,
      participantAvatarUrls,
    },
  };
}

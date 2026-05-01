import type {
  ActivityPost,
  ActivityPostPhoto,
  PostVisibility,
  Profile,
  User,
} from '@prisma/client';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import type { StorageProvider } from '../../../storage/storage.interface';

export interface ActivityPostPhotoDto {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

export interface ActivityPostAuthorDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export interface ActivityPostDto {
  id: string;
  activityId: string;
  caption: string | null;
  visibility: PostVisibility;
  createdAt: string;
  updatedAt: string;
  author: ActivityPostAuthorDto;
  photos: ActivityPostPhotoDto[];
}

export type PostWithRelations = ActivityPost & {
  photos: ActivityPostPhoto[];
  author: User & { profile: Profile | null };
};

export function serializePost(
  storage: StorageProvider,
  p: PostWithRelations,
): ActivityPostDto {
  if (!p.author.profile) {
    throw new AppException(ErrorCode.INTERNAL_ERROR, {
      message: 'Post author is missing a profile.',
    });
  }
  return {
    id: p.id,
    activityId: p.activityId,
    caption: p.caption,
    visibility: p.visibility,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
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
  };
}

export const postInclude = {
  photos: true,
  author: { include: { profile: true } },
} as const;

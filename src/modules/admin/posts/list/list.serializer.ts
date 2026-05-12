import type {
  Activity,
  ActivityPost,
  ActivityPostPhoto,
  Profile,
  User,
} from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminPostListItem {
  id: string;
  caption: string | null;
  visibility: ActivityPost['visibility'];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  photoCount: number;
  coverPhotoUrl: string | null;
  author: {
    id: string;
    email: string;
    profile: {
      username: string;
      displayName: string;
      avatarUrl: string;
    } | null;
  } | null;
  activity: {
    id: string;
    emoji: string;
    title: string;
  };
}

type Row = ActivityPost & {
  author:
    | (Pick<User, 'id' | 'email'> & {
        profile: Pick<Profile, 'username' | 'displayName' | 'avatarKey'> | null;
      })
    | null;
  photos: Pick<ActivityPostPhoto, 'imageKey'>[];
  _count: { photos: number };
  activity: Pick<Activity, 'id' | 'emoji' | 'title'>;
};

export function serializeAdminPostListItem(
  storage: StorageProvider,
  row: Row,
): AdminPostListItem {
  const cover = row.photos[0];
  return {
    id: row.id,
    caption: row.caption,
    visibility: row.visibility,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    photoCount: row._count.photos,
    coverPhotoUrl: cover ? storage.publicUrl(cover.imageKey) : null,
    author: row.author
      ? {
          id: row.author.id,
          email: row.author.email,
          profile: row.author.profile
            ? {
                username: row.author.profile.username,
                displayName: row.author.profile.displayName,
                avatarUrl: storage.publicUrl(row.author.profile.avatarKey),
              }
            : null,
        }
      : null,
    activity: row.activity,
  };
}

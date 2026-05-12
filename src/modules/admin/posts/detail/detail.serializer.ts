import type {
  Activity,
  ActivityPost,
  ActivityPostPhoto,
  Profile,
  User,
} from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminPostDetail {
  id: string;
  caption: string | null;
  visibility: ActivityPost['visibility'];
  createdAt: string;
  updatedAt: string;
  deletion: {
    deletedAt: string;
    deletedReason: string | null;
    deletedBy: { id: string; email: string } | null;
  } | null;
  photos: Array<{ id: string; url: string; sortOrder: number }>;
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
    status: Activity['status'];
  };
  counts: { activeReports: number };
}

type Row = ActivityPost & {
  author:
    | (Pick<User, 'id' | 'email'> & {
        profile: Pick<Profile, 'username' | 'displayName' | 'avatarKey'> | null;
      })
    | null;
  photos: Pick<ActivityPostPhoto, 'id' | 'imageKey' | 'sortOrder'>[];
  activity: Pick<Activity, 'id' | 'emoji' | 'title' | 'status'>;
  deletedBy: Pick<User, 'id' | 'email'> | null;
};

export function serializeAdminPostDetail(
  storage: StorageProvider,
  row: Row,
  counts: { activeReports: number },
): AdminPostDetail {
  return {
    id: row.id,
    caption: row.caption,
    visibility: row.visibility,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletion: row.deletedAt
      ? {
          deletedAt: row.deletedAt.toISOString(),
          deletedReason: row.deletedReason,
          deletedBy: row.deletedBy,
        }
      : null,
    photos: row.photos.map((p) => ({
      id: p.id,
      url: storage.publicUrl(p.imageKey),
      sortOrder: p.sortOrder,
    })),
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
    counts,
  };
}

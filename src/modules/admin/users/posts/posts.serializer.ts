import type { Activity, ActivityPost, ActivityPostPhoto } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminUserPostItem {
  id: string;
  caption: string | null;
  visibility: ActivityPost['visibility'];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  photoCount: number;
  coverPhotoUrl: string | null;
  activity: {
    id: string;
    emoji: string;
    title: string;
  };
}

type Row = ActivityPost & {
  activity: Pick<Activity, 'id' | 'emoji' | 'title'>;
  photos: Pick<ActivityPostPhoto, 'imageKey'>[];
  _count: { photos: number };
};

export function serializeAdminUserPost(
  storage: StorageProvider,
  row: Row,
): AdminUserPostItem {
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
    activity: row.activity,
  };
}

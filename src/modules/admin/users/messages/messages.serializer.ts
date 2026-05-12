import type { Activity, ChatMessage } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminUserMessageItem {
  id: string;
  kind: ChatMessage['kind'];
  body: string | null;
  imageUrl: string | null;
  parentMessageId: string | null;
  createdAt: string;
  deletedAt: string | null;
  activity: {
    id: string;
    emoji: string;
    title: string;
  };
}

type Row = ChatMessage & {
  activity: Pick<Activity, 'id' | 'emoji' | 'title'>;
};

export function serializeAdminUserMessage(
  storage: StorageProvider,
  row: Row,
): AdminUserMessageItem {
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    imageUrl: row.imageKey ? storage.publicUrl(row.imageKey) : null,
    parentMessageId: row.parentMessageId,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    activity: row.activity,
  };
}

import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import type { StorageProvider } from '../../../storage/storage.interface';
import type { ChatMessageDto } from '../chats.interface';
import type { MessageWithRelations } from './messages.queries';

export function serializeMessage(
  storage: StorageProvider,
  m: MessageWithRelations,
): ChatMessageDto {
  if (!m.sender.profile) {
    throw new AppException(ErrorCode.INTERNAL_ERROR, {
      message: 'Message sender is missing a profile.',
    });
  }
  return {
    id: m.id,
    activityId: m.activityId,
    kind: m.kind,
    body: m.body,
    imageUrl: m.imageKey ? storage.publicUrl(m.imageKey) : null,
    createdAt: m.createdAt.toISOString(),
    sender: {
      id: m.sender.id,
      username: m.sender.profile.username,
      displayName: m.sender.profile.displayName,
      avatarUrl: storage.publicUrl(m.sender.profile.avatarKey),
    },
    parent: m.parent
      ? {
          id: m.parent.id,
          body: m.parent.body,
          hasImage: m.parent.imageKey != null,
          sender: {
            id: m.parent.sender.id,
            username: m.parent.sender.profile?.username ?? '',
          },
        }
      : null,
  };
}

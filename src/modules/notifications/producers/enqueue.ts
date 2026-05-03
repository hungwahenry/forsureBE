import { Logger } from '@nestjs/common';
import type { NotificationEventCode } from '../../../common/constants/notification-events';
import type { NotificationsQueue } from '../queue/notifications.queue';

const log = new Logger('NotificationProducer');

interface BuiltJob {
  recipientUserIds: string[];
  payload: Record<string, unknown>;
  dedupKey?: string;
  retainCompletedSeconds?: number;
}

export async function enqueueIfBuilt(
  queue: NotificationsQueue,
  event: NotificationEventCode,
  build: () => Promise<BuiltJob | null>,
): Promise<void> {
  try {
    const built = await build();
    if (!built) return;
    await queue.enqueue(
      {
        event,
        recipientUserIds: built.recipientUserIds,
        payload: built.payload,
      },
      {
        dedupKey: built.dedupKey,
        retainCompletedSeconds: built.retainCompletedSeconds,
      },
    );
  } catch (err) {
    log.error({ err, event }, 'Failed to enqueue notification');
  }
}

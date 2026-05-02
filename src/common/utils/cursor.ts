import { ErrorCode } from '../constants/error-codes';
import { AppException } from '../exceptions/app.exception';

/**
 * Generic base64url + JSON cursor encoder. Use directly when a module needs
 * a cursor shape different from the standard `{ ts, id }` (e.g. feed).
 */
export function encodeCursor<T>(value: T): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function decodeCursor<T>(
  raw: string,
  validate: (parsed: unknown) => parsed is T,
): T {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (!validate(parsed)) throw new Error('malformed cursor');
    return parsed;
  } catch {
    throw new AppException(ErrorCode.VALIDATION_FAILED, {
      message: 'Invalid cursor.',
    });
  }
}

/**
 * Standard chronological cursor — millisecond timestamp + id tiebreaker.
 * Used wherever the listing is ordered by `createdAt` (or `startsAt`) DESC
 * with `id` as the secondary sort key. Shared by chats/messages, explore,
 * users posts, users activities.
 */
export interface TimestampIdCursor {
  ts: number;
  id: string;
}

export function encodeTsIdCursor(cursor: TimestampIdCursor): string {
  return encodeCursor(cursor);
}

export function decodeTsIdCursor(raw: string): TimestampIdCursor {
  return decodeCursor<TimestampIdCursor>(raw, (p): p is TimestampIdCursor => {
    if (typeof p !== 'object' || p === null) return false;
    const o = p as Record<string, unknown>;
    return typeof o.ts === 'number' && typeof o.id === 'string';
  });
}

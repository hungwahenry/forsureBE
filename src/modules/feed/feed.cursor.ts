import { decodeCursor, encodeCursor } from '../../common/utils/cursor';

export interface FeedCursor {
  bucket: number;
  distanceKm: number;
  id: string;
}

export function encodeFeedCursor(cursor: FeedCursor): string {
  return encodeCursor(cursor);
}

export function decodeFeedCursor(raw: string): FeedCursor {
  return decodeCursor<FeedCursor>(raw, (p): p is FeedCursor => {
    if (typeof p !== 'object' || p === null) return false;
    const o = p as Record<string, unknown>;
    return (
      typeof o.bucket === 'number' &&
      typeof o.distanceKm === 'number' &&
      typeof o.id === 'string'
    );
  });
}

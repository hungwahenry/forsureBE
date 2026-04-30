import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';

/**
 * Composite sort key encoded into the feed cursor.
 */
export interface FeedCursor {
  bucket: number;
  distanceKm: number;
  id: string;
}

export function encodeFeedCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeFeedCursor(raw: string): FeedCursor {
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Partial<FeedCursor>;
    if (
      typeof parsed.bucket !== 'number' ||
      typeof parsed.distanceKm !== 'number' ||
      typeof parsed.id !== 'string'
    ) {
      throw new Error('malformed cursor');
    }
    return parsed as FeedCursor;
  } catch {
    throw new AppException(ErrorCode.VALIDATION_FAILED, {
      message: 'Invalid cursor.',
    });
  }
}

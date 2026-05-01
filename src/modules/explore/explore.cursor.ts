import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';

export interface ExploreCursor {
  createdAtMs: number;
  id: string;
}

export function encodeExploreCursor(cursor: ExploreCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeExploreCursor(raw: string): ExploreCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8'),
    ) as Partial<ExploreCursor>;
    if (
      typeof parsed.createdAtMs !== 'number' ||
      typeof parsed.id !== 'string'
    ) {
      throw new Error('malformed cursor');
    }
    return parsed as ExploreCursor;
  } catch {
    throw new AppException(ErrorCode.VALIDATION_FAILED, {
      message: 'Invalid cursor.',
    });
  }
}

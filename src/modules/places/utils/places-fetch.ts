import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';

const TIMEOUT_MS = 8_000;

// `fetch` with an 8s timeout + clean AppException on network/timeout failures.
// Non-2xx responses are NOT translated — callers handle status-based errors.
export async function placesFetch(
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new AppException(ErrorCode.INTERNAL_ERROR, {
      message: 'Place search is unavailable. Try again in a moment.',
    });
  } finally {
    clearTimeout(timer);
  }
}

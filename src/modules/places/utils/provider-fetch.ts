import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';

const TIMEOUT_MS = 8_000;

/**
 * `fetch` wrapper for places-provider HTTP calls. Adds an 8 s timeout via
 * AbortController and translates network/timeout failures into a clean
 * AppException so callers don't have to repeat the same try/catch.
 *
 * Non-2xx responses are NOT translated here — callers handle status-based
 * errors (e.g. parsing the provider's own error envelope).
 */
export async function providerFetch(
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

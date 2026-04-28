import { HttpException } from '@nestjs/common';
import {
  DefaultErrorMessages,
  ErrorCode,
  ErrorStatusMap,
} from '../constants/error-codes';

export interface AppExceptionOptions {
  message?: string;
  details?: unknown;
  cause?: unknown;
}

/**
 * Throw this anywhere in the app instead of HttpException directly.
 * The global exception filter unwraps it into the standard error envelope.
 */
export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(code: ErrorCode, options: AppExceptionOptions = {}) {
    const status = ErrorStatusMap[code];
    const message = options.message ?? DefaultErrorMessages[code];
    super({ code, message }, status, { cause: options.cause });
    this.code = code;
    this.details = options.details;
  }
}

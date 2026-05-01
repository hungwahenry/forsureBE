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

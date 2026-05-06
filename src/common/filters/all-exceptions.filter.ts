import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  ValidationError,
} from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { Request, Response } from 'express';
import {
  DefaultErrorMessages,
  ErrorCode,
  ErrorStatusMap,
} from '../constants/error-codes';
import { AppException } from '../exceptions/app.exception';

interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: { requestId: string };
}

interface NestValidationErrorBody {
  message: string | (string | ValidationError)[];
  error?: string;
  statusCode?: number;
}

const BAD_REQUEST: number = HttpStatus.BAD_REQUEST;

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  [HttpStatus.UNAUTHORIZED]: ErrorCode.AUTH_UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.AUTH_FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.RESOURCE_CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { status, body } = this.toEnvelope(exception, req.requestId);

    if (status >= 500) {
      this.logger.error(
        {
          requestId: req.requestId,
          path: req.url,
          method: req.method,
          err: this.serializeError(exception),
        },
        'Unhandled exception',
      );
    }

    res.status(status).json(body);
  }

  private toEnvelope(
    exception: unknown,
    requestId: string,
  ): { status: number; body: ErrorEnvelope } {
    if (exception instanceof AppException) {
      return {
        status: ErrorStatusMap[exception.code],
        body: {
          success: false,
          error: {
            code: exception.code,
            message: exception.message,
            details: exception.details,
          },
          meta: { requestId },
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      return this.fromHttpException(status, response, requestId);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: DefaultErrorMessages.INTERNAL_ERROR,
        },
        meta: { requestId },
      },
    };
  }

  private fromHttpException(
    status: number,
    response: string | object,
    requestId: string,
  ): { status: number; body: ErrorEnvelope } {
    if (typeof response === 'string') {
      return {
        status,
        body: {
          success: false,
          error: { code: this.codeForStatus(status), message: response },
          meta: { requestId },
        },
      };
    }

    const body = response as NestValidationErrorBody & {
      code?: string;
      message?: unknown;
    };

    if (status === BAD_REQUEST && Array.isArray(body.message)) {
      return {
        status,
        body: {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_FAILED,
            message: DefaultErrorMessages.VALIDATION_FAILED,
            details: body.message,
          },
          meta: { requestId },
        },
      };
    }

    const message =
      typeof body.message === 'string'
        ? body.message
        : (body.error ?? this.defaultMessageForStatus(status));

    return {
      status,
      body: {
        success: false,
        error: {
          code: body.code ?? this.codeForStatus(status),
          message,
        },
        meta: { requestId },
      },
    };
  }

  private codeForStatus(status: number): string {
    const mapped = STATUS_TO_CODE[status];
    if (mapped) return mapped;
    return status >= 500 ? ErrorCode.INTERNAL_ERROR : `HTTP_${status}`;
  }

  private defaultMessageForStatus(status: number): string {
    const code = this.codeForStatus(status);
    return code in DefaultErrorMessages
      ? DefaultErrorMessages[code as ErrorCode]
      : 'Request failed.';
  }

  private serializeError(err: unknown): Record<string, unknown> {
    if (err instanceof Error) {
      return { name: err.name, message: err.message, stack: err.stack };
    }
    return { value: String(err) };
  }
}

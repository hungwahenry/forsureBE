import { HttpStatus } from '@nestjs/common';

export const ErrorCode = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  VALIDATION_FAILED: 'VALIDATION_FAILED',

  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ErrorStatusMap: Record<ErrorCode, HttpStatus> = {
  AUTH_INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  AUTH_TOKEN_EXPIRED: HttpStatus.UNAUTHORIZED,
  AUTH_TOKEN_INVALID: HttpStatus.UNAUTHORIZED,
  AUTH_UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  AUTH_FORBIDDEN: HttpStatus.FORBIDDEN,

  VALIDATION_FAILED: HttpStatus.BAD_REQUEST,

  RESOURCE_NOT_FOUND: HttpStatus.NOT_FOUND,
  RESOURCE_CONFLICT: HttpStatus.CONFLICT,

  RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
  INTERNAL_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
};

export const DefaultErrorMessages: Record<ErrorCode, string> = {
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password.',
  AUTH_TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  AUTH_TOKEN_INVALID: 'Authentication token is invalid.',
  AUTH_UNAUTHORIZED: 'Authentication required.',
  AUTH_FORBIDDEN: 'You do not have permission to perform this action.',

  VALIDATION_FAILED: 'Request validation failed.',

  RESOURCE_NOT_FOUND: 'The requested resource was not found.',
  RESOURCE_CONFLICT:
    'The request conflicts with the current state of the resource.',

  RATE_LIMITED: 'Too many requests. Please slow down.',
  INTERNAL_ERROR: 'Something went wrong on our end.',
};

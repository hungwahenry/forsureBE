import type { AppConfig } from '@prisma/client';
import { ErrorCode } from '../constants/error-codes';
import { AppException } from '../exceptions/app.exception';

export function validateConfigValue(
  row: AppConfig,
  value: unknown,
): number | boolean | string {
  if (row.valueType === 'BOOLEAN') {
    if (typeof value !== 'boolean') {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: `${row.label} must be true or false.`,
      });
    }
    return value;
  }

  if (row.valueType === 'STRING') {
    if (typeof value !== 'string') {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: `${row.label} must be text.`,
      });
    }
    return value;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AppException(ErrorCode.VALIDATION_FAILED, {
      message: `${row.label} must be a number.`,
    });
  }
  if (row.valueType === 'INT' && !Number.isInteger(value)) {
    throw new AppException(ErrorCode.VALIDATION_FAILED, {
      message: `${row.label} must be a whole number.`,
    });
  }
  if (row.minValue !== null && value < row.minValue) {
    throw new AppException(ErrorCode.VALIDATION_FAILED, {
      message: `${row.label} cannot be below ${row.minValue}.`,
    });
  }
  if (row.maxValue !== null && value > row.maxValue) {
    throw new AppException(ErrorCode.VALIDATION_FAILED, {
      message: `${row.label} cannot be above ${row.maxValue}.`,
    });
  }
  return value;
}

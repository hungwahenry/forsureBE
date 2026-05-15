import { ErrorCode } from '../constants/error-codes';
import { AppException } from '../exceptions/app.exception';
import { generateOtp, sha256 } from './crypto';
import { OTP_TTL_MIN, verifyOtp } from './otp';

interface ChallengeRow {
  id: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
}

export async function buildOtpChallenge<C extends { id: string }>(args: {
  invalidatePrior: () => Promise<void>;
  create: (codeHash: string, expiresAt: Date) => Promise<C>;
}): Promise<{ challenge: C; code: string }> {
  await args.invalidatePrior();
  const code = generateOtp();
  const challenge = await args.create(
    sha256(code),
    new Date(Date.now() + OTP_TTL_MIN * 60_000),
  );
  return { challenge, code };
}

export async function handleOtpVerification(args: {
  challenge: ChallengeRow;
  candidate: string;
  incrementAttempts: () => Promise<void>;
  markConsumed: () => Promise<void>;
  mismatchMessage?: string;
}): Promise<void> {
  const result = verifyOtp({
    storedHash: args.challenge.codeHash,
    attempts: args.challenge.attempts,
    expiresAt: args.challenge.expiresAt,
    candidate: args.candidate,
  });
  if (result.ok) return;

  if (result.reason === 'MISMATCH') {
    await args.incrementAttempts();
    throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS, {
      message: args.mismatchMessage ?? 'Incorrect code.',
    });
  }

  await args.markConsumed();
  throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS, {
    message:
      result.reason === 'EXPIRED'
        ? 'Code expired. Request a new one.'
        : 'Too many attempts. Request a new code.',
  });
}

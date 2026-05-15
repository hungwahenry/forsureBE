import { sha256 } from './crypto';

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'EXPIRED' | 'TOO_MANY_ATTEMPTS' | 'MISMATCH' };

interface VerifyOtpArgs {
  storedHash: string;
  attempts: number;
  expiresAt: Date;
  candidate: string;
  maxAttempts: number;
}

export function verifyOtp(args: VerifyOtpArgs): OtpVerifyResult {
  if (args.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'EXPIRED' };
  }
  if (args.attempts >= args.maxAttempts) {
    return { ok: false, reason: 'TOO_MANY_ATTEMPTS' };
  }
  if (sha256(args.candidate) !== args.storedHash) {
    return { ok: false, reason: 'MISMATCH' };
  }
  return { ok: true };
}

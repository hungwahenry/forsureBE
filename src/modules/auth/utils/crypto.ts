import { createHash, randomBytes, randomInt } from 'crypto';

/** SHA-256 hash, hex-encoded. Used for OTP and refresh-token storage. */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Cryptographically random 6-digit OTP, zero-padded. */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Opaque refresh token: 32 random bytes, hex-encoded (64 chars). */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

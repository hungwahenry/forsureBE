import { createHash, randomBytes, randomInt } from 'crypto';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

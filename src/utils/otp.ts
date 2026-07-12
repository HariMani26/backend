import crypto from 'crypto';

import { env } from '@config/env';

/** Cryptographically-random numeric OTP, zero-padded to OTP_LENGTH digits. */
export function generateOtpCode(): string {
  const max = 10 ** env.OTP_LENGTH;
  const value = crypto.randomInt(0, max);
  return value.toString().padStart(env.OTP_LENGTH, '0');
}

export function otpExpiryDate(): Date {
  return new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);
}

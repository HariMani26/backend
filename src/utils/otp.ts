import crypto from 'crypto';

import { OTP_EXPIRY_MINUTES, OTP_LENGTH } from '@config';

const otpLength = Number(OTP_LENGTH) || 6;
const otpExpiryMinutes = Number(OTP_EXPIRY_MINUTES) || 5;

/** Cryptographically-random numeric OTP, zero-padded to OTP_LENGTH digits. */
export function generateOtpCode(): string {
  const max = 10 ** otpLength;
  const value = crypto.randomInt(0, max);
  return value.toString().padStart(otpLength, '0');
}

export function otpExpiryDate(): Date {
  return new Date(Date.now() + otpExpiryMinutes * 60 * 1000);
}

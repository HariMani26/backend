import { env } from '@config/env';
import { generateOtpCode, otpExpiryDate } from '@utils/otp';

describe('generateOtpCode', () => {
  it('produces a zero-padded numeric code of the configured length', () => {
    for (let i = 0; i < 20; i += 1) {
      const code = generateOtpCode();
      expect(code).toHaveLength(env.OTP_LENGTH);
      expect(code).toMatch(/^\d+$/);
    }
  });
});

describe('otpExpiryDate', () => {
  it('returns a date OTP_EXPIRY_MINUTES in the future', () => {
    const before = Date.now();
    const expiry = otpExpiryDate().getTime();
    const after = Date.now();

    const expectedMin = before + env.OTP_EXPIRY_MINUTES * 60 * 1000;
    const expectedMax = after + env.OTP_EXPIRY_MINUTES * 60 * 1000;

    expect(expiry).toBeGreaterThanOrEqual(expectedMin);
    expect(expiry).toBeLessThanOrEqual(expectedMax);
  });
});

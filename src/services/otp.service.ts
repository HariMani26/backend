import { env, isOtpBypassActive } from '@config/env';
import { logger } from '@config/logger';
import { OtpPurpose } from '@models/Otp.model';
import { otpRepository } from '@repositories/otp.repository';
import { smsService } from '@services/sms.service';
import { ApiError } from '@utils/ApiError';
import { generateOtpCode, otpExpiryDate } from '@utils/otp';
import { compareSecret, hashSecret } from '@utils/password';

const OTP_MESSAGE_TEMPLATE = (code: string): string =>
  `${code} is your WeOur Matrimony verification code. Valid for ${env.OTP_EXPIRY_MINUTES} minutes. Do not share this with anyone.`;

/** True only for the configured test number, and only outside production — see isOtpBypassActive. */
function isBypassMobile(mobile: string): boolean {
  return isOtpBypassActive && mobile === env.OTP_BYPASS_NUMBER;
}

export const otpService = {
  async sendOtp(mobile: string, purpose: OtpPurpose): Promise<void> {
    const mostRecent = await otpRepository.findMostRecent(mobile, purpose);
    if (mostRecent) {
      const secondsSinceLastSend = (Date.now() - mostRecent.createdAt.getTime()) / 1000;
      if (secondsSinceLastSend < env.OTP_RESEND_SECONDS) {
        const waitSeconds = Math.ceil(env.OTP_RESEND_SECONDS - secondsSinceLastSend);
        throw ApiError.badRequest(`Please wait ${waitSeconds}s before requesting another OTP`);
      }
    }

    const bypass = isBypassMobile(mobile);
    const code = bypass ? env.OTP_BYPASS_CODE : generateOtpCode();
    const codeHash = await hashSecret(code);

    await otpRepository.create({
      mobile,
      purpose,
      codeHash,
      expiresAt: otpExpiryDate(),
      maxAttempts: env.OTP_MAX_ATTEMPTS,
    });

    if (bypass) {
      logger.warn(`[OTP bypass] test number ${mobile} — skipping SMS delivery`);
      return;
    }

    await smsService.sendOtp(mobile, OTP_MESSAGE_TEMPLATE(code));
  },

  async verifyOtp(mobile: string, purpose: OtpPurpose, code: string): Promise<void> {
    const otp = await otpRepository.findLatestActive(mobile, purpose);
    if (!otp) {
      throw ApiError.badRequest('OTP has expired or was not requested. Please request a new one.');
    }

    if (otp.attempts >= otp.maxAttempts) {
      throw ApiError.badRequest('Too many incorrect attempts. Please request a new OTP.');
    }

    const isMatch = await compareSecret(code, otp.codeHash);
    if (!isMatch) {
      await otpRepository.incrementAttempts(String(otp._id));
      throw ApiError.badRequest('Incorrect OTP');
    }

    await otpRepository.markConsumed(String(otp._id));

    if (isBypassMobile(mobile)) {
      logger.warn(`[OTP bypass] test number ${mobile} — verified without MSG91`);
    }
  },
};

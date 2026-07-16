import { logger } from "@/utils/logger";
import {
  OTP_BYPASS_CODE,
  OTP_BYPASS_ENABLED,
  OTP_BYPASS_NUMBER,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_SECONDS,
} from "@config";

import { OtpModel, OtpPurpose } from "@models/Otp.model";
import { smsService } from "@services/sms.service";
import { ApiError } from "@utils/ApiError";
import { generateOtpCode, otpExpiryDate } from "@utils/otp";
import { compareSecret, hashSecret } from "@utils/password";

const maxAttempts = Number(OTP_MAX_ATTEMPTS) || 5;
const resendSeconds = Number(OTP_RESEND_SECONDS) || 30;
const bypassEnabled = OTP_BYPASS_ENABLED === "true";

const otpMessage = (code: string): string =>
  `${code} is your WeOur Matrimony verification code. Do not share this with anyone.`;

/** True only for the configured test number, and only when OTP_BYPASS_ENABLED=true. */
function isBypassMobile(mobile: string): boolean {
  return (
    bypassEnabled && Boolean(OTP_BYPASS_NUMBER) && mobile === OTP_BYPASS_NUMBER
  );
}

export const otpService = {
  async sendOtp(mobile: string, purpose: OtpPurpose): Promise<void> {
    const mostRecent = await OtpModel.findOne({ mobile, purpose }).sort({
      createdAt: -1,
    });
    if (mostRecent) {
      const secondsSinceLastSend =
        (Date.now() - mostRecent.createdAt.getTime()) / 1000;
      if (secondsSinceLastSend < resendSeconds) {
        const waitSeconds = Math.ceil(resendSeconds - secondsSinceLastSend);
        throw ApiError.badRequest(
          `Please wait ${waitSeconds}s before requesting another OTP`,
        );
      }
    }

    const bypass = isBypassMobile(mobile);
    const code = bypass ? OTP_BYPASS_CODE : generateOtpCode();
    const codeHash = await hashSecret(code);

    await OtpModel.create({
      mobile,
      purpose,
      codeHash,
      expiresAt: otpExpiryDate(),
      maxAttempts,
    });

    if (bypass) {
      logger.warn(`[OTP bypass] test number ${mobile} — skipping SMS delivery`);
      return;
    }

    await smsService.sendOtp(mobile, otpMessage(code));
  },

  async verifyOtp(
    mobile: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<void> {
    const otp = await OtpModel.findOne({
      mobile,
      purpose,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otp) {
      throw ApiError.badRequest(
        "OTP has expired or was not requested. Please request a new one.",
      );
    }

    if (otp.attempts >= otp.maxAttempts) {
      throw ApiError.badRequest(
        "Too many incorrect attempts. Please request a new OTP.",
      );
    }

    const isMatch = await compareSecret(code, otp.codeHash);
    if (!isMatch) {
      await OtpModel.findByIdAndUpdate(otp._id, { $inc: { attempts: 1 } });
      throw ApiError.badRequest("Incorrect OTP");
    }

    await OtpModel.findByIdAndUpdate(otp._id, {
      $set: { consumedAt: new Date() },
    });

    if (isBypassMobile(mobile)) {
      logger.warn(
        `[OTP bypass] test number ${mobile} — verified without SMS provider`,
      );
    }
  },
};

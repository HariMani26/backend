import { OtpModel, OtpPurpose } from '@models/Otp.model';

export const otpRepository = {
  create(input: { mobile: string; purpose: OtpPurpose; codeHash: string; expiresAt: Date; maxAttempts: number }) {
    return OtpModel.create(input);
  },

  findLatestActive(mobile: string, purpose: OtpPurpose) {
    return OtpModel.findOne({ mobile, purpose, consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({
      createdAt: -1,
    });
  },

  findMostRecent(mobile: string, purpose: OtpPurpose) {
    return OtpModel.findOne({ mobile, purpose }).sort({ createdAt: -1 });
  },

  incrementAttempts(id: string) {
    return OtpModel.findByIdAndUpdate(id, { $inc: { attempts: 1 } }, { new: true });
  },

  markConsumed(id: string) {
    return OtpModel.findByIdAndUpdate(id, { $set: { consumedAt: new Date() } }, { new: true });
  },
};

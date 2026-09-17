import { startSession } from 'mongoose';
import { AccountPreferences, MarriageReport } from '@dto/account.dto';
import { ProfileModel } from '@models/Profile.model';
import { UserModel, NOT_DELETED } from '@models/User.model';
import { ApiError } from '@utils/ApiError';
import { compareSecret, hashSecret } from '@utils/password';
import { authService } from './auth.service';
import { otpService } from './otp.service';
import { tokenService } from './token.service';

export const defaultPreferences: AccountPreferences = { showPhoto: true, showContact: false, emailNotifications: true };

export class AccountService {
  async preferences(userId: string): Promise<AccountPreferences> {
    const user = await authService.getCurrentUser(userId);
    return { ...defaultPreferences, ...user.preferences };
  }

  async savePreferences(userId: string, preferences: AccountPreferences): Promise<AccountPreferences> {
    const user = await UserModel.findOneAndUpdate(
      { _id: userId, isActive: true, ...NOT_DELETED }, { $set: { preferences } }, { new: true },
    );
    if (!user) throw ApiError.unauthorized('Account not found or inactive');
    return { ...defaultPreferences, ...user.preferences };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await UserModel.findOne({ _id: userId, isActive: true, ...NOT_DELETED }).select('+passwordHash');
    if (!user?.passwordHash) throw ApiError.badRequest('Password sign-in is not enabled for this account. Continue using phone OTP.');
    if (!await compareSecret(currentPassword, user.passwordHash)) throw ApiError.badRequest('Current password is incorrect');
    user.passwordHash = await hashSecret(newPassword);
    await user.save();
    await tokenService.revokeAllForUser(userId);
  }

  async reportMarriage(userId: string, report: MarriageReport): Promise<void> {
    const { partnerReferenceId, ...details } = report;
    const partner = partnerReferenceId ? await ProfileModel.findOne({
      referenceId: partnerReferenceId, userId: { $ne: userId }, ...NOT_DELETED,
    }) : null;
    if (partnerReferenceId && !partner) throw ApiError.badRequest('Partner reference ID was not found');
    const profile = await ProfileModel.findOneAndUpdate({ userId, ...NOT_DELETED }, { $set: {
      marriageStatus: {
        ...details, isMarried: true, partnerProfileId: partner?._id,
        storyStatus: details.consentForTestimonial ? 'user-submitted' : 'none',
      },
    } });
    if (!profile) throw ApiError.notFound('Complete registration before reporting your marriage');
  }

  async requestDeletion(userId: string): Promise<void> {
    const user = await authService.getCurrentUser(userId);
    await otpService.sendOtp(user.mobile, 'delete-account');
  }

  async deleteAccount(userId: string, code: string): Promise<void> {
    const user = await authService.getCurrentUser(userId);
    await otpService.verifyOtp(user.mobile, 'delete-account', code);
    const session = await startSession();
    try {
      await session.withTransaction(async () => {
        await ProfileModel.updateMany({ userId }, { $set: { isDeleted: true, deletedAt: new Date(), 'marriageStatus.consentForTestimonial': false, 'marriageStatus.consentForPhotos': false } }, { session });
        await UserModel.updateOne({ _id: userId }, { $set: { isDeleted: true, isActive: false, deletedAt: new Date() } }, { session });
      });
    } finally { await session.endSession(); }
    await tokenService.revokeAllForUser(userId);
  }
}

export const accountService = new AccountService();
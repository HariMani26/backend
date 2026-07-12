import { Types } from 'mongoose';

import { IUser, NOT_DELETED, UserModel } from '@models/User.model';

export type CreateUserInput = Pick<IUser, 'mobile' | 'countryCode'> & Partial<IUser>;

export const userRepository = {
  findById(id: string) {
    return UserModel.findOne({ _id: id, ...NOT_DELETED });
  },

  findByIdWithSecret(id: string) {
    return UserModel.findOne({ _id: id, ...NOT_DELETED }).select('+passwordHash');
  },

  findByMobile(mobile: string) {
    return UserModel.findOne({ mobile, ...NOT_DELETED });
  },

  findByEmail(email: string) {
    return UserModel.findOne({ email: email.toLowerCase(), ...NOT_DELETED });
  },

  findByEmailWithSecret(email: string) {
    return UserModel.findOne({ email: email.toLowerCase(), ...NOT_DELETED }).select('+passwordHash');
  },

  findByResetTokenHash(resetPasswordTokenHash: string) {
    return UserModel.findOne({
      resetPasswordTokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
      ...NOT_DELETED,
    }).select('+passwordHash +resetPasswordTokenHash +resetPasswordExpiresAt');
  },

  setResetPasswordToken(id: string | Types.ObjectId, resetPasswordTokenHash: string, resetPasswordExpiresAt: Date) {
    return UserModel.findOneAndUpdate({ _id: id, ...NOT_DELETED }, { $set: { resetPasswordTokenHash, resetPasswordExpiresAt } });
  },

  async clearResetPasswordToken(id: string | Types.ObjectId) {
    await UserModel.updateOne({ _id: id }, { $unset: { resetPasswordTokenHash: '', resetPasswordExpiresAt: '' } });
  },

  setPassword(id: string | Types.ObjectId, passwordHash: string) {
    return UserModel.findOneAndUpdate({ _id: id, ...NOT_DELETED }, { $set: { passwordHash } }, { new: true });
  },

  findByGoogleId(googleId: string) {
    return UserModel.findOne({ googleId, ...NOT_DELETED });
  },

  findByAppleId(appleId: string) {
    return UserModel.findOne({ appleId, ...NOT_DELETED });
  },

  create(input: CreateUserInput) {
    return UserModel.create(input);
  },

  async updateById(id: string | Types.ObjectId, patch: Partial<IUser>) {
    return UserModel.findOneAndUpdate({ _id: id, ...NOT_DELETED }, { $set: patch }, { new: true });
  },

  markPhoneVerified(id: string | Types.ObjectId) {
    return UserModel.findOneAndUpdate(
      { _id: id, ...NOT_DELETED },
      { $set: { isPhoneVerified: true, lastLoginAt: new Date() } },
      { new: true },
    );
  },
};
